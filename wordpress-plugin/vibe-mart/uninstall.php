<?php
/**
 * Uninstall: drop options and custom tables.
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

if (! defined('WP_UNINSTALL_PLUGIN')) {
	exit;
}

delete_option('vibe_mart_api_key');
delete_option('vibe_mart_max_upload_mb');
delete_option('vibe_mart_rate_limit');
delete_option('vibe_mart_db_version');

global $wpdb;
foreach (array('vm_stalls', 'vm_products', 'vm_badges', 'vm_pitches') as $table) {
	$wpdb->query('DROP TABLE IF EXISTS ' . $wpdb->prefix . $table); // phpcs:ignore WordPress.DB.PreparedSQL
}

$uploads = wp_upload_dir();
if (empty($uploads['error'])) {
	$dir = trailingslashit($uploads['basedir']) . 'vibe-mart-tmp/';
	if (is_dir($dir)) {
		foreach ((array) glob($dir . '*') as $file) {
			if (is_file($file)) {
				wp_delete_file($file);
			}
		}
		@rmdir($dir); // phpcs:ignore
	}
}
