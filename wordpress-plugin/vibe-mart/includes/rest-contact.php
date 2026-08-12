<?php
/**
 * Public contact form REST endpoint.
 *
 * POST /wp-json/vibe-mart/v1/contact
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

const CONTACT_RATE_TRANSIENT_PREFIX = 'vibe_mart_contact_rate_';
const CONTACT_SUBMISSIONS_OPTION = 'vibe_mart_contact_submissions';

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			REST_NAMESPACE,
			'/contact',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => __NAMESPACE__ . '\\contact_submit',
				'permission_callback' => __NAMESPACE__ . '\\contact_permission',
			)
		);
	}
);

/**
 * Require REST nonce for CSRF protection (same as remove-background).
 */
function contact_permission(WP_REST_Request $request): bool|WP_Error {
	$nonce = (string) $request->get_header('X-WP-Nonce');
	if ('' === $nonce || ! wp_verify_nonce($nonce, 'wp_rest')) {
		return new WP_Error(
			'vibe_mart_rest_nonce',
			__('Invalid security token. Refresh the page and try again.', 'vibe-mart'),
			array('status' => 403)
		);
	}
	return true;
}

function contact_rate_key(): string {
	$ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash((string) $_SERVER['REMOTE_ADDR'])) : 'unknown';
	return CONTACT_RATE_TRANSIENT_PREFIX . md5($ip);
}

function within_contact_rate_limit(): bool {
	$limit = (int) apply_filters('vibe_mart_contact_rate_limit', 5);
	if ($limit <= 0) {
		return true;
	}
	return (int) get_transient(contact_rate_key()) < $limit;
}

function consume_contact_rate_limit(): void {
	$limit = (int) apply_filters('vibe_mart_contact_rate_limit', 5);
	if ($limit <= 0) {
		return;
	}
	$key = contact_rate_key();
	set_transient($key, (int) get_transient($key) + 1, HOUR_IN_SECONDS);
}

/**
 * @return string[]
 */
function contact_recipients(): array {
	$to = apply_filters('vibe_mart_contact_recipient', get_option('admin_email'));
	if (is_array($to)) {
		return array_values(array_filter(array_map('sanitize_email', $to)));
	}
	$email = sanitize_email((string) $to);
	return '' !== $email ? array($email) : array();
}

function contact_submit(WP_REST_Request $request): WP_REST_Response|WP_Error {
	if (! within_contact_rate_limit()) {
		return new WP_Error(
			'vibe_mart_contact_rate',
			__('Too many messages sent recently. Please try again later.', 'vibe-mart'),
			array('status' => 429)
		);
	}

	$params = $request->get_json_params();
	if (! is_array($params)) {
		$params = array();
	}

	// Honeypot — bots only.
	$honeypot = trim((string) ($params['website'] ?? ''));
	if ('' !== $honeypot) {
		return new WP_REST_Response(
			array(
				'ok'      => true,
				'message' => __('Thanks — your message was sent.', 'vibe-mart'),
			),
			200
		);
	}

	$name     = sanitize_text_field((string) ($params['name'] ?? ''));
	$email    = sanitize_email((string) ($params['email'] ?? ''));
	$phone    = sanitize_text_field((string) ($params['phone'] ?? ''));
	$message  = sanitize_textarea_field((string) ($params['message'] ?? ''));
	$comments = sanitize_textarea_field((string) ($params['comments'] ?? ''));

	if ('' === $name || '' === $email || ! is_email($email)) {
		return new WP_Error(
			'vibe_mart_contact_invalid',
			__('Enter your name and a valid email address.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	if ('' === $message && '' === $comments) {
		return new WP_Error(
			'vibe_mart_contact_invalid',
			__('Please write a message or comment.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	$recipients = contact_recipients();
	if (empty($recipients)) {
		return new WP_Error(
			'vibe_mart_contact_config',
			__('Contact form is not configured yet. Please contact the site administrator.', 'vibe-mart'),
			array('status' => 500)
		);
	}

	$site_name = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
	$subject   = sprintf(
		/* translators: %s: sender name */
		__('[%s] New contact message from %s', 'vibe-mart'),
		$site_name,
		$name
	);

	$body_lines = array(
		sprintf(__('Name: %s', 'vibe-mart'), $name),
		sprintf(__('Email: %s', 'vibe-mart'), $email),
	);
	if ('' !== $phone) {
		$body_lines[] = sprintf(__('Phone: %s', 'vibe-mart'), $phone);
	}
	if ('' !== $message) {
		$body_lines[] = '';
		$body_lines[] = __('Message:', 'vibe-mart');
		$body_lines[] = $message;
	}
	if ('' !== $comments) {
		$body_lines[] = '';
		$body_lines[] = __('Comments:', 'vibe-mart');
		$body_lines[] = $comments;
	}
	$body_lines[] = '';
	$body_lines[] = sprintf(__('Sent from: %s', 'vibe-mart'), home_url('/contact'));

	$headers = array(
		'Content-Type: text/plain; charset=UTF-8',
		sprintf('Reply-To: %s <%s>', $name, $email),
	);

	$sent = wp_mail($recipients, $subject, implode("\n", $body_lines), $headers);

	if (! $sent) {
		return new WP_Error(
			'vibe_mart_contact_mail',
			__('Could not send your message right now. Please try again later.', 'vibe-mart'),
			array('status' => 500)
		);
	}

	consume_contact_rate_limit();
	contact_store_submission(
		array(
			'name'     => $name,
			'email'    => $email,
			'phone'    => $phone,
			'message'  => $message,
			'comments' => $comments,
			'sent_at'  => gmdate('c'),
		)
	);

	return new WP_REST_Response(
		array(
			'ok'      => true,
			'message' => __('Thanks — your message was sent.', 'vibe-mart'),
		),
		200
	);
}

/**
 * Keep a short rolling log for WP admin (Settings → stored submissions).
 *
 * @param array<string,string> $entry Submission row.
 */
function contact_store_submission(array $entry): void {
	$max   = (int) apply_filters('vibe_mart_contact_log_limit', 50);
	$log   = get_option(CONTACT_SUBMISSIONS_OPTION, array());
	$log   = is_array($log) ? $log : array();
	$log[] = $entry;
	if (count($log) > $max) {
		$log = array_slice($log, -$max);
	}
	update_option(CONTACT_SUBMISSIONS_OPTION, $log, false);
}
