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
