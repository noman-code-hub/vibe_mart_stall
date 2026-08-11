# Vibe Mart Marketplace Architecture

## Overview

```text
Browser (React SPA)
        │
        ▼
WordPress Theme  ──loads──▶  hashed JS/CSS in assets/app/
        │
        ▼
WordPress Plugin REST  (/wp-json/vibe-mart/v1/…)
        │
        ├── Auth (WP users + cookies)
        ├── Stalls / Products / Badges / Pitches (custom tables)
        └── remove.bg proxy (API key server-side)
```

WordPress is **backend only**. The custom theme does not contain marketplace
business logic — it enqueues the React app and prints `#vibe-mart-root`.

## Folder structure

```text
Vibe_Mart_stall/
├── frontend/                      # React + Vite application
│   ├── src/
│   │   ├── pages/                 # Home, Our Vibes, Sell Smart, …
│   │   ├── layouts/               # MainLayout (header/nav/footer)
│   │   ├── components/            # Stall generator + shared UI
│   │   │   └── StallGeneratorApp.jsx   # preserved stall editor
│   │   ├── context/               # Auth + runtime config
│   │   ├── services/              # REST clients
│   │   ├── api/                   # remove.bg client
│   │   ├── hooks/, utils/, data/, assets/
│   │   ├── App.jsx                # React Router
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
├── wordpress-theme/vibe-mart/     # Custom theme (loads React)
├── wordpress-plugin/vibe-mart/    # Marketplace backend
├── wordpress-plugin/vibe-stall-generator/  # legacy stall plugin (reference)
├── scripts/                       # build:wp, php syntax gate
├── dist-packages/                 # vibe-mart-theme.zip + vibe-mart-plugin.zip
└── package.json
```

## Theme structure

```text
wordpress-theme/vibe-mart/
├── style.css
├── functions.php
├── index.php                 # SPA shell
├── inc/
│   ├── setup.php             # theme supports, menus
│   ├── assets.php            # enqueue React + localize vibeMartConfig
│   └── seo.php
└── assets/app/               # filled by npm run build:wp
    └── asset-manifest.json
```

## Plugin structure

```text
wordpress-plugin/vibe-mart/
├── vibe-mart.php
├── uninstall.php
├── readme.txt
└── includes/
    ├── settings.php          # remove.bg key, limits
    ├── database.php          # vm_stalls, vm_products, vm_badges, vm_pitches
    ├── rest-auth.php
    ├── rest-stalls.php
    └── rest-remove-bg.php
```

## React routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/our-vibes` | Our Vibes |
| `/sell-smart` | Sell Smart (existing Stall Generator) |
| `/my-account` | My Account (tabs; requires login) |
| `/market` | Marketplace list |
| `/market/:id` | Stall detail |
| `/login` | Custom login / register |
| `/my-trolley` | Trolley placeholder |
| `/contact` | Contact form |

## Database schema

### `wp_vm_stalls`
`id`, `owner_id`, `brand_name`, `seller_photo`, `seller_bio`, `ambition`, `status` (`draft`|`published`), `created_at`, `updated_at`

### `wp_vm_products` (max 6 per stall in API)
`id`, `stall_id`, `name`, `condition_label`, `price`, `description`, `image_url`, `sort_order`

### `wp_vm_badges`
`id`, `stall_id`, `label`

### `wp_vm_pitches`
`id`, `stall_id` (unique), `pitch_number`, `location`, `member_since`

Authentication uses **WordPress users** (no custom users table).

## REST API (`/wp-json/vibe-mart/v1`)

| Method | Route | Auth |
| --- | --- | --- |
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| POST | `/auth/logout` | public |
| GET | `/auth/profile` | logged-in |
| PUT | `/auth/profile` | logged-in |
| GET | `/marketplace?search=` | public |
| GET | `/stalls/mine` | logged-in |
| POST | `/stalls` | logged-in |
| GET | `/stalls/{id}` | public if published |
| PUT | `/stalls/{id}` | owner |
| DELETE | `/stalls/{id}` | owner |
| POST | `/remove-background` | nonce |

## Build instructions

```bash
npm install
npm run build:wp
```

Outputs:

1. Theme assets in `wordpress-theme/vibe-mart/assets/app/`
2. `dist-packages/vibe-mart-theme.zip`
3. `dist-packages/vibe-mart-plugin.zip`

## Deployment instructions

1. In WordPress → Plugins → upload **vibe-mart-plugin.zip** → Activate  
2. Appearance → Themes → upload **vibe-mart-theme.zip** → Activate  
3. Settings → Vibe Mart → remove.bg API key  
4. Permalink settings: Post name (pretty permalinks required for React Router basename)  
5. Open the site front page

## Preserved features

- Stall Generator UI (edit form, loading screen, live preview overlays)
- Background removal via remove.bg (now `vibe-mart/v1/remove-background`)
- Product cutout trimming, Oswald/Bangers typography, overlay layout

## Local development notes

- `npm run dev` runs the React SPA with Vite middleware for remove.bg
- Auth / marketplace REST calls need a WordPress backend; without it, Market shows empty and Login shows API errors (expected in pure Vite mode)
