<?php
/**
 * Enqueue the production React SPA from assets/app.
 *
 * @package VibeMartTheme
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
	exit;
}

const VIBE_MART_APP_HANDLE = 'vibe-mart-app';
const VIBE_MART_FONTS_HANDLE = 'vibe-mart-fonts';

/**
 * @return array{js:string,css:string[]}|null
 */
function vibe_mart_theme_manifest(): ?array {
	static $manifest = null;
	static $loaded = false;

	if ($loaded) {
		return $manifest;
	}

	$loaded = true;
	$path   = VIBE_MART_THEME_DIR . '/assets/app/asset-manifest.json';

	if (! is_readable($path)) {
		return null;
	}

	$decoded = json_decode((string) file_get_contents($path), true); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if (! is_array($decoded) || empty($decoded['js'])) {
		return null;
	}

	$manifest = array(
		'js'  => (string) $decoded['js'],
		'css' => array_values(array_filter(array_map('strval', (array) ($decoded['css'] ?? array())))),
	);

	return $manifest;
}

add_action(
	'wp_enqueue_scripts',
	static function (): void {
		$manifest = vibe_mart_theme_manifest();
		if (null === $manifest) {
			return;
		}

		$base = trailingslashit(VIBE_MART_THEME_URI) . 'assets/app/';

		wp_register_style(
			VIBE_MART_FONTS_HANDLE,
			'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Bangers&family=Oswald:wght@200..700&family=Montserrat+Alternates:wght@400;600;700&display=swap',
			array(),
			null
		);

		$style_deps = array(VIBE_MART_FONTS_HANDLE);
		foreach ($manifest['css'] as $index => $css_file) {
			$handle = 0 === $index ? VIBE_MART_APP_HANDLE : VIBE_MART_APP_HANDLE . '-' . $index;
			wp_enqueue_style($handle, $base . $css_file, $style_deps, null);
		}

		wp_enqueue_script(VIBE_MART_APP_HANDLE, $base . $manifest['js'], array(), null, true);

		$home_path = wp_parse_url(home_url('/'), PHP_URL_PATH);
		$basename  = is_string($home_path) ? untrailingslashit($home_path) : '';
		$basename  = '' === $basename ? '/' : $basename . '/';

		$config = array(
			'siteName'       => get_bloginfo('name'),
			'basename'       => $basename,
			'restBase'       => esc_url_raw(rest_url('vibe-mart/v1')),
			'removeBgUrl'    => esc_url_raw(rest_url('vibe-mart/v1/remove-background')),
			'nonce'          => wp_create_nonce('wp_rest'),
			'maxUploadBytes' => function_exists('VibeMart\\Plugin\\get_max_upload_bytes')
				? (int) \VibeMart\Plugin\get_max_upload_bytes()
				: 10 * MB_IN_BYTES,
			'version'        => VIBE_MART_THEME_VERSION,
		);

		/**
		 * Filters the runtime config localized into the React SPA.
		 *
		 * @param array<string,mixed> $config Config object.
		 */
		$config = apply_filters('vibe_mart_runtime_config', $config);

		wp_localize_script(VIBE_MART_APP_HANDLE, 'vibeMartConfig', $config);
	}
);

add_filter(
	'script_loader_tag',
	static function (string $tag, string $handle, string $src = ''): string {
		unset($src);
		if (VIBE_MART_APP_HANDLE !== $handle || false !== strpos($tag, 'type="module"')) {
			return $tag;
		}
		return preg_replace('/<script\b/', '<script type="module"', $tag, 1) ?: $tag;
	},
	10,
	3
);
