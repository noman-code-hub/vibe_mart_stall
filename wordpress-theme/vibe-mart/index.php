<?php
/**
 * SPA shell — React mounts into #vibe-mart-root.
 *
 * @package VibeMartTheme
 */

$vibe_mart_splash_logo = trailingslashit( get_template_directory_uri() ) . 'assets/vibe-mart-logo.png';

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<?php wp_head(); ?>
	<style>
		html.vm-splash-lock,
		html.vm-splash-lock body {
			overflow: hidden !important;
		}

		#vm-splash {
			position: fixed;
			inset: 0;
			z-index: 99999;
			display: grid;
			place-items: center;
			padding: 24px;
			box-sizing: border-box;
			background: #ffffff;
			transition: opacity 0.42s ease, visibility 0.42s ease;
		}

		#vm-splash.is-done {
			opacity: 0;
			visibility: hidden;
			pointer-events: none;
		}

		#vm-splash .vm-splash__card {
			display: grid;
			justify-items: center;
			gap: 4px;
			width: min(440px, 100%);
			text-align: center;
		}

		#vm-splash .vm-splash__logo {
			display: block;
			width: min(380px, 84vw);
			height: auto;
			object-fit: contain;
			margin: 0;
			line-height: 0;
			filter: drop-shadow(0 10px 24px rgba(255, 196, 0, 0.22));
		}

		#vm-splash .vm-splash__dots {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10px;
			min-height: 14px;
			margin: 0;
		}

		#vm-splash .vm-splash__dot {
			width: 12px;
			height: 12px;
			border: 2px solid #1a1008;
			border-radius: 50%;
			background: #ffe600;
			box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.55);
			animation: vm-splash-dot 1s ease-in-out infinite;
		}

		#vm-splash .vm-splash__dot:nth-child(2) {
			animation-delay: 0.15s;
			background: #ff3b2f;
		}

		#vm-splash .vm-splash__dot:nth-child(3) {
			animation-delay: 0.3s;
			background: #025fd7;
		}

		#vm-splash .vm-splash__copy {
			margin: 6px 0 0;
			font-family: system-ui, sans-serif;
			font-size: 0.92rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			color: #1a1008;
		}

		@keyframes vm-splash-dot {
			0%,
			80%,
			100% {
				transform: translateY(0) scale(0.85);
				opacity: 0.45;
			}
			40% {
				transform: translateY(-8px) scale(1.08);
				opacity: 1;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			#vm-splash .vm-splash__dot {
				animation: none;
				opacity: 1;
				transform: none;
			}

			#vm-splash {
				transition: none;
			}
		}
	</style>
	<script>
		window.__vmSplashStartedAt = Date.now();
		document.documentElement.classList.add('vm-splash-lock');
	</script>
</head>
<body <?php body_class('vibe-mart-theme'); ?>>
<?php wp_body_open(); ?>
<div id="vm-splash" role="status" aria-live="polite" aria-busy="true" aria-label="Loading Vibe Mart">
	<div class="vm-splash__card">
		<img
			class="vm-splash__logo"
			src="<?php echo esc_url( $vibe_mart_splash_logo . '?v=2' ); ?>"
			alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
			width="380"
			height="168"
			decoding="async"
		/>
		<div class="vm-splash__dots" aria-hidden="true">
			<span class="vm-splash__dot"></span>
			<span class="vm-splash__dot"></span>
			<span class="vm-splash__dot"></span>
		</div>
		<p class="vm-splash__copy">Opening the market…</p>
	</div>
</div>
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
