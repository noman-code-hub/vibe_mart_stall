# Vibe Mart — Stall Editor (Phase 1)

Local React preview of the vendor stall graphic, plus a small Express API that
proxies [remove.bg](https://www.remove.bg/) so the API key never reaches the browser.

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
PORT=3001
REMOVE_BG_API_KEY=your_remove_bg_api_key_here
MAX_UPLOAD_BYTES=10485760
```

`.env` is gitignored — never commit real keys.

## Run (frontend + API together)

```bash
npm run dev
```

- Web UI: http://localhost:3000  
- API: http://localhost:3001  
- Vite proxies `/api/*` → the Express server

### Run separately (optional)

```bash
npm run server   # Express on :3001
npm run client   # Vite on :3000
```

## Background removal

1. Open the stall editor.
2. Scroll to **Background removal**.
3. Choose an image → **Remove background**.
4. Preview the transparent PNG, **Download PNG**, or **Use on stall selfie**.

### API

`POST /api/remove-background`  
`multipart/form-data` field name: `image`

Success: `image/png` body  
Errors: JSON `{ "error": "...", "code": "..." }`

Health check: `GET /api/health`

### Quick curl test

```bash
curl -X POST http://localhost:3001/api/remove-background ^
  -F "image=@path\to\photo.jpg" ^
  --output cutout.png
```

## Security notes

- The remove.bg key lives only in server `.env`.
- Uploads are capped (default 10 MB), MIME-filtered (JPEG/PNG/WebP), rate-limited (30 / 15 min), and temp files are deleted after each request.
