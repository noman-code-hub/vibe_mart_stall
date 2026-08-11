<?php
/**
 * The [vibe_stall] shortcode.
 *
 * Output is intentionally just the mount container — the React bundle renders
 * everything inside it.
 *
 * @package VibeStallGenerator
 */

declare( strict_types = 1 );

namespace VibeStall;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders the React mount point and makes sure the bundle is queued.
 *
 * @return string Shortcode markup.
 */
function render_shortcode(): string {
	static $rendered = false;

	if ( ! assets_are_built() ) {
		return current_user_can( 'manage_options' )
			? '<p>' . esc_html__( 'Vibe Stall Generator: React assets are missing. Run "npm run build:wp" and upload assets/react/.', 'vibe-stall-generator' ) . '</p>'
			: '';
	}

	// Covers Elementor, block templates, and widgets, where the shortcode is not
	// found in post_content during wp_enqueue_scripts.
	enqueue_assets();

	// React mounts a single root; a second container on the same page would stay
	// empty and confuse editors.
	if ( $rendered ) {
		return '';
	}

	$rendered = true;

	ob_start();
	require VIBE_STALL_DIR . 'templates/stall-root.php';

	return (string) ob_get_clean();
}

/**
 * Registers the shortcode.
 */
function register_shortcode(): void {
	add_shortcode( SHORTCODE, __NAMESPACE__ . '\render_shortcode' );
}
add_action( 'init', __NAMESPACE__ . '\register_shortcode' );
