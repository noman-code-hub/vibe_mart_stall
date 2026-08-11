# Vibe Mart Stall — WordPress deployment guide

The stall generator runs entirely inside WordPress. The React app is built with
Vite and shipped inside a plugin; background removal happens in a WordPress REST
endpoint that calls remove.bg server-side. There is no Vercel dependency.

```
Browser (React bundle)
        |
        v
WordPress REST  /wp-json/vibe-stall/v1/remove-background
        |
        v
remove.bg
```

## Final folder structure

```
Vibe_Mart_stall/                          # React project (build source)
├── src/
│   ├── api/removeBackground.js           # posts to the WP REST route
│   ├── config/runtimeConfig.js           # reads window.vibeStallGenerator
│   └── main.jsx                          # mounts into #stall-root
├── dev-server/removeBackgroundDevHandler.js   # npm run dev only
├── scripts/build-wordpress.mjs           # copies dist/ into the plugin
├── vite.config.js                        # base: './', manifest, dev API
└── wordpress-plugin/
    └── vibe-stall-generator/             # <- upload this folder to WordPress
        ├── vibe-stall-generator.php      # bootstrap, temp dir, cron cleanup
        ├── uninstall.php
        ├── readme.txt
        ├── includes/
        │   ├── settings.php              # Settings -> Vibe Stall
        │   ├── assets.php                # manifest-driven enqueue
        │   ├── shortcode.php             # [vibe_stall]
        │   └── rest-api.php              # remove.bg proxy
        ├── assets/react/                 # build output (npm run build:wp)
        ├── templates/stall-root.php      # <div id="stall-root"></div>
        └── uploads/                      # placeholder; runtime temp files live
                                          # in wp-content/uploads/vibe-stall-tmp/
```

## Build instructions

```bash
npm install
npm run build:wp
```

`build:wp` runs `vite build` and then copies `dist/` into
`wordpress-plugin/vibe-stall-generator/assets/react/`, writing
`asset-manifest.json` with the hashed entry filenames that the plugin enqueues.

Re-run it after **any** change to the React app, then re-upload `assets/react/`.

## Installation

1. Run `npm run build:wp`.
2. Copy `wordpress-plugin/vibe-stall-generator/` to `wp-content/plugins/` on the
   site (FTP, SSH, or upload a zip of that folder via **Plugins → Add New →
   Upload Plugin**).
3. Activate **Vibe Stall Generator** in **Plugins**.
4. Add the remove.bg key, either in **Settings → Vibe Stall** or, preferably, in
   `wp-config.php`:

   ```php
   define( 'VIBE_STALL_REMOVE_BG_API_KEY', 'your-remove-bg-key' );
   ```

5. Create a page and add the shortcode:

   ```
   [vibe_stall]
   ```

   In Elementor use a **Shortcode** widget; in the block editor use a
   **Shortcode** block.

To build a zip on Windows:

```powershell
Compress-Archive -Path wordpress-plugin\vibe-stall-generator -DestinationPath vibe-stall-generator.zip -Force
```

## Deployment checklist

- [ ] `npm run build:wp` completed without errors
- [ ] `assets/react/asset-manifest.json` and the hashed files were uploaded
- [ ] Plugin activated; **Settings → Vibe Stall** shows no red notice
- [ ] remove.bg key set (constant or option) and the account has credits
- [ ] Page with `[vibe_stall]` loads the editor
- [ ] Uploading a photo returns a transparent cutout
- [ ] Page caching (if any) does not serve the page for longer than 12 hours,
      otherwise the REST nonce can expire — see "Caching" below

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| remove.bg API key | empty | `VIBE_STALL_REMOVE_BG_API_KEY` in `wp-config.php` wins over the stored option |
| Maximum upload size | 10 MB | Also capped by the server's `upload_max_filesize` |
| Uploads per hour, per visitor | 20 | `0` disables the throttle |

## Filters

| Filter | Purpose |
| --- | --- |
| `vibe_stall_max_upload_bytes` | Change the accepted upload size |
| `vibe_stall_rate_limit` | Change the hourly per-IP request limit |
| `vibe_stall_require_nonce` | Return `false` to skip nonce checks (caching workaround) |
| `vibe_stall_client_ip` | Supply the real IP behind a proxy or CDN |

## REST API

`POST /wp-json/vibe-stall/v1/remove-background`

| | |
| --- | --- |
| Body | `multipart/form-data`, field `image` |
| Headers | `X-WP-Nonce: <wp_rest nonce>` |
| Success | `200` with an `image/png` body (transparent cutout) |
| Failure | JSON `{ "error": string, "code": string, "message": string }` |

Error codes: `MISSING_API_KEY`, `RATE_LIMITED`, `MISSING_IMAGE`,
`INVALID_UPLOAD`, `FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, `TIMEOUT`,
`NETWORK_ERROR`, `INVALID_API_KEY`, `REMOVE_BG_ERROR`.

## Security model

- The API key is read server-side only. It is never localized to JavaScript,
  never returned by the REST route, and is stored either in a `wp-config.php`
  constant or in an option readable only by `manage_options` users.
- Every request must carry a valid `wp_rest` nonce.
- Uploads are checked with `is_uploaded_file()`, `wp_check_filetype_and_ext()`
  (real content sniffing, not just the extension) and `getimagesize()`. Only
  JPEG, PNG, and WebP pass.
- Uploads are size-limited both client-side and server-side.
- Requests are throttled per IP per hour with transients.
- Files are moved into `wp-content/uploads/vibe-stall-tmp/`, which is protected
  by `.htaccess` and an `index.php`, deleted immediately after processing, and
  swept hourly by the `vibe_stall_cleanup_temp` cron event.
- Responses are sent with `Cache-Control: no-store` and
  `X-Content-Type-Options: nosniff`.

## Caching

The page embeds a REST nonce that is valid for roughly 12–24 hours. If a
full-page cache serves the page for longer, visitors get
`Your session expired. Please refresh the page and try again.` Fix it by
excluding the stall page from full-page caching, or by adding:

```php
add_filter( 'vibe_stall_require_nonce', '__return_false' );
```

## Theme and builder compatibility

- All CSS is scoped under `#stall-root`; nothing leaks into the theme.
- Component styles are CSS Modules with hashed class names, so Elementor,
  WooCommerce, and theme classes cannot collide with them.
- `#stall-root` resets inherited typography and `box-sizing`, and uses
  `isolation: isolate` so theme z-index stacking cannot cover the stall.
- If a theme uses `!important` on `img { height: auto }`, add a small override
  in **Appearance → Customize → Additional CSS**:

  ```css
  #stall-root img { height: revert; }
  ```

## Performance

- Assets load **only** on pages containing the shortcode.
- Filenames are content-hashed and enqueued without a version query string, so
  browsers and CDNs can cache them indefinitely.
- The finished stall renderer is a separate lazily-loaded chunk, fetched during
  the existing loading screen, so first paint of the editor stays small.
- Production assets are minified by Vite; the bundle is served as an ES module.

## Local development

`npm run dev` still works standalone on http://localhost:3000. In that mode the
bundle falls back to `POST /api/remove-background`, served by
`dev-server/removeBackgroundDevHandler.js` using `REMOVE_BG_API_KEY` from `.env`.
That file is development-only and is not part of the plugin.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Shortcode shows an assets-missing message | `npm run build:wp` was not run, or `assets/react/` was not uploaded | Rebuild and re-upload `assets/react/` |
| "Session expired" on upload | Full-page cache served a stale REST nonce | Exclude the page from cache, or refresh; last resort `vibe_stall_require_nonce` filter |
| "Background removal is not configured" | Missing API key | Set key in Settings → Vibe Stall or `VIBE_STALL_REMOVE_BG_API_KEY` |
| "No credits left" | remove.bg balance empty | Top up the remove.bg account |
| Stall looks unstyled / wrong fonts | Theme CSS or missing Google Fonts | Confirm `#stall-root` CSS loaded; check the fonts stylesheet |
| Upload works in Chrome but not Safari | Older Safari without ES modules | Require a current Safari / iOS version |
| Temp folder warnings on Nginx | `.htaccess` is Apache-only | Safe: files are random-named and deleted immediately |

## Production verification (static)

Run from the project root before every release:

```bash
npm run build:wp   # Vite build + copy into plugin + PHP syntax gate
npm run lint
npm run verify:unused
```

Confirm:

- `assets/react/asset-manifest.json` points at files that exist
- The JS bundle contains `import.meta.url` and `stall-cart-*.png`
- The JS bundle does **not** contain the remove.bg API key
- PHP syntax gate reports all 8 plugin PHP files passed

Live WordPress checks that still need a real host:

- Activate / deactivate / uninstall the plugin
- Place `[vibe_stall]` in Gutenberg, Elementor, Classic Editor, and a shortcode widget
- Upload JPEG / PNG / WebP and confirm transparent cutouts
- Spot-check Twenty Twenty-Six, Astra, Hello Elementor, and WoodMart
- Spot-check Chrome, Edge, Firefox, Safari, and a phone viewport
