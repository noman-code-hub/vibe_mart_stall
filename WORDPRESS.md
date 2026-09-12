# Vibe Mart — WordPress deployment guide

The whole website runs on WordPress. WordPress owns the server, the database,
the user accounts, the login session and every email. There is no Vercel or
Node.js dependency in production.

```
Browser (React SPA)
        │
        ▼
Vibe Mart theme          serves the page shell and hands the app its REST URL + nonce
        │
        ▼
Vibe Mart plugin         /wp-json/vibe-mart/v1/…
        │
        ├── Accounts     WordPress users, vibe_trader role, auth cookies
        ├── Email        wp_mail — confirm address, reset password, contact form
        ├── Data         wp_vm_stalls / wp_vm_products / wp_vm_badges / wp_vm_pitches
        ├── Photos       WordPress Media Library (wp-content/uploads)
        └── Cutouts      remove.bg proxied server-side so the key stays private
```

## What you install

`npm run build:wp` produces two packages in `dist-packages/`:

| Package | Contains | Install as |
| --- | --- | --- |
| `vibe-mart-plugin.zip` | All backend logic. ~30 KB. | Plugin |
| `vibe-mart-theme.zip` | The built React app and its artwork. ~70 MB. | Theme |

Both are required. The plugin without the theme gives you a REST API and no
website; the theme without the plugin gives you a website that cannot log anyone
in.

## First install

### 1. Build

```bash
npm install
npm run build:wp
```

### 2. Upload the plugin

**Plugins → Add New → Upload Plugin** → `dist-packages/vibe-mart-plugin.zip` →
Install → **Activate**.

Activation creates the four `wp_vm_*` tables and the `vibe_trader` role.

### 3. Upload the theme

The theme zip is around 70 MB because of the artwork, which is larger than most
hosts allow through **Appearance → Themes → Upload**. Copy the folder over FTP
or cPanel File Manager instead:

```
wordpress-theme/vibe-mart/   →   wp-content/themes/vibe-mart/
```

Then activate **Vibe Mart** under **Appearance → Themes**.

> Make sure `wp-content/themes/vibe-mart/assets/app/` arrives complete. That
> folder holds the compiled app. If it is missing or partial, the site loads a
> blank page.

### 4. Turn on pretty permalinks

**Settings → Permalinks → Post name → Save.**

React Router needs this. Without it every URL except the home page 404s.

### 5. Add the remove.bg key

Either **Vibe Mart → Settings** in the admin menu, or better, in `wp-config.php`
above the "stop editing" line:

```php
define( 'VIBE_MART_REMOVE_BG_API_KEY', 'your-remove-bg-key' );
```

### 6. Make email actually send

This is the step most sites get wrong. WordPress `wp_mail()` uses PHP `mail()`
by default, and most hosts either block it or the messages land in spam. Since
new traders cannot log in until they click the confirmation link, broken email
means nobody can sign up.

Install an SMTP plugin (WP Mail SMTP, Fluent SMTP, Post SMTP) and point it at a
real sending service — your host's SMTP, Brevo, Mailgun, SendGrid or Amazon SES.
Send the plugin's test email and confirm it arrives before you invite anyone.

## Deploying an update

After any change to the React app or the PHP:

```bash
npm run build:wp
```

Then re-upload whichever side changed:

- **Frontend or artwork changed** — replace `wp-content/themes/vibe-mart/assets/app/`
- **PHP changed** — replace `wp-content/plugins/vibe-mart/`, or upload the new zip

Asset filenames contain a content hash, so browsers pick up new builds
immediately without a cache purge.

## How accounts work

Traders are ordinary WordPress users with the `vibe_trader` role, so they appear
under **Users** in the admin and you can reset or ban them like any other
account.

| Step | What happens |
| --- | --- |
| Register | `wp_insert_user` creates the account, marks `vm_email_confirmed = 0`, emails a confirmation link |
| Confirm | The link hits `/confirm-email`, the flag flips to `1`, and the visitor is logged straight in |
| Log in | `wp_signon` sets the standard WordPress auth cookie; unconfirmed accounts are refused |
| Forgot password | WordPress core reset keys, emailed to `/reset-password` |

`wp-login.php` redirects to the React screens, so traders never see the default
WordPress login form. To reach it yourself as an administrator, use
`wp-login.php?vibe_mart_wp_login=1`.

The REST API authenticates with the WordPress cookie plus an `X-WP-Nonce`
header. The theme prints a fresh nonce on every page load.

## Where photos live

Selfies and product photos are uploaded to the WordPress Media Library and only
the resulting URL is stored in the stall row. They appear under **Media** and are
served as ordinary files, so the browser can cache them.

`POST /wp-json/vibe-mart/v1/uploads` — multipart, field `file`, logged in only,
JPG/PNG/WebP, capped by **Vibe Mart → Settings → Max upload**.

If an older client still sends a base64 data URL inside the stall JSON, the
plugin decodes it into an attachment on the way in, so no image is ever written
into the database.

## Publishing rules

A stall reaches the market only with a seller photo, a bio, an ambition, a pitch
location, at least one product and at least one trust badge. The API refuses
anything else with `Cannot publish — missing: …`, on both create and edit.

## REST API

Namespace `/wp-json/vibe-mart/v1`.

| Method | Route | Access |
| --- | --- | --- |
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| POST | `/auth/logout` | public |
| GET | `/auth/session` | public |
| POST | `/auth/confirm-email` | public |
| POST | `/auth/forgot-password` | public |
| POST | `/auth/reset-password` | public |
| GET, PUT | `/auth/profile` | logged in |
| GET | `/marketplace?search=` | public |
| GET | `/stalls/mine` | logged in |
| POST | `/stalls` | logged in |
| GET | `/stalls/{id}` | public once published |
| PUT, DELETE | `/stalls/{id}` | owner |
| POST | `/uploads` | logged in |
| POST | `/remove-background` | valid nonce |
| POST | `/contact` | valid nonce |

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| remove.bg API key | empty | The `wp-config.php` constant wins over the stored option |
| Max upload | 10 MB | Also capped by the server's `upload_max_filesize` |
| Uploads per hour per visitor | 20 | Applies to background removal; `0` disables it |

Free stalls per trader is fixed at 5 (`STALL_MAX_FREE`), with 6 products per
stall and 6 photos per product.

## Filters

| Filter | Purpose |
| --- | --- |
| `vibe_mart_runtime_config` | Change the config handed to the React app |
| `vibe_mart_max_upload_bytes` | Change the accepted upload size |
| `vibe_mart_rate_limit` | Change the hourly background-removal limit |
| `vibe_mart_require_nonce` | Return `false` to skip the nonce check (caching workaround) |
| `vibe_mart_client_ip` | Supply the real IP behind a proxy or CDN |
| `vibe_mart_contact_recipient` | Change where contact form mail goes |
| `vibe_mart_admin_capability` | Change who can see the Vibe Mart admin screens |

## Caching

The page carries a REST nonce that lasts roughly 12 to 24 hours. If a full-page
cache serves the HTML for longer, visitors see "Your session expired. Please
refresh the page and try again." Exclude the site from full-page caching for
logged-in users, which most cache plugins do by default.

## Go-live checklist

- [ ] `npm run build:wp` finished without errors
- [ ] Plugin activated and **Vibe Mart** appears in the admin menu
- [ ] Theme activated and the home page renders the React app
- [ ] Permalinks set to Post name, and `/market` loads on a hard refresh
- [ ] SMTP configured and a test email arrives
- [ ] Registered a throwaway account and the confirmation email arrived
- [ ] Clicked the confirmation link and landed logged in
- [ ] Forgot-password email arrives and the reset works
- [ ] Built a stall, and the photos appear under **Media**
- [ ] Published the stall and it shows on `/market`
- [ ] Publishing an empty stall is refused with a list of what is missing
- [ ] Background removal returns a transparent cutout
- [ ] Contact form email arrives

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Blank white page | `assets/app/` missing or incomplete | Re-upload the folder, confirm `asset-manifest.json` is present |
| Home page works, `/market` gives 404 | Pretty permalinks off | Settings → Permalinks → Post name → Save |
| Nobody can finish signing up | Email not sending | Configure SMTP and send a test |
| "Please log in" while logged in | Stale REST nonce from a page cache | Exclude logged-in users from full-page caching |
| Photo upload rejected as too large | Server or plugin upload cap | Raise `upload_max_filesize` / `post_max_size`, then Vibe Mart → Settings |
| Theme zip will not upload | 70 MB exceeds the host limit | Copy the folder over FTP or File Manager instead |
| "Background removal is not configured" | remove.bg key missing | Set it in Settings or `wp-config.php` |
| Stall shows the brand name where the seller name should be | Stall saved before this release | Re-save the stall once so `seller_name` is stored |

## Local development

`npm run dev` still runs the React app on http://localhost:3000 against a local
mock API that writes to `.local-data/`. It is a convenience for UI work only and
is not part of the WordPress deployment. In that mode photos stay inline as data
URLs because the mock has no media library.

To develop against a real WordPress instance instead, set `WP_PROXY_TARGET` in
`.env` to its URL and the mock steps aside.
