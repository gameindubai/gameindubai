# Deployment

## Prerequisites

```bash
pip install Pillow fonttools brotli --break-system-packages
npm install -g wrangler   # for CLI deploys; not needed for drag-and-drop
```

Python 3.10+ required. No other Python dependencies.

---

## Build

```bash
python3 build_site.py
```

This regenerates `./site/` entirely. Never edit files inside `./site/` directly — they're overwritten on every build.

The build script:
- Copies `src/static/` into `site/`
- Renders the pixel app icon (32×32 → 180/192/512/maskable-512 PNG)
- Copies and wraps the engine files into `site/kit/`
- Adds `?v=<hash>` to every asset URL for cache busting
- Generates `index.html`, `about/index.html`, `404.html`
- Generates `games/<id>/index.html` and `games/<id>/world.js` for each live game
- Generates standalone `previews/<id>.html` (single-file, for testing without a server)
- Generates `manifest.webmanifest`, `sw.js`, `_worker.js`, `_routes.json`, `_headers`, `robots.txt`, `sitemap.xml`

---

## Local Testing

```bash
cd site && python3 -m http.server 8765
# Open http://localhost:8765
# Boss shortcut: http://localhost:8765/games/fruit-rush/?wave=5&debug=1
```

The `previews/<id>.html` files are self-contained and don't need a server — open directly in a browser. Useful for quick game checks but the service worker and play counter won't work.

---

## Deploy (tests first, always)

**Only deploy through the gate.** It builds, runs the whole test suite, deploys only if everything passes, waits for Cloudflare's edge to serve the new build, then runs the live smoke tests.

```bash
export CLOUDFLARE_API_TOKEN=...      # Pages: Edit (+ D1: Edit only if you change the database)
python3 scripts/deploy.py
```

**Automatic (CI):** every push runs the suite on GitHub Actions (`.github/workflows/ci.yml`). Pushes to `main` also deploy, but only after the tests pass and only if the repository secret `CLOUDFLARE_API_TOKEN` is set (GitHub → Settings → Secrets and variables → Actions).

Don't drag-and-drop in the Cloudflare dashboard any more: that path skips every test.

## First-Time Cloudflare Setup (already done, documented for reference)

### 1. Create the Pages project
```bash
wrangler pages project create gameindubai --production-branch main
```

### 2. Create the D1 database
```bash
wrangler d1 create gameindubai
# Note the database UUID from the output
```

Or via API:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{"name":"gameindubai","primary_location_hint":"eeur"}'
```

### 3. Bind D1 to the Pages project
Via Cloudflare dashboard: Pages → gameindubai → Settings → Bindings → Add D1 database binding, name it **DB**.

Or via API:
```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/gameindubai" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data "{\"deployment_configs\":{\"production\":{\"d1_databases\":{\"DB\":{\"id\":\"$DB_UUID\"}}}}}"
```

The D1 table is created automatically on the first play — the `_worker.js` includes `CREATE TABLE IF NOT EXISTS` logic.

### 4. Add the custom domain
```bash
# Via Cloudflare API (the zone must already be on Cloudflare)
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/gameindubai/domains" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{"name":"gameindubai.com"}'
# Repeat for www.gameindubai.com
```

### 5. DNS records
```bash
# CNAME at zone root and www → gameindubai.pages.dev (proxied)
# These were created via API on the gameindubai.com zone
```

### 6. www → apex redirect
A Cloudflare Redirect Rule in the zone (not in Pages) handles `www.gameindubai.com → gameindubai.com` with a 301, preserving path and query string.

---

## Environment Variables / Secrets

| Variable | Where | Value |
|----------|-------|-------|
| `GA_ID` | `build_site.py` hardcoded | `G-1BHJTF5SVL` |
| `DB` binding | Cloudflare Pages | D1 database UUID |
| `CLOUDFLARE_API_TOKEN` | Your environment / CI | Roll after sharing |
| `CLOUDFLARE_ACCOUNT_ID` | Your environment / CI | `0517f7bca23475767878e5f4e6d85c35` |

**Security:** Roll Cloudflare API tokens after sharing them in any conversation. Tokens should have the minimum permissions needed:
- Pages: Edit
- D1: Edit  
- Zone (for DNS/redirects): Edit

---

## After a Deploy

1. The new `sw.js` is fetched immediately on page load (`.update()` is called in the page scripts)
2. The new service worker installs and activates, deleting the old cache version
3. The first page reload gets new HTML (network-first), which references new versioned assets
4. Old versioned assets remain cached but are no longer referenced

**Users don't need to do anything** — the fix arrives on the next reload. There is no "users stuck on old version" problem with the current network-first setup.

---

## Monitoring

- **GA4:** https://analytics.google.com → G-1BHJTF5SVL
  - Real-time: see active users per game page
  - Events → `game_start` → per game (filter by `game_id` custom dimension)
  - Events → `exception` → any JS errors in production
- **D1:** Cloudflare dashboard → Storage & Databases → D1 → gameindubai → Tables → games
- **Cloudflare Pages:** dash.cloudflare.com → Pages → gameindubai → Deployments (status, errors)
