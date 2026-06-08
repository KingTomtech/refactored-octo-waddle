# MovieBox

A cinematic streaming-discovery front-end that pairs **TMDB** (for metadata, artwork, cast, trailers) with a reverse-engineered **MovieBox** backend (for actual playback URLs), wrapped in a polished dark UI built on Next.js 14.

> **Disclaimer.** This is a technical demonstration. Content belongs to the original creators. No media is hosted, scraped, transcoded, or stored by this project. The MovieBox client is a thin proxy over public community endpoints; the upstream service can disappear at any time. The TMDB API is used under their [terms of use](https://www.themoviedb.org/documentation/api/terms-of-use). Use at your own risk and only in jurisdictions where it is legal to do so.

---

## What it is

Three components, one app:

1. **Cloudflare Worker** (`moviebox-worker.js`) — a vanilla-JS proxy that fetches MovieBox catalogue data, normalises quality labels, and exposes a stable JSON API with CORS, KV caching, and a health/probe surface.
2. **Next.js 14 front-end** (`frontend/`) — the App Router + React Query + Tailwind + Vidstack UI you actually see in the browser.
3. **TMDB** (third-party) — the metadata backbone. Imaged, searched, and enriched entirely from the client (the Worker has no TMDB key).

The data flow is **TMDB-id → resolver → Worker-id → Worker stream endpoint → in-browser player**. Resolver logic lives in `frontend/lib/match.ts`; it uses title similarity + year matching and caches the mapping in `localStorage` so a title only ever round-trips once.

---

## Architecture

```
            ┌────────────────────────────────────────────────────────────┐
            │                        Browser                            │
            │                                                            │
            │  Next.js App ──► React Query ──► TMDB API  (search/details)│
            │       │                              ▲                    │
            │       │                              │                    │
            │       ▼                              │                    │
            │  useIDMatch() ─► Worker /api/... ────┘                    │
            │       │                                                   │
            │       ▼                                                   │
            │  useStream() ─► Worker /api/stream ─► Vidstack/Plyr/hls.js│
            └────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │   Cloudflare Worker      │
                              │   (moviebox-worker.js)   │
                              │   • /api/* proxy         │
                              │   • KV cache + dedup     │
                              │   • /api/health, /probe  │
                              └──────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │   MovieBox community API │
                              │   (moviebox-api upstream)│
                              └──────────────────────────┘
```

---

## Repository layout

```
movieboc/
├── moviebox-worker.js        # Cloudflare Worker (vanilla JS, ES modules)
├── wrangler.toml             # Worker config (KV bindings, observability)
├── moviebox-claude-code-prompt.md   # Original spec
└── frontend/
    ├── app/                  # Next.js 14 App Router
    │   ├── layout.tsx        # SiteHeader + BackendStatus + footer
    │   ├── page.tsx          # Home (HeroSlider + 5 rows)
    │   ├── search/           # Dual TMDB + Worker search
    │   ├── browse/           # Discover with genre/sort filters
    │   ├── movie/[id]/       # Movie detail + StreamModal
    │   └── series/[id]/      # TV detail + EpisodePicker
    ├── components/           # 11 components (cards, player, modals, …)
    ├── hooks/                # React Query hooks
    ├── lib/                  # tmdb, api, match, srt-to-vtt, utils, types
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    └── .env.local            # TMDB key, Worker URL (not committed)
```

---

## Quick start

### 1. Deploy the Worker

```bash
# from the repo root
wrangler kv:namespace create CACHE
wrangler kv:namespace create WORKER_STATE
# paste the returned ids into wrangler.toml
wrangler deploy
```

Confirm the Worker is alive:

```bash
curl https://moviebox-worker.<your-subdomain>.workers.dev/api/health
curl https://moviebox-worker.<your-subdomain>.workers.dev/api/probe
```

### 2. Run the front-end

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then fill in values
npm run dev
```

Open <http://localhost:3000>.

### 3. Production build

```bash
cd frontend
npm run build
npm start
```

`npx next build` should print all six routes — `/`, `/search`, `/browse`, `/movie/[id]`, `/series/[id]`, `/_not-found` — with no type errors.

---

## TMDB setup

The TMDB key is **client-side only**. The Worker never sees it.

1. Create a free account at <https://www.themoviedb.org/signup>.
2. Request an API v3 key from <https://www.themoviedb.org/settings/api>.
3. Put it in `frontend/.env.local`:

   ```ini
   NEXT_PUBLIC_TMDB_KEY=your_tmdb_v3_key
   NEXT_PUBLIC_TMDB_BASE=https://api.themoviedb.org/3
   NEXT_PUBLIC_TMDB_IMG=https://image.tmdb.org/t/p
   NEXT_PUBLIC_WORKER_URL=https://moviebox-worker.<your-subdomain>.workers.dev
   ```

4. (Optional) Verify the key works:
   `curl "https://api.themoviedb.org/3/trending/all/day?api_key=$NEXT_PUBLIC_TMDB_KEY"`

If the key is missing, the front-end still renders, but every TMDB-backed view shows an error and a “Could not load” message.

---

## API reference

All routes are mounted under `/api` and return JSON of the shape `{ ok: true, data: ... }` on success or `{ ok: false, error: { code, message } }` on failure. CORS is open (`Access-Control-Allow-Origin: *`); every response carries `X-Response-Source: worker|upstream|cache`.

| Route                         | Description                                              |
|------------------------------ |----------------------------------------------------------|
| `GET /api/health`             | Worker self-report (uptime, cache hit-rate, last good upstream call) |
| `GET /api/probe`              | Round-trips 3 backends (primary, web, deeplink) and returns per-backend latency + status |
| `GET /api/search?q=&page=`    | TMDB-aware title search through the MovieBox catalogue    |
| `GET /api/details/:id`        | MovieBox details for a single id (used by resolver)      |
| `GET /api/stream?id=&q=`      | Playable sources for a title, with quality and subtitles |
| `GET /api/episode?season=&ep=`| Episode stream for a series                               |
| `GET /api/subtitle?id=&lang=` | SRT subtitle URL (the front-end converts SRT → VTT in-browser) |
| `GET /api/homepage?page=`     | MovieBox home page (hero, trending tiles)                |
| `GET /api/trending`           | Trending tiles                                           |

**Quality labels** are normalised by the Worker: `4K`/`UHD`/`2160` → `4k`, `FHD`/`1080` → `1080p`, `HD`/`720` → `720p`, `SD`/`480` → `480p`, plus the always-present `best` and `worst` aliases.

---

## Player

The in-browser player is a four-layer fallback chain (`frontend/components/StreamModal.tsx`):

1. **Vidstack** — preferred; HLS-aware, custom skin, keyboard shortcuts.
2. **Plyr** — drops in if Vidstack errors.
3. **hls.js + native `<video>`** — drops in if Plyr errors (Safari uses native HLS, Chrome/Firefox use hls.js).
4. **Raw URL fallback** — if all three fail, the user gets the stream URL with copy-to-clipboard and `vlc://` / `iina://weblink?url=` deep links so they can finish playback in an external player.

**Subtitles:** SRT is converted to WebVTT in the browser (`frontend/lib/srt-to-vtt.ts`) and exposed as a `Blob` URL so the `<track>` element can consume it without any network round-trip.

---

## Caching

| Surface            | TTL    | Stored in         |
|--------------------|--------|-------------------|
| Search results     | 600 s  | Worker KV (`CACHE`) |
| Title details      | 1800 s | Worker KV (`CACHE`) |
| Stream resolutions | 1800 s | Worker KV (`CACHE`) |
| Trending / homepage| 300 s  | Worker KV (`CACHE`) |
| TMDB ↔ Worker id   | Forever| `localStorage` (`tmdb:movie:…`, `tmdb:tv:…`) |

Worker KV keys include a route prefix (`search:`, `details:`, `stream:`) and a SHA-style hash of the input. A request-deduplication `Map` collapses concurrent identical requests inside the same isolate lifetime so a hot title never fans out into 50 simultaneous upstream calls.

---

## Environment variables

| Variable                      | Where   | Notes                                        |
|-------------------------------|---------|----------------------------------------------|
| `NEXT_PUBLIC_TMDB_KEY`        | Frontend| Required for all metadata, search, posters   |
| `NEXT_PUBLIC_TMDB_BASE`       | Frontend| TMDB v3 base URL                             |
| `NEXT_PUBLIC_TMDB_IMG`        | Frontend| TMDB image CDN base                          |
| `NEXT_PUBLIC_WORKER_URL`      | Frontend| Public URL of the deployed Worker            |
| `CACHE` (KV)                  | Worker  | `wrangler kv:namespace create CACHE`         |
| `WORKER_STATE` (KV)           | Worker  | `wrangler kv:namespace create WORKER_STATE`  |

The Worker has **no TMDB dependency and no API keys** — keeping the attack surface minimal and the deployment free.

---

## Free / open-source resources used

- **[TMDB](https://www.themoviedb.org/)** — metadata, posters, backdrops, cast, videos, watch providers. Free for non-commercial use under their TOS.
- **[Vidstack](https://www.vidstack.io/)** — primary video player framework.
- **[Plyr](https://plyr.io/)** — fallback player.
- **[hls.js](https://github.com/video-dev/hls.js)** — HLS playback on browsers that lack native support.
- **[Next.js](https://nextjs.org/)** 14.2 — App Router, RSC, streaming.
- **[React Query](https://tanstack.com/query/latest)** 5 — data fetching, caching, infinite queries.
- **[Tailwind CSS](https://tailwindcss.com/)** 3.4 — utility-first styling.
- **[Framer Motion](https://www.framer.com/motion/)** — hero, modal, and row animations.
- **[lucide-react](https://lucide.dev/)** — icon set.
- **[Vercel Geist + Bebas Neue + DM Sans](https://vercel.com/font)** — type system (loaded via `next/font/google`).
- **Cloudflare Workers + KV** — the runtime.

---

## Known limitations

- **No transcoding.** Whatever the upstream returns is what you get. If a source is HLS and your browser is missing hls.js, only the VLC/IINA fallback will work.
- **Resolver is best-effort.** The TMDB ↔ Worker id mapper uses title + year. Confusingly-named sequels, foreign-language variants, and re-releases can mismatch. The matched title and confidence are surfaced in the UI so you can tell when it’s wrong.
- **Subtitles are SRT-only.** The Worker hands back `.srt` URLs; the front-end transcodes them to WebVTT. If the upstream starts serving `.ass` or `.vtt` natively, the in-browser transcoder will simply skip the conversion.
- **No download manager.** The “Download” button opens the raw stream URL in a new tab or hands it to the browser. Multi-segment HLS downloads won’t work without server-side muxing.
- **MovieBox is a moving target.** Endpoints and signing headers can change. If a route 502s, run `curl $WORKER/api/probe` to find which backend is down.
- **No DRM.** Widevine/PlayReady are not in scope; if the upstream ever serves protected streams, they will silently fail.

---

## Local development tips

- The backend status pill in the header reflects the live state of the Worker. Click it to see the three backends’ latency and last success.
- The front-end React Query Devtools are enabled in dev — open the small floating icon in the corner to inspect cache state.
- A `Cache-Control: no-store` header from your browser dev tools will let you bypass the front-end’s localStorage id cache if you’re debugging the resolver.
- To wipe everything: clear site data + `wrangler kv:bulk delete` both namespaces.

---

## License

This project is a technical demonstration. It is **not** affiliated with, endorsed by, or sponsored by MovieBox, TMDB, Cloudflare, or any of the other services mentioned. All trademarks belong to their respective owners.

Use of this code must comply with every upstream service’s terms of use and the laws of your jurisdiction.
