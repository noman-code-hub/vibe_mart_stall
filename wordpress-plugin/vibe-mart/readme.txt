=== Vibe Mart Marketplace ===
Contributors: vibemart
Tags: marketplace, stalls, react, rest-api
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 1.2.0
License: GPLv2 or later

Marketplace backend for Vibe Mart. Pair with the Vibe Mart theme.

== Description ==

Provides REST auth, stall/product storage, marketplace listing, and remove.bg
background removal. The React SPA is loaded by the Vibe Mart theme.

== Installation ==

1. Upload `vibe-mart` to `/wp-content/plugins/`
2. Activate the plugin
3. Install and activate the Vibe Mart theme
4. Set your remove.bg API key under Settings → Vibe Mart

== Changelog ==

= 1.2.0 =
* Phase 10: WordPress admin dashboard for traders, stalls, products, deletes, and marketplace stats

= 1.1.0 =
* Phase 4: hardened stall DB schema (versioned upgrades) and stall CRUD REST
* Stalls always linked to owner_id; products, badges, and pitch tables
* Partial stall updates no longer wipe related products/badges/pitch

= 1.0.0 =
* Marketplace architecture release
