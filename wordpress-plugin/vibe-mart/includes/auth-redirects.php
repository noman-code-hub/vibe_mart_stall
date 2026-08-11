<?php
/**
 * Redirect default WordPress login/register screens to the custom React routes.
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Front-end login URL (React route).
 */
function custom_login_url(string $redirect_to = ''): string {
	$url = home_url('/login');
	if ('' !== $redirect_to) {
		$url = add_query_arg('redirect_to', rawurlencode($redirect_to), $url);
	}
	return $url;
}

/**
 * Front-end register URL (React route).
 */
function custom_register_url(): string {
	return home_url('/register');
}

add_filter(
	'login_url',
	static function (string $login_url, string $redirect = '', string $force_reauth = ''): string {
		unset($login_url, $force_reauth);
		return custom_login_url($redirect);
	},
	10,
	3
);

add_filter(
	'register_url',
	static function (): string {
		return custom_register_url();
	}
);

add_filter(
	'logout_url',
	static function (string $logout_url, string $redirect = ''): string {
		// Keep WP logout endpoint for cookie clearing, then land on custom login.
		$target = '' !== $redirect ? $redirect : custom_login_url();
		return wp_nonce_url(
			add_query_arg(
				array(
					'action' => 'logout',
					'redirect_to' => $target,
				),
				site_url('wp-login.php', 'login')
			),
			'log-out'
		);
	},
	10,
	2
);

/**
 * Block the default wp-login.php UI (except logout / password-protected posts).
 * Site admins can still reach it when redirecting into wp-admin, or via ?vibe_mart_wp_login=1.
 */
add_action(
	'login_init',
	static function (): void {
		if (defined('REST_REQUEST') && REST_REQUEST) {
			return;
		}

		$action = isset($_REQUEST['action']) ? sanitize_key((string) wp_unslash($_REQUEST['action'])) : 'login';

		// Allow cookie logout and password-protected post form.
		if (in_array($action, array('logout', 'postpass', 'confirmaction'), true)) {
			return;
		}

		// Admins can still reach wp-login.php with ?vibe_mart_wp_login=1 for recovery.
		if (isset($_GET['vibe_mart_wp_login']) && '1' === $_GET['vibe_mart_wp_login']) {
			return;
		}

		// Keep default WP login when the destination is wp-admin (site operators).
		if (isset($_REQUEST['redirect_to'])) {
			$redirect_to = (string) wp_unslash($_REQUEST['redirect_to']);
			if (false !== strpos($redirect_to, 'wp-admin')) {
				return;
			}
		}

		$redirect = custom_login_url();
		if (isset($_REQUEST['redirect_to'])) {
			$redirect = custom_login_url((string) wp_unslash($_REQUEST['redirect_to']));
		}

		wp_safe_redirect($redirect);
		exit;
	}
);

/**
 * Hide the admin bar for traders on the front end.
 */
add_filter(
	'show_admin_bar',
	static function (bool $show): bool {
		if (! is_user_logged_in()) {
			return $show;
		}
		$user = wp_get_current_user();
		if (in_array('vibe_trader', (array) $user->roles, true) && ! user_can($user, 'edit_posts')) {
			return false;
		}
		return $show;
	}
);
