<?php
/**
 * SPA shell — React mounts into #vibe-mart-root.
 *
 * @package VibeMartTheme
 */

/*
 * Splash art is read from the build output so it tracks frontend/public/ on every
 * `npm run build:wp`, instead of being a separate copy that drifts out of date.
 */
$vibe_mart_splash_logo = add_query_arg(
	'v',
	VIBE_MART_THEME_VERSION,
	trailingslashit( get_template_directory_uri() ) . 'assets/app/loading-logo.webp'
);

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
			gap: 16px;
			width: min(820px, 100%);
			text-align: center;
		}

		#vm-splash .vm-splash__logo {
			display: block;
			width: min(760px, 92vw);
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

		@media (max-width: 640px) {
			#vm-splash .vm-splash__logo {
				width: min(420px, 92vw);
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
			src="<?php echo esc_url( $vibe_mart_splash_logo ); ?>"
			alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
			width="380"
			height="253"
			decoding="async"
		/>
		<div class="vm-splash__dots" aria-hidden="true">
			<span class="vm-splash__dot"></span>
			<span class="vm-splash__dot"></span>
			<span class="vm-splash__dot"></span>
		</div>
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
<script>
	/*
	 * Hide leftover plugin markup.
	 *
	 * The React root is the entire page, but plugins still print comparison
	 * bars, wishlist widgets and modal shells into wp_body_open/wp_footer.
	 * Their stylesheets are dequeued, so that markup would otherwise pile up
	 * unstyled at the bottom of every page.
	 *
	 * This is a classic script, so it runs during parsing — before the deferred
	 * module bundle mounts React. Only server-rendered nodes are touched; the
	 * overlays the app later portals into document.body are added afterwards
	 * and are left alone.
	 */
	(function () {
		var keep = { 'vibe-mart-root': 1, 'vm-splash': 1, 'wpadminbar': 1 };
		var skip = { SCRIPT: 1, STYLE: 1, LINK: 1, NOSCRIPT: 1, TEMPLATE: 1 };
		var nodes = Array.prototype.slice.call(document.body.children);

		for (var i = 0; i < nodes.length; i++) {
			var el = nodes[i];
			if (skip[el.tagName] || (el.id && keep[el.id])) continue;
			el.setAttribute('data-vm-hidden', '');
			el.style.setProperty('display', 'none', 'important');
		}
	})();
</script>
</body>
</html>
