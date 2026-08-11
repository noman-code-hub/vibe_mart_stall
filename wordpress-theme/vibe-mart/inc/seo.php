<?php
/**
 * Light SEO hooks — title-tag support is enough for the SPA shell.
 *
 * @package VibeMartTheme
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
	exit;
}

add_action(
	'wp_head',
	static function (): void {
		if (! is_front_page()) {
			return;
		}
		echo '<meta name="description" content="' . esc_attr(get_bloginfo('description')) . '" />' . "\n";
	},
	1
);
