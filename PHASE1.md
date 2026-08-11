# Phase 1 — Project Architecture & Foundation

Status: **Complete**

This phase prepares Vibe Mart for marketplace development **without replacing** the
working Stall Generator. Later phases add product/market behavior on top of this
foundation.

---

## Goals (Phase 1)

| Goal | Status |
| --- | --- |
| One React application | Done (`frontend/`) |
| Custom WordPress theme that only loads React | Done (`wordpress-theme/vibe-mart/`) |
| WordPress plugin for backend / REST / DB / auth | Done (`wordpress-plugin/vibe-mart/`) |
| Preserve Stall Generator + live preview | Done (`StallGeneratorApp` on `/sell-smart`) |
| Preserve background removal + uploads | Done (`api/removeBackground.js` + plugin REST) |
| Clean folders, services, API layer, build | Done |
| Do **not** ship unfinished marketplace product logic as “done” | Scaffold only (pages/routes ready) |

---

## Architecture after Phase 1

```text
┌─────────────────────────────────────────────────────────┐
│  React SPA  (frontend/)                                 │
│  Router + layouts + pages                               │
│  StallGeneratorApp  →  live preview + uploads           │
└───────────────────────────┬─────────────────────────────┘
                            │ built assets
                            ▼
┌─────────────────────────────────────────────────────────┐
│  WordPress Theme  (wordpress-theme/vibe-mart/)          │
│  • #vibe-mart-root                                      │
│  • enqueue hashed JS/CSS                                │
│  • localize vibeMartConfig (REST URL, nonce)            │
│  • NO marketplace business logic                        │
└───────────────────────────┬─────────────────────────────┘
                            │ REST
                            ▼
┌─────────────────────────────────────────────────────────┐
│  WordPress Plugin  (wordpress-plugin/vibe-mart/)        │
│  • Auth (WP users)                                      │
│  • Stalls / products tables (ready for Phase 2+)        │
│  • remove.bg proxy                                      │
│  • Settings (API key)                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Updated folder structure

```text
Vibe_Mart_stall/
│
├── frontend/                          # ONE React app (Vite)
│   ├── index.html
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── main.jsx                   # mounts #vibe-mart-root
│       ├── App.jsx                    # React Router shell
│       ├── App.css / index.css
│       ├── pages/                     # route shells (Home, Sell Smart, …)
│       ├── layouts/                   # MainLayout (header / nav / footer)
│       ├── components/
│       │   ├── StallGeneratorApp.jsx  # PRESERVED stall editor + preview
│       │   ├── MarketStall/           # PRESERVED overlay live preview
│       │   ├── StallEditorForm.jsx    # PRESERVED form + uploads
│       │   ├── ImageUploadField.jsx   # PRESERVED upload + remove.bg
│       │   └── …
│       ├── api/
│       │   └── removeBackground.js    # client → remove-bg endpoint
│       ├── services/                  # HTTP / auth / stall API clients
│       ├── context/                   # Auth + runtime config
│       ├── config/runtimeConfig.js
│       ├── hooks/ / utils/ / data/ / assets/ / styles/
│       └── layout/                    # legacy canvas helpers (unused by SPA)
│
├── wordpress-theme/vibe-mart/         # Theme = React loader only
│   ├── style.css
│   ├── functions.php
│   ├── index.php                      # SPA shell
│   ├── inc/
│   │   ├── setup.php
│   │   ├── assets.php                 # enqueue + vibeMartConfig
│   │   └── seo.php
│   └── assets/app/                    # filled by npm run build:wp
│
├── wordpress-plugin/vibe-mart/        # Backend only
│   ├── vibe-mart.php
│   ├── uninstall.php
│   ├── readme.txt
│   └── includes/
│       ├── settings.php
│       ├── database.php               # schema ready for Phase 2+
│       ├── rest-auth.php
│       ├── rest-stalls.php
│       └── rest-remove-bg.php         # PRESERVED remove.bg proxy
│
├── wordpress-plugin/vibe-stall-generator/   # legacy reference (old stall plugin)
├── dev-server/                        # local remove.bg for npm run dev
├── scripts/
│   ├── build-wordpress.mjs            # copy SPA → theme + zip packages
│   └── php-syntax-gate.mjs
├── dist-packages/                     # vibe-mart-theme.zip / vibe-mart-plugin.zip
├── package.json
├── ARCHITECTURE.md
└── PHASE1.md                          # this file
```

---

## Architectural changes (what moved where)

### Before
- Single Vite app at repo root (`src/`, `index.html`, `vite.config.js`)
- Stall UI mounted at `#stall-root`
- Optional WordPress stall plugin (`vibe-stall-generator`) that also enqueued React
- Vercel / local Node handler for remove.bg

### After (Phase 1)
1. **React lives in `frontend/`** — one app, one Vite config, React Router ready.
2. **Stall Generator is preserved**, not rewritten — extracted to
   `components/StallGeneratorApp.jsx` and shown on `/sell-smart`.
3. **Theme owns the frontend shell** — prints `#vibe-mart-root`, enqueues hashed
   assets from `assets/app/`, injects `window.vibeMartConfig`.
4. **Plugin owns backend** — REST namespace `vibe-mart/v1`, settings, DB tables,
   auth, remove.bg. No page layouts in the plugin.
5. **Service / API layers**
   - `src/api/` — background removal client (existing behavior)
   - `src/services/` — auth + stall REST clients (foundation for Phase 2+)
   - `src/context/` — runtime config + auth provider
6. **Build process**
   - `npm run dev` — Vite SPA + local remove.bg middleware
   - `npm run build:wp` — build SPA → copy into theme → zip theme + plugin

### Explicitly unchanged (behavior)
- Stall form fields and limits
- Live cart overlay preview (`MarketStall`)
- Image upload + remove.bg cutouts
- Local `.env` `REMOVE_BG_API_KEY` for Vite middleware

---

## Build commands

```bash
npm install
npm run dev          # local React at http://localhost:3000
npm run build:wp     # theme assets + dist-packages/*.zip
```

## WordPress install (foundation)

1. Activate **Vibe Mart Marketplace** plugin (`vibe-mart-plugin.zip`)
2. Activate **Vibe Mart** theme (`vibe-mart-theme.zip`)
3. Settings → Vibe Mart → remove.bg API key
4. Open the site — React loads; Sell Smart still runs the stall generator

---

## What Phase 1 does *not* claim

- Full marketplace UX (search quality, publish flow from Sell Smart → DB, trolley checkout)
- Replacing the legacy `vibe-stall-generator` plugin on every old site (kept for reference)
- Pixel redesign of the stall cart

Those belong in later phases, built on this foundation.

---

## Next phases (planned, not implemented here)

- **Phase 2** — Wire Sell Smart “submit/publish” to plugin stall APIs  
- **Phase 3** — Market listing / stall detail from published data  
- **Phase 4** — My Account stall CRUD end-to-end  
- **Phase 5** — Trolley / contact backends as needed  
