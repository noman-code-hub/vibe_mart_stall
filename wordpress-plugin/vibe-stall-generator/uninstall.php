<?php
/**
 * Removes plugin options and temp files when the plugin is deleted.
 *
 * @package VibeStallGenerator
 */

declare( strict_types = 1 );

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'vibe_stall_api_key' );
delete_option( 'vibe_stall_max_upload_mb' );
delete_option( 'vibe_stall_rate_limit' );

$uploads = wp_upload_dir();

if ( empty( $uploads['error'] ) ) {
	$dir = trailingslashit( $uploads['basedir'] ) . 'vibe-stall-tmp/';

	if ( is_dir( $dir ) ) {
		foreach ( (array) glob( $dir . '*' ) as $file ) {
			if ( is_file( $file ) ) {
				wp_delete_file( $file );
			}
		}

		@rmdir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
	}
}
