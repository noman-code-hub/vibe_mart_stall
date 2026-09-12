<?php
/**
 * Theme supports and menus.
 *
 * @package VibeMartTheme
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
	exit;
}

add_action(
	'after_setup_theme',
	static function (): void {
		add_theme_support('title-tag');
		add_theme_support('post-thumbnails');
		add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));
		add_theme_support('custom-logo', array(
			'height'      => 80,
			'width'       => 240,
			'flex-height' => true,
			'flex-width'  => true,
		));

		register_nav_menus(
			array(
				'primary' => __('Primary Menu', 'vibe-mart'),
				'footer'  => __('Footer Menu', 'vibe-mart'),
			)
		);
	}
);

/**
 * Soft 404 for unknown WP routes — React Router handles in-app paths.
 */
add_filter(
	'template_include',
	static function (string $template): string {
		$spa = VIBE_MART_THEME_DIR . '/index.php';
		return file_exists($spa) ? $spa : $template;
	},
	99
);

/**
 * Answer SPA deep links with 200 instead of 404.
 *
 * Routes like /market and /my-account belong to React Router, but WordPress has
 * no post or page behind them, so handle_404() flags the request and the tab
 * reads "Page not found" while search engines see a 404. The flag is cleared
 * before the status line and document title are produced, so the shell is served
 * as an ordinary page.
 */
add_action(
	'template_redirect',
	static function (): void {
		if (is_admin() || is_feed() || is_robots() || ! is_404()) {
			return;
		}

		global $wp_query;
		if ($wp_query instanceof WP_Query) {
			$wp_query->is_404 = false;
		}

		status_header(200);
	},
	1
);
