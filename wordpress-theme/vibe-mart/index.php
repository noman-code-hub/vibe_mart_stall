<?php
/**
 * SPA shell — React mounts into #vibe-mart-root.
 *
 * @package VibeMartTheme
 */

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<?php wp_head(); ?>
</head>
<body <?php body_class('vibe-mart-theme'); ?>>
<?php wp_body_open(); ?>
<div id="vibe-mart-root"></div>
<?php
if (! function_exists('vibe_mart_theme_manifest') || null === vibe_mart_theme_manifest()) {
	if (current_user_can('manage_options')) {
		echo '<p style="padding:2rem;font-family:sans-serif;">Vibe Mart theme: run <code>npm run build:wp</code> and ensure assets/app is populated.</p>';
	}
}
?>
<?php wp_footer(); ?>
</body>
</html>
