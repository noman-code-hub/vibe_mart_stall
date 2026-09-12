<?php
/**
 * Plugin Name:       Vibe Mart Marketplace
 * Plugin URI:        https://github.com/noman-code-hub/vibe_mart_stall
 * Description:       Marketplace backend for Vibe Mart — auth, stalls, products, media uploads, and remove.bg proxy. Frontend is the custom Vibe Mart theme.
 * Version:           1.7.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            Vibe Mart
 * Text Domain:       vibe-mart
 * License:           GPL-2.0-or-later
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

if (! defined('ABSPATH')) {
	exit;
}

const VERSION = '1.7.0';
const REST_NAMESPACE = 'vibe-mart/v1';

define('VIBE_MART_PLUGIN_FILE', __FILE__);
define('VIBE_MART_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VIBE_MART_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once VIBE_MART_PLUGIN_DIR . 'includes/settings.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/database.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/pitch-numbers.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/admin.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/rest-auth.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/auth-redirects.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/rest-stalls.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/rest-remove-bg.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/rest-uploads.php';
require_once VIBE_MART_PLUGIN_DIR . 'includes/rest-contact.php';

/**
 * Activation: tables + trader role + cron.
 */
function activate(): void {
	create_tables();
	ensure_trader_role();
	temp_dir();
	if (! wp_next_scheduled('vibe_mart_cleanup_temp')) {
		wp_schedule_event(time() + HOUR_IN_SECONDS, 'hourly', 'vibe_mart_cleanup_temp');
	}
}

/**
 * Deactivation: clear cron only.
 */
function deactivate(): void {
	$timestamp = wp_next_scheduled('vibe_mart_cleanup_temp');
	if ($timestamp) {
		wp_unschedule_event($timestamp, 'vibe_mart_cleanup_temp');
	}
}

register_activation_hook(__FILE__, __NAMESPACE__ . '\\activate');
register_deactivation_hook(__FILE__, __NAMESPACE__ . '\\deactivate');

add_action('vibe_mart_cleanup_temp', __NAMESPACE__ . '\\cleanup_temp_files');

/**
 * Keep every Vibe Mart REST response out of page / edge caches.
 *
 * Host-level caches (LiteSpeed, Hostinger, Cloudflare) happily store REST GETs.
 * A cached "you own no stalls" reply is indistinguishable from the real thing,
 * so the folder stays empty forever while writes keep succeeding.
 */
function send_rest_nocache_headers($served, $result, $request) {
	if (! $request instanceof \WP_REST_Request) {
		return $served;
	}
	if (0 !== strpos(ltrim((string) $request->get_route(), '/'), REST_NAMESPACE)) {
		return $served;
	}

	if (! defined('DONOTCACHEPAGE')) {
		define('DONOTCACHEPAGE', true);
	}

	if (! headers_sent()) {
		header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
		header('Pragma: no-cache');
		header('Expires: Wed, 11 Jan 1984 05:00:00 GMT');
		header('X-LiteSpeed-Cache-Control: no-cache');
	}

	return $served;
}

add_filter('rest_pre_serve_request', __NAMESPACE__ . '\\send_rest_nocache_headers', 10, 3);

/**
 * Protected temp upload directory.
 */
function temp_dir(): string {
	$uploads = wp_upload_dir();
	if (! empty($uploads['error'])) {
		return '';
	}

	$dir = trailingslashit($uploads['basedir']) . 'vibe-mart-tmp/';
	if (! is_dir($dir) && ! wp_mkdir_p($dir)) {
		return '';
	}

	if (! file_exists($dir . 'index.php')) {
		file_put_contents($dir . 'index.php', "<?php\n// Silence is golden.\n"); // phpcs:ignore
	}

	if (! file_exists($dir . '.htaccess')) {
		$htaccess  = "Order deny,allow\nDeny from all\n";
		$htaccess .= "<IfModule mod_authz_core.c>\n\tRequire all denied\n</IfModule>\n";
		file_put_contents($dir . '.htaccess', $htaccess); // phpcs:ignore
	}

	return $dir;
}

function cleanup_temp_files(): void {
	$dir = temp_dir();
	if ('' === $dir) {
		return;
	}
	$cutoff = time() - HOUR_IN_SECONDS;
	foreach ((array) glob($dir . 'vibe-mart-*') as $file) {
		if (is_file($file) && filemtime($file) < $cutoff) {
			wp_delete_file($file);
		}
	}
}
