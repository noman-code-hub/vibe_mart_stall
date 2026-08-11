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
2. Upload and activate **vibe-mart-theme.zip**
3. Settings → Vibe Mart → paste remove.bg API key  
   (or `define('VIBE_MART_REMOVE_BG_API_KEY', '...');` in wp-config.php)
4. Visit the site — React Router handles `/`, `/sell-smart`, `/market`, etc.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for folder structure, database schema, REST map, and migration notes.

The legacy stall-only plugin remains under `wordpress-plugin/vibe-stall-generator/` for reference; new deployments should use `vibe-mart`.
