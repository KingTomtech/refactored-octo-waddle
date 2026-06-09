# DPTV — Maximum Effort Streaming

A self-hosted streaming front-end (formerly **MovieBox**) that pairs a
reverse-engineered backend proxy with a polished dark UI on Next.js 14.
Branded "DPTV" with a Deadpool-inspired accent palette and maximalist
copy.

> **Disclaimer.** This is a technical demonstration. The MovieBox backend
> is a community-run, mobile-first service that ships no public API
> contract. Endpoints, signing headers, and host rotation in this
> project are reverse-engineered from the Android APK and may break at
> any time. No media is hosted, scraped, transcoded, or stored by this
> project. The upstream service can disappear at any time. Use at your
> own risk and only in jurisdictions where it is legal to do so.

---

## What it is

Two components, one app:

1. **Cloudflare Worker** (`moviebox-worker.js`) — a single-file vanilla-JS
   proxy that signs requests to the MovieBox community backend, rotates
   hosts, deduplicates in-flight calls, caches responses in Cloudflare
   KV, and exposes a stable JSON API. ~1.7k lines, zero npm dependencies.
2. **Next.js 14 front-end** (`frontend/`) — App Router + React Query +
   Tailwind + a custom video player that handles DASH (HEVC + H.264),
   HLS, and progressive MP4 with a hand-rolled four-layer fallback chain.

There is **no TMDB dependency** in the current build — the Worker is the
sole data source for metadata, playback, search, recommendations, and
downloads. The previous TMDB-based resolver layer has been removed.

---

## Feature surface

### Front-end pages

| Route                  | Purpose                                                                                  |
|------------------------|------------------------------------------------------------------------------------------|
| `/`                    | Hero slider + trending row + Top 5 + recommendations + new sections (see below)         |
| `/search?q=…`          | Dual search: suggestions dropdown + results grid (worker-backed)                        |
| `/browse`              | Discover with genre and sort filters                                                    |
| `/movie/[id]`          | Movie detail, cast/crew, recommendations, watch in modal                                 |
| `/series/[id]`         | TV series detail with season/episode picker, episode rail, recommendations                |
| `/shorts`              | TikTok-style short-form video feed (trending + favorites tabs)                           |
| `/shorts/[id]`         | Single short detail with embedded player + "more episodes" rail                          |
| `/staff/[id]`          | Cast/crew profile with bio, filmography, and related titles                              |
| `/downloads`           | Lookup form — paste a subject ID, get all downloadable resources with direct URLs        |

### Homepage sections (new)

Surfaced above the existing rows on `/`:

- **Daily Picks** — `POST /api/daily-movie-rec` (curated by upstream)
- **Widget** — `POST /api/widget` (from your watchlist, personalised)
- **Playlists** — `GET /api/playlist/content?id=…` (editor-curated lists)
- **Trending** — `GET /api/trending` (English-only filtered)
- **Top 5** — `GET /api/top-rec`
- **Detail recs** — `GET /api/detail-rec` (on detail pages)

### Player

The in-browser player (`frontend/components/StreamPlayer.tsx` +
`StreamModal.tsx`) is a hand-rolled four-layer fallback chain:

1. **dash.js + hevc.js WASM transcoder** — primary path for HEVC DASH.
   The transcoder transcodes HEVC → H.264 in a Web Worker so the stream
   plays on Chrome/Firefox where native HEVC is unavailable.
2. **dash.js only** — used on Safari/macOS and Edge/Windows (with HEVC
   extension) where the browser decodes HEVC natively.
3. **hls.js + native `<video>`** — used when the source is HLS rather
   than DASH.
4. **External player deep links** — VLC (`vlc://`), IINA
   (`iina://weblink?url=`), and a copy-URL button. `mpv` instructions
   are baked into the "Stream info" panel.

If everything fails, the modal shows a clear "HEVC playback not
available — no luck, chimichangas" state with the action bar always
visible.

### Subtitles

SRT is converted to WebVTT in the browser (`frontend/lib/srt-to-vtt.ts`)
and exposed as a `Blob` URL so the `<track>` element can consume it
without any network round-trip. The language selector is
worker-backed via `GET /api/stream-captions`.

### DASH streaming proxy

The Worker proxies every DASH segment (`/api/proxy?token=…`) with
injected `Referer`, `Origin`, and CloudFront signed cookies so the
browser never has to do cookie management. The MPD manifest is
**rewritten** so that `BaseURL`, `$RepresentationID$`, and
`$Number%05d$` template tokens resolve against the proxy origin (not
the upstream CDN). This is the only reliable way to play these
streams in a browser without a service-worker.

### Download / Share

The `/downloads` page accepts a subject ID and lists every downloadable
resource variant (resolution, format, size, season/episode). Click
"Open Stream" to play, or use the **Info** button to download a `.txt`
with the proxy URL + cookies + ready-to-paste `mpv` / `ffplay` /
`curl` commands.

---

## Architecture

```
            ┌────────────────────────────────────────────────────────────┐
            │                        Browser                            │
            │                                                            │
            │  Next.js App ──► React Query ──► Worker /api/* (JSON)     │
            │       │                                ▲                  │
            │       │                                │                  │
            │       ▼                                │                  │
            │  StreamPlayer ─► Worker /api/stream ───┘                  │
            │       │                                                   │
            │       ▼                                                   │
            │  <video> ─► Worker /api/proxy (MPD + segments + cookies)  │
            │                                                            │
            │  hevc.js transcoder (Web Worker) for HEVC → H.264          │
            └────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │   Cloudflare Worker      │
                              │   moviebox-worker.js     │
                              │   • HMAC-MD5 signing     │
                              │   • 4-host pool rotation │
                              │   • KV cache + dedup     │
                              │   • Time-sync (GW.4410)  │
                              │   • /api/proxy cookie    │
                              │     injection + MPD      │
                              │     rewrite              │
                              │   • English-only filter  │
                              └──────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │   MovieBox community API │
                              │   api5/6.aoneroom.com    │
                              └──────────────────────────┘
```

The full reverse-engineering surface (40+ endpoints, signing protocol,
data model, network layer) is documented in `APK-CLASSES.md` and
`APK_FEATURE_MAP.md`.

---

## Repository layout

```
movieboc/
├── moviebox-worker.js          # Cloudflare Worker (v5.1.0, vanilla JS)
├── wrangler.toml               # Worker config (KV bindings, observability)
├── README.md                   # you are here
├── APK-ANALYSIS.md             # first-pass APK notes
├── APK-CLASSES.md              # full decompiled class index (24k classes)
├── APK_FEATURE_MAP.md          # 40+ upstream endpoints mapped to worker routes
├── base.apk                    # the original Android APK (decompiled)
├── apk-decoded/                # jadx output
└── frontend/
    ├── app/                    # Next.js 14 App Router
    │   ├── layout.tsx          # SiteHeader + BackendStatus + footer
    │   ├── page.tsx            # Home (hero + 8+ rows incl. new sections)
    │   ├── search/             # Worker search w/ suggestion dropdown
    │   ├── browse/             # Discover with genre/sort filters
    │   ├── movie/[id]/         # Movie detail + StreamModal
    │   ├── series/[id]/        # TV detail + EpisodePicker
    │   ├── shorts/             # Short-form feed + detail
    │   ├── staff/[id]/         # Cast/crew profile
    │   └── downloads/          # Resource list lookup
    ├── components/             # 20+ components
    │   ├── StreamPlayer.tsx    # DASH/HLS/MP4 player w/ hevc.js transcoder
    │   ├── StreamModal.tsx     # Player modal + custom controls + deep links
    │   ├── HeroSlider.tsx
    │   ├── MediaCard.tsx
    │   ├── MediaRow.tsx
    │   ├── MediaSlider.tsx
    │   ├── EpisodePicker.tsx
    │   ├── SearchBar.tsx       # Debounced suggestions dropdown
    │   ├── BottomNav.tsx       # Mobile bottom nav (Home / Shorts / Search)
    │   ├── TrendingSection.tsx
    │   ├── TopRecSection.tsx
    │   ├── DetailRecSection.tsx
    │   ├── DailyPicksSection.tsx
    │   ├── WidgetSection.tsx
    │   ├── PlaylistSection.tsx
    │   ├── ShortCard.tsx
    │   ├── CastRow.tsx
    │   ├── QualitySelector.tsx
    │   ├── SubtitleSelector.tsx
    │   ├── DownloadButton.tsx
    │   ├── BackendStatus.tsx
    │   └── SiteHeader.tsx
    ├── hooks/                  # React Query hooks
    │   ├── useSearch.ts        # 30+ worker-backed hooks
    │   ├── useStream.ts        # stream URL + cookie + quality negotiation
    │   └── useScript.ts        # UMD script loader
    ├── lib/                    # api (worker client + normalisers), types,
    │                          # utils (quality, deep-link, format helpers),
    │                          # srt-to-vtt (in-browser subtitle conversion)
    ├── public/vendor/          # dashjs.min.js, hls.min.js, hevcjs-plugin.umd.js,
    │                          # hevc/transcode-worker.js, hevc/wasm/hevc-decode.js
    ├── package.json
    ├── next.config.mjs
    └── tailwind.config.ts
```

---

## Quick start

### 1. Deploy the Worker

The Worker is a single file with no npm dependencies.

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
curl https://moviebox-worker.<your-subdomain>.workers.dev/
# → { ok: true, name: "moviebox-worker", version: "5.1.0", routes: [...] }
```

### 2. Run the front-end

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then fill in values (see below)
npm run dev
```

Open <http://localhost:3000>.

### 3. Production build

```bash
cd frontend
npm run build
npm start
```

`npx next build` should print all routes with no type errors.

---

## Environment variables

All frontend env vars are public (`NEXT_PUBLIC_*`) — no secrets on the
client. The Worker has zero environment variables; everything is
hard-coded in `moviebox-worker.js`.

| Variable                 | Where    | Required | Notes                                          |
|--------------------------|----------|----------|------------------------------------------------|
| `NEXT_PUBLIC_WORKER_URL` | Frontend | Yes      | Public URL of the deployed Worker              |
| `WORKER_STATE` (KV)      | Worker   | Yes      | `wrangler kv:namespace create WORKER_STATE`    |
| `CACHE` (KV)             | Worker   | Yes      | `wrangler kv:namespace create CACHE`           |

`.env.local` example:

```ini
NEXT_PUBLIC_WORKER_URL=https://moviebox-worker.<your-subdomain>.workers.dev
```

---

## API reference

All routes are mounted under `/api` and return JSON of the shape
`{ ok: true, data: ... }` on success or `{ ok: false, error: { code, message } }`
on failure. CORS is open (`Access-Control-Allow-Origin: *`); every
response carries `X-Response-Source: origin|cache|fallback`.

### Core

| Route                              | Method | Description                                            |
|------------------------------------|--------|--------------------------------------------------------|
| `/api/health`                      | GET    | Worker self-report                                     |
| `/api/probe`                       | GET    | Round-trips 3 backends, returns per-host latency       |
| `/api/search?q=&page=`             | GET    | Subject search                                         |
| `/api/search/v2`                   | POST   | Search v2 (more fields)                                |
| `/api/search-rank`                 | POST   | Ranked search results                                  |
| `/api/details?id=`                 | GET    | Single subject details                                 |
| `/api/play-info?id=`               | GET    | Playback metadata (qualities, formats, captions)       |
| `/api/season-info?id=&season=`     | GET    | TV season listing                                      |
| `/api/stream?id=&quality=&season=&episode=` | GET | Playable source(s) + signed CloudFront cookies         |
| `/api/episode?id=&season=&episode=`| GET    | Single episode sources                                 |
| `/api/subtitle?id=&lang=`          | GET    | Subtitle SRT URL                                       |
| `/api/stream-captions?id=&season=&episode=` | GET | All available captions for an episode         |
| `/api/proxy?token=…`               | GET    | DASH manifest + segment proxy with cookie injection    |
| `/api/mirrors`                     | GET    | List of available upstream hosts                       |

### Discovery

| Route                              | Method | Description                                            |
|------------------------------------|--------|--------------------------------------------------------|
| `/api/homepage`                    | GET    | Curated home content (English-only)                    |
| `/api/trending`                    | GET    | Trending tiles (English-only)                          |
| `/api/trending/v2`                 | POST   | Trending v2                                            |
| `/api/popular`                     | GET    | Popular (alias for trending)                           |
| `/api/bottom-tab`                  | POST   | Bottom navigation categories                           |
| `/api/detail-rec?id=`              | GET    | Recommendations for a subject                          |
| `/api/top-rec`                     | POST   | Top-5 recommendations                                  |
| `/api/play-related-rec?id=`        | GET    | "More like this you played"                            |
| `/api/want-to-see?id=`             | GET    | Marked as want-to-see                                  |
| `/api/have-seen?id=`               | GET    | Marked as already seen                                 |
| `/api/dub-info?id=`                | GET    | Available dubs for a subject                           |
| `/api/filter-items`                | POST   | Genre/year/quality filter                              |
| `/api/list?id=`                    | GET    | Curated list contents                                  |
| `/api/daily-movie-rec`             | POST   | Daily picks (curated)                                  |
| `/api/widget`                      | POST   | Personalised "for you" widget                          |
| `/api/playlist/content?id=`        | GET    | Playlist contents                                      |
| `/api/search-suggest?keyword=`     | GET    | Inline search suggestions                              |

### Shorts (TikTok-style)

| Route                              | Method | Description                                            |
|------------------------------------|--------|--------------------------------------------------------|
| `/api/shorts/most-trending`        | POST   | Trending short-form videos                             |
| `/api/shorts/favorite-list`        | GET    | User-favourited shorts (when auth is wired)           |
| `/api/shorts/get-info?id=`         | GET    | Single short detail                                    |
| `/api/shorts/mini-list?id=&page=&size=` | GET | Mini-list rail of related shorts                 |

### Cast & crew

| Route                              | Method | Description                                            |
|------------------------------------|--------|--------------------------------------------------------|
| `/api/staff-info?id=`              | GET    | Cast/crew profile (bio, filmography)                   |
| `/api/staff-related?id=`           | GET    | Related cast/crew                                      |

---

## Content filtering

The Worker applies a **whitelist English-only filter** to all
subject-listing endpoints (`/api/trending`, `/api/trending/v2`,
`/api/homepage`). Items are dropped if their upstream `corner` field
matches one of the non-English regional languages (Hindi, Tamil, Telugu,
Malayalam, Kannada, Bengali, Marathi, Punjabi, Gujarati, Urdu, Spanish,
Portuguese, French, German, Italian, Korean Dubbed, Japanese, Chinese,
Thai, Vietnamese, Indonesian, Russian, Turkish, Arabic).

Items with **empty** `corner` (the upstream default for global English
content) are kept. Items with `corner === "English"` are kept.

The blocklist is one constant in `moviebox-worker.js`:

```js
const NON_ENGLISH_CORNERS = new Set([
  "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Bengali",
  "Marathi", "Punjabi", "Gujarati", "Urdu",
  "Spanish", "Portuguese", "French", "German", "Italian",
  "Korean Dubbed", "Korean Dub",
  "Japanese", "Chinese", "Thai", "Vietnamese", "Indonesian",
  "Russian", "Turkish", "Arabic",
]);

function isEnglishItem(item) {
  const corner = (item.corner || "").toString().trim();
  if (!corner) return true;            // untagged = global English
  if (corner === "English") return true;
  return !NON_ENGLISH_CORNERS.has(corner);
}
```

Cache keys are versioned (`trending:v3:en:…`, `homepage:v3:en`,
`trendingV2:v2:en:…`) so updating the filter takes effect immediately
on the next deploy without waiting for the old entries to expire.

---

## Signing & security

### Worker ↔ upstream

The Worker signs every request to the MovieBox community backend using
**HMAC-MD5** over `(method, accept, content-type, path, query, body, ts)`
with a base64 key derived from the upstream's public app constants
(`key1`, `key2`, `key3`). The signature is sent as
`x-client-token`, `x-request-ts`, `x-ts`, `x-signature` headers
(currently). The signing function is `xTrSignature` in
`moviebox-worker.js`.

The Worker also handles:
- **4-host rotation** (`api5` / `api6` / `web` / `deeplink`) with
  per-request fallback if a host is down.
- **GW.4410 time-sync** — the upstream requires a "GW.4410" header
  that is set only when the Worker's clock is within ±N seconds of the
  upstream's clock. We periodically call `/api/health` to sync.
- **407 alt-key retry** — if the upstream responds with HTTP 407
  ("x-client-token expired"), we rotate to the alt key and retry once.

### Frontend ↔ worker

The Worker serves CORS=* and is read-only — it has no auth, no writes,
no PII. The frontend is fully client-side; no auth tokens are
persisted.

### Frontend ↔ DASH CDN

The browser never holds CloudFront cookies. The Worker
**stashes a short-lived token** (`stashProxy` writes an entry to
`WORKER_STATE` KV with the resolved cookies + manifest URL) and the
browser fetches `/api/proxy?token=…` for every manifest and segment.
The proxy injects the cookies server-side, then streams the bytes
back. This means the cookies never appear in the browser's cookie
jar, DevTools, or extension storage.

### DASH MPD rewrite

The MovieBox MPDs reference segments by template
(`$RepresentationID$/$Number%05d$.m4s`) and a relative `BaseURL`
pointing at the CloudFront CDN. Browsers resolve the template tokens
against the BaseURL's **origin** (not the proxy), so a raw
`/api/proxy?url=…` strategy fails for segment playback. The Worker
rewrites the MPD to:

1. Set `<BaseURL>https://worker.example.com/api/proxy?token=…&path=…</BaseURL>`.
2. Ensure segment template tokens resolve against the proxy origin
   (so `$Number%05d$.m4s` becomes
   `…/api/proxy?token=…&path=…/seg-00001.m4s`).

This is the only known reliable way to play these streams in a
browser.

---

## HEVC transcoding

Every MovieBox stream is encoded in HEVC (`hev1` / `hvc1`). Chrome and
Firefox cannot decode HEVC natively. The front-end uses
**[@hevcjs/dashjs-plugin](https://github.com/anars/blank-audio/tree/master/packages/dashjs-plugin)**
to attach a WASM transcoder to dash.js that converts HEVC → H.264
in a Web Worker at runtime.

- Native-HEVC browsers (Safari, Edge with HEVC extension) skip the
  transcoder and play HEVC directly.
- Non-native browsers (Chrome, Firefox) wait for the WASM module to
  finish loading **before** dash.js initialises — otherwise dash.js
  rejects the HEVC Representations and produces audio-only playback.

The WASM glue (`/vendor/hevc/hevc-decode.js`, 45 KB) and binary
(`/vendor/hevc/wasm/hevc-decode.wasm`, 280 KB) are served from the
front-end's `public/` directory and consumed by the transcoder Web
Worker via `importScripts()`.

A 10-second watchdog in the StreamPlayer falls back to the
external-player panel if no playable tracks appear after dash.js
init (covers the case where the transcoder fails to initialise
silently).

---

## Caching

| Surface                   | TTL    | Stored in                |
|---------------------------|--------|--------------------------|
| Search results            | 300 s  | Worker KV (`CACHE`)      |
| Title details             | 1800 s | Worker KV (`CACHE`)      |
| Play info / season info   | 1800 s | Worker KV (`CACHE`)      |
| Trending / homepage       | 300 s  | Worker KV (`CACHE`)      |
| Shorts                    | 600 s  | Worker KV (`CACHE`)      |
| Widget / daily recs       | 600/1800 s | Worker KV (`CACHE`) |
| Playlist content          | 3600 s | Worker KV (`CACHE`)      |
| Staff info                | 86400 s| Worker KV (`CACHE`)      |
| Proxy tokens              | 1500 s | Worker KV (`WORKER_STATE`) |
| TMDB ↔ Worker id (legacy) | Forever| `localStorage`           |

A request-deduplication `Map` collapses concurrent identical requests
inside the same isolate lifetime, so a hot title never fans out into
50 simultaneous upstream calls.

Cache keys are versioned (`…:v3:en:…`) so updates to filters take
effect on the next deploy without waiting for old entries to expire.

---

## Local development tips

- The **backend status pill** in the header reflects the live state of
  the Worker. Click it to see each backend host's latency and last
  success.
- The **React Query Devtools** are enabled in dev — open the small
  floating icon in the corner to inspect cache state.
- A `Cache-Control: no-store` header from your browser dev tools
  lets you bypass the front-end's localStorage id cache if you're
  debugging.
- To wipe everything: clear site data + `wrangler kv:bulk delete`
  both namespaces.

---

## Known limitations

- **No transcoding (server-side).** The HEVC transcoding is purely
  client-side, in a Web Worker. It is slow and CPU-intensive; for
  long-form content on a low-end laptop, expect to use the VLC / IINA
  / mpv fallback.
- **No DRM.** Widevine / PlayReady are not in scope; if the upstream
  ever serves protected streams, they will silently fail.
- **The MovieBox backend is a moving target.** Endpoints and signing
  headers can change. If a route 502s, run
  `curl $WORKER/api/probe` to find which host is down.
- **The four-host pool is small.** When all four are down, the Worker
  returns a `degraded: true` response so the front-end can show a
  graceful fallback.
- **CORS is open.** Anyone can hit the Worker. The data is public and
  the Worker has no secrets, but if you self-host, put it behind a
  custom domain with a Cloudflare WAF rule.
- **Subtitles are SRT-only.** The Worker hands back `.srt` URLs; the
  front-end transcodes them to WebVTT. If the upstream starts serving
  `.ass` or `.vtt` natively, the in-browser transcoder will skip the
  conversion.

---

## Free / open-source resources used

- **[@hevcjs/dashjs-plugin](https://www.npmjs.com/package/@hevcjs/dashjs-plugin)** —
  HEVC → H.264 transcoder Web Worker for dash.js.
- **[dash.js](https://github.com/Dash-Industry-Forum/dash.js)** — DASH
  reference player.
- **[hls.js](https://github.com/video-dev/hls.js)** — HLS playback on
  browsers that lack native support.
- **[Next.js](https://nextjs.org/)** 14.2 — App Router, RSC, streaming.
- **[React Query](https://tanstack.com/query/latest)** 5 — data
  fetching, caching, infinite queries.
- **[Tailwind CSS](https://tailwindcss.com/)** 3.4 — utility-first
  styling.
- **[Framer Motion](https://www.framer.com/motion/)** — hero, modal,
  and row animations.
- **[lucide-react](https://lucide.dev/)** — icon set.
- **Cloudflare Workers + KV** — the runtime.
- **Cloudflare CDN + signed cookies** — the upstream media origin.

---

## License

This project is a technical demonstration. It is **not** affiliated
with, endorsed by, or sponsored by MovieBox, TMDB, Cloudflare, or any
of the other services mentioned. All trademarks belong to their
respective owners.

Use of this code must comply with every upstream service's terms of
use and the laws of your jurisdiction.
