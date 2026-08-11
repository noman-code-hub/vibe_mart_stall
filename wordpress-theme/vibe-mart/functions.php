<?php
/**
 * Theme Name:       Vibe Mart
 * Theme URI:        https://github.com/noman-code-hub/vibe_mart_stall
 * Description:      Custom headless-style theme that loads the Vibe Mart React marketplace. Business logic lives in the Vibe Mart plugin.
 * Version:          1.0.0
 * Requires at least: 6.0
 * Requires PHP:     8.0
 * Author:           Vibe Mart
 * Text Domain:       vibe-mart
 * License:          GPL-2.0-or-later
 *
 * @package VibeMartTheme
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
	exit;
}

define('VIBE_MART_THEME_VERSION', '1.0.0');
define('VIBE_MART_THEME_DIR', get_template_directory());
define('VIBE_MART_THEME_URI', get_template_directory_uri());

require_once VIBE_MART_THEME_DIR . '/inc/setup.php';
require_once VIBE_MART_THEME_DIR . '/inc/assets.php';
require_once VIBE_MART_THEME_DIR . '/inc/seo.php';
