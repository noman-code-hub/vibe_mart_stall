<?php
/**
 * Auth REST: register, login, logout, session, profile.
 * Users live in wp_users; trader fields in wp_usermeta.
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

if (! defined('ABSPATH')) {
	exit;
}

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			REST_NAMESPACE,
			'/auth/register',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => __NAMESPACE__ . '\\auth_register',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			REST_NAMESPACE,
			'/auth/login',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => __NAMESPACE__ . '\\auth_login',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			REST_NAMESPACE,
			'/auth/logout',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => __NAMESPACE__ . '\\auth_logout',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			REST_NAMESPACE,
			'/auth/session',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => __NAMESPACE__ . '\\auth_session',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			REST_NAMESPACE,
			'/auth/profile',
			array(
				array(
					'methods' => WP_REST_Server::READABLE,
					'callback' => __NAMESPACE__ . '\\auth_profile',
					'permission_callback' => __NAMESPACE__ . '\\require_logged_in',
				),
				array(
					'methods' => WP_REST_Server::EDITABLE,
					'callback' => __NAMESPACE__ . '\\auth_update_profile',
					'permission_callback' => __NAMESPACE__ . '\\require_logged_in',
				),
			)
		);
		register_rest_route(
			REST_NAMESPACE,
			'/auth/forgot-password',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => __NAMESPACE__ . '\\auth_forgot_password',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			REST_NAMESPACE,
			'/auth/reset-password',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => __NAMESPACE__ . '\\auth_reset_password',
				'permission_callback' => '__return_true',
			)
		);
	}
);

function require_logged_in(): bool|WP_Error {
	if (is_user_logged_in()) {
		return true;
	}
	return new WP_Error('vibe_mart_unauthorized', __('Please log in.', 'vibe-mart'), array('status' => 401));
}

/**
 * Ensure the custom trader role exists.
 */
function ensure_trader_role(): void {
	if (get_role('vibe_trader')) {
		return;
	}
	add_role(
		'vibe_trader',
		__('Trader', 'vibe-mart'),
		array(
			'read' => true,
		)
	);
}

/**
 * Build API user object including trader usermeta + fresh REST nonce.
 *
 * @return array<string, mixed>
 */
function user_payload(\WP_User $user): array {
	$payload = array(
		'id' => $user->ID,
		'username' => $user->user_login,
		'email' => $user->user_email,
		'display_name' => $user->display_name,
		'role' => in_array('vibe_trader', (array) $user->roles, true) ? 'trader' : ( $user->roles[0] ?? 'subscriber' ),
		'business_name' => (string) get_user_meta($user->ID, 'vm_business_name', true),
		'phone' => (string) get_user_meta($user->ID, 'vm_phone', true),
		'bio' => (string) get_user_meta($user->ID, 'vm_bio', true),
		'location' => (string) get_user_meta($user->ID, 'vm_location', true),
		'avatar_url' => (string) get_avatar_url(
			$user->ID,
			array(
				'size' => 128,
				'default' => 'mystery',
			)
		),
		'nonce' => wp_create_nonce('wp_rest'),
	);

	return $payload;
}

/**
 * Persist trader profile fields to usermeta.
 *
 * @param array<string, mixed> $fields Raw request fields.
 */
function save_trader_meta(int $user_id, array $fields): void {
	$map = array(
		'business_name' => 'vm_business_name',
		'phone' => 'vm_phone',
		'bio' => 'vm_bio',
		'location' => 'vm_location',
	);

	foreach ($map as $request_key => $meta_key) {
		if (! array_key_exists($request_key, $fields) || null === $fields[ $request_key ]) {
			continue;
		}
		$value = $fields[ $request_key ];
		if ('bio' === $request_key) {
			update_user_meta($user_id, $meta_key, sanitize_textarea_field((string) $value));
		} elseif ('phone' === $request_key) {
			update_user_meta($user_id, $meta_key, sanitize_text_field((string) $value));
		} else {
			update_user_meta($user_id, $meta_key, sanitize_text_field((string) $value));
		}
	}

	update_user_meta($user_id, 'vm_is_trader', '1');
}

/**
 * Session check for React boot — never 401s; cookies restore the session.
 */
function auth_session(): WP_REST_Response {
	if (! is_user_logged_in()) {
		return new WP_REST_Response(
			array(
				'authenticated' => false,
				'user' => null,
				'nonce' => wp_create_nonce('wp_rest'),
			),
			200
		);
	}

	$user = wp_get_current_user();
	$payload = user_payload($user);
	$nonce = $payload['nonce'];
	unset($payload['nonce']);

	return new WP_REST_Response(
		array(
			'authenticated' => true,
			'user' => $payload,
			'nonce' => $nonce,
		),
		200
	);
}

function auth_register(WP_REST_Request $request): WP_REST_Response|WP_Error {
	ensure_trader_role();

	$username = sanitize_user((string) $request->get_param('username'));
	$email = sanitize_email((string) $request->get_param('email'));
	$password = (string) $request->get_param('password');
	$display = sanitize_text_field((string) $request->get_param('display_name'));

	if ('' === $username) {
		return new WP_Error(
			'vibe_mart_invalid',
			__('Username is required.', 'vibe-mart'),
			array('status' => 400)
		);
	}
	if ('' === $email) {
		return new WP_Error(
			'vibe_mart_invalid',
			__('Email is required.', 'vibe-mart'),
			array('status' => 400)
		);
	}
	if (strlen($password) < 8) {
		return new WP_Error(
			'vibe_mart_invalid',
			__('Password must be at least 8 characters.', 'vibe-mart'),
			array('status' => 400)
		);
	}
	if (! is_email($email)) {
		return new WP_Error('vibe_mart_invalid_email', __('Enter a valid email.', 'vibe-mart'), array('status' => 400));
	}
	if (username_exists($username) || email_exists($email)) {
		return new WP_Error(
			'vibe_mart_exists',
			__('That username or email is already registered.', 'vibe-mart'),
			array('status' => 409)
		);
	}

	$user_id = wp_insert_user(
		array(
			'user_login' => $username,
			'user_email' => $email,
			'user_pass' => $password,
			'display_name' => $display ?: $username,
			'role' => 'vibe_trader',
		)
	);

	if (is_wp_error($user_id)) {
		return $user_id;
	}

	save_trader_meta(
		(int) $user_id,
		array(
			'business_name' => $request->get_param('business_name'),
			'phone' => $request->get_param('phone'),
			'bio' => $request->get_param('bio'),
			'location' => $request->get_param('location'),
		)
	);

	wp_set_current_user((int) $user_id);
	wp_set_auth_cookie((int) $user_id, true, is_ssl());

	$user = get_user_by('id', $user_id);
	if (! $user instanceof \WP_User) {
		return new WP_Error('vibe_mart_register_failed', __('Could not create account.', 'vibe-mart'), array('status' => 500));
	}

	return new WP_REST_Response(user_payload($user), 201);
}

function auth_login(WP_REST_Request $request): WP_REST_Response|WP_Error {
	$username = sanitize_text_field((string) $request->get_param('username'));
	$password = (string) $request->get_param('password');
	$remember = filter_var($request->get_param('remember'), FILTER_VALIDATE_BOOLEAN);

	if ('' === $username || '' === $password) {
		return new WP_Error(
			'vibe_mart_invalid',
			__('Enter your username and password.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	// Allow email as the login identifier.
	$login = $username;
	if (is_email($username)) {
		$by_email = get_user_by('email', $username);
		if ($by_email instanceof \WP_User) {
			$login = $by_email->user_login;
		}
	}

	$user = wp_signon(
		array(
			'user_login' => $login,
			'user_password' => $password,
			'remember' => false !== $remember,
		),
		is_ssl()
	);

	if (is_wp_error($user)) {
		return new WP_Error(
			'vibe_mart_login_failed',
			__('Invalid username or password.', 'vibe-mart'),
			array('status' => 403)
		);
	}

	wp_set_current_user($user->ID);
	return new WP_REST_Response(user_payload($user), 200);
}

function auth_logout(): WP_REST_Response {
	wp_logout();
	return new WP_REST_Response(
		array(
			'ok' => true,
			'nonce' => wp_create_nonce('wp_rest'),
		),
		200
	);
}

function auth_profile(): WP_REST_Response|WP_Error {
	$user = wp_get_current_user();
	if (! $user || ! $user->ID) {
		return new WP_Error('vibe_mart_unauthorized', __('Please log in.', 'vibe-mart'), array('status' => 401));
	}
	return new WP_REST_Response(user_payload($user), 200);
}

function auth_update_profile(WP_REST_Request $request): WP_REST_Response|WP_Error {
	$user = wp_get_current_user();
	if (! $user || ! $user->ID) {
		return new WP_Error('vibe_mart_unauthorized', __('Please log in.', 'vibe-mart'), array('status' => 401));
	}

	$update = array('ID' => $user->ID);
	$display = $request->get_param('display_name');
	$email = $request->get_param('email');

	if (null !== $display) {
		$update['display_name'] = sanitize_text_field((string) $display);
	}
	if (null !== $email) {
		$email = sanitize_email((string) $email);
		if (! is_email($email)) {
			return new WP_Error('vibe_mart_invalid_email', __('Enter a valid email.', 'vibe-mart'), array('status' => 400));
		}
		$existing = email_exists($email);
		if ($existing && (int) $existing !== (int) $user->ID) {
			return new WP_Error('vibe_mart_exists', __('That email is already in use.', 'vibe-mart'), array('status' => 409));
		}
		$update['user_email'] = $email;
	}

	$result = wp_update_user($update);
	if (is_wp_error($result)) {
		return $result;
	}

	save_trader_meta(
		(int) $user->ID,
		array(
			'business_name' => $request->get_param('business_name'),
			'phone' => $request->get_param('phone'),
			'bio' => $request->get_param('bio'),
			'location' => $request->get_param('location'),
		)
	);

	$fresh = get_user_by('id', $user->ID);
	if (! $fresh instanceof \WP_User) {
		return new WP_Error('vibe_mart_unauthorized', __('Please log in.', 'vibe-mart'), array('status' => 401));
	}

	return new WP_REST_Response(user_payload($fresh), 200);
}

/**
 * Request a password reset email. Always returns the same success message.
 */
function auth_forgot_password(WP_REST_Request $request): WP_REST_Response|WP_Error {
	$identifier = sanitize_text_field((string) ( $request->get_param('username') ?: $request->get_param('email') ));
	if ('' === $identifier) {
		return new WP_Error(
			'vibe_mart_invalid',
			__('Enter your username or email.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	$user = is_email($identifier) ? get_user_by('email', $identifier) : get_user_by('login', $identifier);
	if (! $user instanceof \WP_User && ! is_email($identifier)) {
		$user = get_user_by('email', $identifier);
	}

	if ($user instanceof \WP_User) {
		$key = get_password_reset_key($user);
		if (! is_wp_error($key)) {
			$reset_url = add_query_arg(
				array(
					'token' => $key,
					'login' => $user->user_login,
				),
				home_url('/reset-password')
			);
			$site_name = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
			$subject = sprintf(
				/* translators: %s site name */
				__('[%s] Reset your password', 'vibe-mart'),
				$site_name
			);
			$body = implode(
				"\n",
				array(
					sprintf(__('Hi %s,', 'vibe-mart'), $user->display_name ?: $user->user_login),
					'',
					__('You asked to reset your Vibe Mart password. Click the link below (expires in about 1 hour):', 'vibe-mart'),
					'',
					$reset_url,
					'',
					__('If you did not request this, you can ignore this email.', 'vibe-mart'),
				)
			);
			wp_mail($user->user_email, $subject, $body);
		}
	}

	return new WP_REST_Response(
		array(
			'ok' => true,
			'message' => __('If that account exists, we sent reset instructions.', 'vibe-mart'),
		),
		200
	);
}

/**
 * Set a new password from a reset token + login.
 */
function auth_reset_password(WP_REST_Request $request): WP_REST_Response|WP_Error {
	$login = sanitize_user((string) ( $request->get_param('login') ?: $request->get_param('username') ));
	$token = (string) $request->get_param('token');
	$password = (string) $request->get_param('password');

	if ('' === $login || '' === $token) {
		return new WP_Error(
			'vibe_mart_invalid',
			__('This reset link is invalid.', 'vibe-mart'),
			array('status' => 400)
		);
	}
	if (strlen($password) < 8) {
		return new WP_Error(
			'vibe_mart_invalid',
			__('Password must be at least 8 characters.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	$user = check_password_reset_key($token, $login);
	if (is_wp_error($user)) {
		return new WP_Error(
			'vibe_mart_reset_invalid',
			__('This reset link is invalid or has expired.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	reset_password($user, $password);

	return new WP_REST_Response(
		array(
			'ok' => true,
			'message' => __('Password updated. You can log in now.', 'vibe-mart'),
		),
		200
	);
}
