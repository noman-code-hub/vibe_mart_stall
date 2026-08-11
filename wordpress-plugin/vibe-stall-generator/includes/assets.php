<?php
/**
 * Registers and conditionally enqueues the compiled React bundle.
 *
 * Filenames are content-hashed by Vite, so assets are served without a version
 * query string and can be cached indefinitely by browsers and CDNs.
 *
 * @package VibeStallGenerator
 */

declare( strict_types = 1 );

namespace VibeStall;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const HANDLE_APP   = 'vibe-stall-app';
const HANDLE_FONTS = 'vibe-stall-fonts';

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Architects+Daughter&family=Bangers&family=Montserrat+Alternates:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Oswald:wght@200..700&display=swap';

/**
 * Reads assets/react/asset-manifest.json produced by "npm run build:wp".
 *
 * @return array{js:string,css:string[]}|null Null when the build is missing.
 */
function get_asset_manifest(): ?array {
	static $manifest = null;
	static $loaded   = false;

	if ( $loaded ) {
		return $manifest;
	}

	$loaded = true;
	$path   = VIBE_STALL_DIR . 'assets/react/asset-manifest.json';

	if ( ! is_readable( $path ) ) {
		return null;
	}

	$decoded = json_decode( (string) file_get_contents( $path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

	if ( ! is_array( $decoded ) || empty( $decoded['js'] ) ) {
		return null;
	}

	$manifest = array(
		'js'  => (string) $decoded['js'],
		'css' => array_values( array_filter( array_map( 'strval', (array) ( $decoded['css'] ?? array() ) ) ) ),
	);

	return $manifest;
}

/**
 * True when a usable production build is present in the plugin.
 */
function assets_are_built(): bool {
	$manifest = get_asset_manifest();

	return null !== $manifest && file_exists( VIBE_STALL_DIR . 'assets/react/' . $manifest['js'] );
}

/**
 * Registers handles without printing them. Nothing is loaded on pages that do
 * not use the shortcode.
 */
function register_assets(): void {
	$manifest = get_asset_manifest();

	if ( null === $manifest ) {
		return;
	}

	$base = VIBE_STALL_URL . 'assets/react/';

	wp_register_style( HANDLE_FONTS, FONTS_URL, array(), null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion

	$style_deps = array( HANDLE_FONTS );

	foreach ( $manifest['css'] as $index => $css_file ) {
		$handle = 0 === $index ? HANDLE_APP : HANDLE_APP . '-' . $index;
		wp_register_style( $handle, $base . $css_file, $style_deps, null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
	}

	wp_register_script( HANDLE_APP, $base . $manifest['js'], array(), null, true ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion

	wp_localize_script( HANDLE_APP, 'vibeStallGenerator', get_runtime_config() );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\register_assets', 5 );

/**
 * Data handed to the bundle before it boots.
 *
 * Contains no secrets: only the REST URL, a REST nonce, and the upload ceiling.
 *
 * @return array<string,mixed>
 */
function get_runtime_config(): array {
	return array(
		'restUrl'        => esc_url_raw( rest_url( REST_NAMESPACE . REST_ROUTE ) ),
		'nonce'          => wp_create_nonce( 'wp_rest' ),
		'maxUploadBytes' => get_max_upload_bytes(),
		'version'        => VERSION,
	);
}

/**
 * Enqueues the bundle. Safe to call repeatedly — WordPress de-duplicates.
 */
function enqueue_assets(): void {
	$manifest = get_asset_manifest();

	if ( null === $manifest ) {
		return;
	}

	foreach ( array_keys( $manifest['css'] ) as $index ) {
		wp_enqueue_style( 0 === $index ? HANDLE_APP : HANDLE_APP . '-' . $index );
	}

	wp_enqueue_script( HANDLE_APP );
}

/**
 * Enqueues early when the shortcode is in the post content, so stylesheets land
 * in <head> instead of the footer. Page builders are covered by the fallback
 * inside the shortcode callback.
 */
function maybe_enqueue_for_singular(): void {
	if ( ! is_singular() ) {
		return;
	}

	$post = get_post();

	if ( $post instanceof \WP_Post && has_shortcode( (string) $post->post_content, SHORTCODE ) ) {
		enqueue_assets();
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\maybe_enqueue_for_singular', 20 );

/**
 * Vite emits ES modules, which need type="module" on the script tag.
 *
 * @param string $tag    Full script tag.
 * @param string $handle Script handle.
 * @param string $src    Script source URL.
 */
function add_module_type( string $tag, string $handle, string $src = '' ): string {
	unset( $src );

	if ( HANDLE_APP !== $handle ) {
		return $tag;
	}

	if ( false !== strpos( $tag, 'type="module"' ) ) {
		return $tag;
	}

	return preg_replace( '/<script\b/', '<script type="module"', $tag, 1 ) ?: $tag;
}
add_filter( 'script_loader_tag', __NAMESPACE__ . '\add_module_type', 10, 3 );

/**
 * Speeds up webfont delivery when the stall is on the page.
 *
 * @param string[] $urls          URLs for the hint.
 * @param string   $relation_type Hint type.
 *
 * @return string[]
 */
function add_font_resource_hints( array $urls, string $relation_type ): array {
	if ( 'preconnect' !== $relation_type || ! wp_style_is( HANDLE_FONTS, 'enqueued' ) ) {
		return $urls;
	}

	$urls[] = array( 'href' => 'https://fonts.googleapis.com' );
	$urls[] = array(
		'href'        => 'https://fonts.gstatic.com',
		'crossorigin' => 'anonymous',
	);

	return $urls;
}
add_filter( 'wp_resource_hints', __NAMESPACE__ . '\add_font_resource_hints', 10, 2 );
