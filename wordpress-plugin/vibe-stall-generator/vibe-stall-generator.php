<?php
/**
 * Plugin Name:       Vibe Stall Generator
 * Plugin URI:        https://github.com/noman-code-hub/vibe_mart_stall
 * Description:       Embeds the Vibe Mart stall generator (React) anywhere with the [vibe_stall] shortcode, and removes image backgrounds through a server-side remove.bg proxy.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            Vibe Mart
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       vibe-stall-generator
 *
 * @package VibeStallGenerator
 */

declare( strict_types = 1 );

namespace VibeStall;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VERSION       = '1.0.0';
const REST_NAMESPACE = 'vibe-stall/v1';
const REST_ROUTE     = '/remove-background';
const SHORTCODE      = 'vibe_stall';
const OPTION_GROUP   = 'vibe_stall_settings';
const CRON_CLEANUP   = 'vibe_stall_cleanup_temp';

define( 'VIBE_STALL_FILE', __FILE__ );
define( 'VIBE_STALL_DIR', plugin_dir_path( __FILE__ ) );
define( 'VIBE_STALL_URL', plugin_dir_url( __FILE__ ) );

require_once VIBE_STALL_DIR . 'includes/settings.php';
require_once VIBE_STALL_DIR . 'includes/assets.php';
require_once VIBE_STALL_DIR . 'includes/shortcode.php';
require_once VIBE_STALL_DIR . 'includes/rest-api.php';

/**
 * Creates the protected temp directory used while proxying uploads.
 */
function activate(): void {
	temp_dir();

	if ( ! wp_next_scheduled( CRON_CLEANUP ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', CRON_CLEANUP );
	}
}

/**
 * Clears scheduled cleanup; settings are preserved for reactivation.
 */
function deactivate(): void {
	$timestamp = wp_next_scheduled( CRON_CLEANUP );

	if ( $timestamp ) {
		wp_unschedule_event( $timestamp, CRON_CLEANUP );
	}
}

register_activation_hook( __FILE__, __NAMESPACE__ . '\activate' );
register_deactivation_hook( __FILE__, __NAMESPACE__ . '\deactivate' );

/**
 * Absolute path to the plugin's private temp directory inside wp-content/uploads.
 *
 * The directory is created on demand and blocked from direct web access so
 * in-flight uploads are never publicly reachable.
 *
 * @return string Directory path with a trailing slash, or '' when unavailable.
 */
function temp_dir(): string {
	$uploads = wp_upload_dir();

	if ( ! empty( $uploads['error'] ) ) {
		return '';
	}

	$dir = trailingslashit( $uploads['basedir'] ) . 'vibe-stall-tmp/';

	if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
		return '';
	}

	if ( ! file_exists( $dir . 'index.php' ) ) {
		file_put_contents( $dir . 'index.php', "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
	}

	if ( ! file_exists( $dir . '.htaccess' ) ) {
		$htaccess  = "# Apache 2.2\n";
		$htaccess .= "Order deny,allow\n";
		$htaccess .= "Deny from all\n\n";
		$htaccess .= "# Apache 2.4+\n";
		$htaccess .= "<IfModule mod_authz_core.c>\n";
		$htaccess .= "\tRequire all denied\n";
		$htaccess .= "</IfModule>\n";
		file_put_contents( $dir . '.htaccess', $htaccess ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
	}

	return $dir;
}

/**
 * Deletes temp files older than one hour.
 */
function cleanup_temp_files(): void {
	$dir = temp_dir();

	if ( '' === $dir ) {
		return;
	}

	$files  = glob( $dir . 'vibe-stall-*' );
	$cutoff = time() - HOUR_IN_SECONDS;

	foreach ( (array) $files as $file ) {
		if ( is_file( $file ) && filemtime( $file ) < $cutoff ) {
			wp_delete_file( $file );
		}
	}
}

add_action( CRON_CLEANUP, __NAMESPACE__ . '\cleanup_temp_files' );
