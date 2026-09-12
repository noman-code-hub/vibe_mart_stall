# Vibe Mart Marketplace

Monorepo for the custom Vibe Mart website:

- **React SPA** (`frontend/`) — complete marketplace UI + preserved Stall Generator
- **WordPress theme** (`wordpress-theme/vibe-mart/`) — loads the React app only
- **WordPress plugin** (`wordpress-plugin/vibe-mart/`) — auth, stalls, products, remove.bg

## Quick start (local React)

```bash
npm install
copy frontend\.env.example frontend\.env   # set REMOVE_BG_API_KEY
npm run dev
```

Open http://localhost:3000

## Build WordPress packages

```bash
npm run build:wp
```

Creates:

- `dist-packages/vibe-mart-theme.zip`
- `dist-packages/vibe-mart-plugin.zip`
- Populates `wordpress-theme/vibe-mart/assets/app/`

## Deploy to WordPress

1. Upload and activate **vibe-mart-plugin.zip**
2. Install the theme — copy `wordpress-theme/vibe-mart/` to `wp-content/themes/`
   over FTP, since the zip is ~70 MB and usually exceeds host upload limits
3. Settings → Permalinks → **Post name** (React Router needs pretty permalinks)
4. Vibe Mart → Settings → paste remove.bg API key  
   (or `define('VIBE_MART_REMOVE_BG_API_KEY', '...');` in wp-config.php)
5. Configure SMTP — signup requires a working confirmation email
6. Visit the site — React Router handles `/`, `/sell-smart`, `/market`, etc.

Full instructions, checklist and troubleshooting: [WORDPRESS.md](WORDPRESS.md)

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for folder structure, database schema, REST map, and migration notes.

The legacy stall-only plugin remains under `wordpress-plugin/vibe-stall-generator/` for reference; new deployments should use `vibe-mart`.
