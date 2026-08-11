=== Vibe Stall Generator ===
Contributors: vibemart
Tags: shortcode, react, image, background removal, generator
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Embed the Vibe Mart stall generator on any page with [vibe_stall]. Backgrounds are removed server-side through remove.bg.

== Description ==

Vibe Stall Generator embeds a React application that lets a market trader build
their stall graphic: business name, trader photo, four products with names,
sizes and prices, an about/ambition panel, and pitch details.

Uploaded photos are sent to remove.bg through a WordPress REST endpoint, so the
API key stays on the server and is never exposed to the browser.

Features:

* `[vibe_stall]` shortcode — renders the editor anywhere
* Server-side background removal via `vibe-stall/v1/remove-background`
* Nonce-protected, rate-limited, MIME-validated uploads
* Assets load only on pages that use the shortcode
* Works with block themes, Elementor, and WooCommerce pages

== Installation ==

1. Build the React app: `npm run build:wp` in the project root.
2. Upload the `vibe-stall-generator` folder to `/wp-content/plugins/`.
3. Activate the plugin in **Plugins**.
4. Go to **Settings → Vibe Stall** and paste your remove.bg API key, or define
   it in `wp-config.php`:

   `define( 'VIBE_STALL_REMOVE_BG_API_KEY', 'your-key' );`

5. Add `[vibe_stall]` to any page.

== Frequently Asked Questions ==

= Where is the API key stored? =

In a `wp-config.php` constant if you define one, otherwise in the
`vibe_stall_api_key` option. It is only read server-side and never printed to
the page or returned by the REST endpoint.

= Background removal says my session expired =

The REST nonce embedded in the page has aged out, usually because of full-page
caching. Refresh the page. If your cache serves pages for longer than 12 hours,
exclude the page from caching or disable the nonce requirement with the
`vibe_stall_require_nonce` filter.

= Can I change the upload limit? =

Yes, under **Settings → Vibe Stall**, or with the `vibe_stall_max_upload_bytes`
filter. The server's own `upload_max_filesize` still applies.

== Changelog ==

= 1.0.0 =
* First release: shortcode, REST background-removal proxy, admin settings.
