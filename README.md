# Vibe Mart — Stall Editor (Phase 1)

Local React preview of the vendor stall graphic, with a Vercel Serverless
Function that proxies [remove.bg](https://www.remove.bg/) so the API key never
reaches the browser.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables and set your remove.bg key:

```bash
copy .env.example .env
```

Edit `.env`:

```
REMOVE_BG_API_KEY=your_remove_bg_api_key_here
MAX_UPLOAD_BYTES=10485760
```

`.env` is gitignored — never commit real keys.

For Vercel: Project **Settings → Environment Variables** → add `REMOVE_BG_API_KEY`, then redeploy.

## Run locally

```bash
npm run dev
```

- Web UI + API: http://localhost:3000  
- Network (same Wi‑Fi): http://YOUR_LAN_IP:3000  
- `/api/remove-background` is served by the same Vite process (same handler as Vercel)

## Background removal

Upload a selfie or product photo in the stall editor — backgrounds are removed
automatically via `POST /api/remove-background`.

### API

`POST /api/remove-background`  
`multipart/form-data` field name: `image`

Success: `image/png` body  
Errors: JSON `{ "error": "...", "code": "..." }`

### Quick curl test

```bash
curl -X POST http://localhost:3000/api/remove-background ^
  -F "image=@path\to\photo.jpg" ^
  --output cutout.png
```

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel (or `vercel`).
2. Set `REMOVE_BG_API_KEY` in Vercel environment variables.
3. Deploy — `api/remove-background.js` becomes the serverless endpoint.

## Security notes

- The remove.bg key lives only in server/env config (never in the client bundle).
- Uploads are capped (default 10 MB) and MIME-filtered (JPEG/PNG/WebP); temp files are deleted after each request.
