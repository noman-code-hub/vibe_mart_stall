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
			'isWordPress'    => true,
			'version'        => VIBE_MART_THEME_VERSION,
		);

		/**
		 * Filters the runtime config localized into the React SPA.
		 *
		 * @param array<string,mixed> $config Config object.
		 */
		$config = apply_filters('vibe_mart_runtime_config', $config);

		/*
		 * wp_localize_script() flattens every value to a string, which would turn
		 * isWordPress into "1" and maxUploadBytes into text. A JSON blob keeps the
		 * booleans and numbers intact for the React runtime config.
		 */
		wp_add_inline_script(
			VIBE_MART_APP_HANDLE,
			'window.vibeMartConfig = ' . wp_json_encode($config) . ';',
			'before'
		);
	}
);

/**
 * True for the theme's own script/style handles, including extra CSS chunks.
 */
function vibe_mart_theme_owns_handle(string $handle): bool {
	return VIBE_MART_APP_HANDLE === $handle
		|| VIBE_MART_FONTS_HANDLE === $handle
		|| str_starts_with($handle, VIBE_MART_APP_HANDLE . '-');
}

/**
 * Keep other plugins' frontend assets out of the SPA shell.
 *
 * index.php renders nothing but the React root, so no other plugin has any
 * markup on the page for its CSS and JS to act on. They still enqueue their
 * frontend bundles though — hundreds of kilobytes of Elementor, WooCommerce and
 * jQuery on every view. Elementor additionally throws "elementorFrontendConfig
 * is not defined", because it only prints that config for pages it built.
 *
 * Dependencies are safe to drop: WordPress re-resolves them for anything still
 * queued. The admin bar is kept so logged-in editors keep their toolbar, and the
 * customizer preview is left untouched so it still works.
 *
 * Re-add anything genuinely needed via the two filters.
 */
add_action(
	'wp_enqueue_scripts',
	static function (): void {
		if (is_customize_preview()) {
			return;
		}

		/**
		 * Filters script handles kept on the SPA shell.
		 *
		 * @param string[] $handles Handles to keep alongside the theme's own.
		 */
		$keep_scripts = (array) apply_filters('vibe_mart_keep_scripts', array('admin-bar'));

		/**
		 * Filters style handles kept on the SPA shell.
		 *
		 * @param string[] $handles Handles to keep alongside the theme's own.
		 */
		$keep_styles = (array) apply_filters('vibe_mart_keep_styles', array('admin-bar', 'dashicons'));

		/* Snapshot both queues: dequeuing mutates them as we go. */
		$script_queue = (array) wp_scripts()->queue;
		$style_queue  = (array) wp_styles()->queue;

		foreach ($script_queue as $handle) {
			if (! vibe_mart_theme_owns_handle((string) $handle) && ! in_array($handle, $keep_scripts, true)) {
				wp_dequeue_script((string) $handle);
			}
		}

		foreach ($style_queue as $handle) {
			if (! vibe_mart_theme_owns_handle((string) $handle) && ! in_array($handle, $keep_styles, true)) {
				wp_dequeue_style((string) $handle);
			}
		}
	},
	PHP_INT_MAX
);

/**
 * Mark the bundle as an ES module.
 *
 * Vite emits ESM, so without type="module" the browser refuses the file with
 * "Cannot use 'import.meta' outside a module" and the SPA never boots.
 *
 * WordPress hands this filter the inline "before" config script and the bundle's
 * own <script src> tag as one combined string, so the src-bearing tag has to be
 * targeted explicitly. Marking the leading config blob instead leaves the bundle
 * running as a classic script, which is the failure this guards against.
 */
add_filter(
	'script_loader_tag',
	static function (string $tag, string $handle, string $src = ''): string {
		unset($src);
		if (VIBE_MART_APP_HANDLE !== $handle) {
			return $tag;
		}

		$patched = preg_replace_callback(
			'#<script[^>]*\bsrc=[^>]*>#i',
			static function (array $matches): string {
				$open = $matches[0];
				if (preg_match('/\btype=([\'"])module\1/i', $open)) {
					return $open;
				}

				/* Drop any classic type attribute so we never emit two. */
				$open = (string) preg_replace('/\stype=([\'"])[^\'"]*\1/i', '', $open);

				return (string) preg_replace('/<script\b/i', '<script type="module"', $open, 1);
			},
			$tag,
			1
		);

		return is_string($patched) ? $patched : $tag;
	},
	10,
	3
);
