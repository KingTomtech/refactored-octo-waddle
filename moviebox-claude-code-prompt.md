# MovieBox — Full-Stack Streaming App: Enhanced Claude Code Prompt

> Paste this entire document into Claude Code. It supersedes the previous prompt and integrates TMDB, free video players, and additional open-source resources throughout.

---

## Project Overview

Build a complete MovieBox streaming discovery app that combines:

- A **Cloudflare Worker** reverse-engineering the MovieBox backend (from `moviebox-api` Python lib + `com.community.mbox.in` APK manifest)
- The **TMDB API** (free, no cost) for enriched metadata — posters, backdrops, ratings, trailers, cast, similar titles
- **Vidstack** (open-source) as the primary video player with HLS.js fallback
- **Plyr** as an alternative lightweight player option
- A **Next.js 14 App Router** frontend with a cinematic dark UI

---

## Free Resources to Integrate

### 1. TMDB API (The Movie Database) — Metadata Enrichment
- **Base URL:** `https://api.themoviedb.org/3`
- **Auth:** Free API key from https://www.themoviedb.org/settings/api (no credit card needed)
- **Image CDN:** `https://image.tmdb.org/t/p/{size}/{path}` — sizes: `w92`, `w154`, `w185`, `w342`, `w500`, `w780`, `original`
- **Key endpoints to use:**
  - `GET /search/movie?query=&page=` — movie search with posters + ratings
  - `GET /search/tv?query=&page=` — TV search
  - `GET /movie/{id}` — full movie details: tagline, runtime, genres, budget, revenue, status
  - `GET /movie/{id}/credits` — cast & crew
  - `GET /movie/{id}/videos` — trailers (YouTube keys, filter `type=Trailer site=YouTube`)
  - `GET /movie/{id}/similar` — similar movies
  - `GET /movie/{id}/watch/providers` — streaming availability (JustWatch data, use `results.ZM` or `results.US`)
  - `GET /tv/{id}` — TV show details
  - `GET /tv/{id}/season/{n}` — season details with episode list, still images
  - `GET /trending/all/week` — trending this week (movies + TV)
  - `GET /movie/popular` — popular movies
  - `GET /movie/top_rated` — top-rated movies
  - `GET /genre/movie/list` — genre list for filter chips
  - `GET /discover/movie?with_genres=&sort_by=` — genre-based browsing
- **Strategy:** Use TMDB as the *metadata layer* (posters, descriptions, ratings, trailers, cast). Use the MovieBox Worker as the *playback layer* (stream URLs, episode data). Match by title+year when no direct ID mapping exists.
- **TMDB ID ↔ MovieBox ID mapping:** After fetching from TMDB, attempt a `/api/search?q={title}` on the Worker and store the Worker ID in localStorage keyed by TMDB ID.

### 2. Video Players (Open-Source, Free)

#### Primary: Vidstack (`@vidstack/react`)
- Install: `npm install @vidstack/react hls.js`
- Supports HLS natively, custom UI, React hooks, accessible
- **Use for:** Main stream player in `<StreamModal />` and the movie/series detail pages
- HLS streams (`.m3u8`) play natively via hls.js integration
- MP4 streams play directly in `<video>`
- Example:
```tsx
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import '@vidstack/react/player/styles/default/theme.css';

<MediaPlayer src={streamUrl} aspectRatio="16/9" load="eager">
  <MediaProvider />
</MediaPlayer>
```

#### Fallback: Plyr (`plyr`)
- Install: `npm install plyr`
- Lightweight (~28 KB), great default UI, HLS via hls.js plugin
- Use as fallback when Vidstack fails or for a simpler embed

#### HLS.js (Standalone Fallback)
- Install: `npm install hls.js`
- Use in native `<video>` when both players fail
- Detect stream type by checking if URL contains `.m3u8`

#### VLC Deep-Link
- Always provide a `vlc://` deep-link button: `vlc://{streamUrl}`
- iOS/Android VLC opens it directly; desktop VLC accepts it too

#### IINA (macOS)
- Provide `iina://weblink?url={encodedStreamUrl}` as a macOS-specific button

### 3. Subtitle Support — OpenSubtitles API (Free Tier)
- **Base URL:** `https://api.opensubtitles.com/api/v1`
- Free API key from https://www.opensubtitles.com/consumers
- `GET /subtitles?query={title}&type=movie|episode&languages=en` — search subtitles
- `POST /download` — get download URL (rate-limited: 5 downloads/day free)
- Use as supplementary to the Worker's `/api/subtitle` endpoint
- Parse `.srt` files in-browser using a simple regex parser, convert to WebVTT for `<track>` elements

### 4. Image Optimization — TMDB + Cloudflare Images
- Use `next/image` with TMDB as remote pattern
- Add blur placeholder using TMDB's `w92` size as `blurDataURL`
- Fallback image: generate a branded SVG placeholder (dark bg, movie icon, title text)

### 5. YouTube Trailers — React YouTube (`react-youtube`)
- Install: `npm install react-youtube`
- TMDB `/videos` returns YouTube keys — embed trailers on detail pages
- Show trailer button if available, fallback to a "No trailer available" state

### 6. Icons — Lucide React
- Install: `npm install lucide-react`
- Free, consistent SVG icon set
- Use: `Play`, `Download`, `Star`, `Clock`, `Film`, `Tv`, `Search`, `ChevronRight`, `Volume2`, `Subtitles`, `Globe`, `AlertCircle`, `RefreshCw`, `Copy`, `ExternalLink`, `Loader2`

### 7. Animations — Framer Motion
- Install: `npm install framer-motion`
- Page transitions, card hover effects, modal animations, skeleton reveals

### 8. Date/Time Utilities — `date-fns`
- Install: `npm install date-fns`
- Format release dates, calculate content age, format episode air dates

---

## Architecture

```
moviebox/
├── moviebox-worker.js          # Cloudflare Worker (proxy + cache layer)
├── wrangler.toml               # Worker config with KV bindings
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Homepage
│   │   ├── search/
│   │   │   └── page.tsx        # Search with instant results
│   │   ├── browse/
│   │   │   └── page.tsx        # Browse by genre/trending
│   │   ├── movie/
│   │   │   └── [id]/page.tsx   # Movie detail (TMDB id)
│   │   └── series/
│   │       └── [id]/page.tsx   # Series detail (TMDB id)
│   ├── components/
│   │   ├── MediaCard.tsx
│   │   ├── HeroSlider.tsx
│   │   ├── EpisodePicker.tsx
│   │   ├── QualitySelector.tsx
│   │   ├── SubtitleSelector.tsx
│   │   ├── SearchBar.tsx
│   │   ├── StreamModal.tsx     # Vidstack + Plyr + VLC fallback
│   │   ├── TrailerModal.tsx    # YouTube embed via react-youtube
│   │   ├── CastRow.tsx         # Horizontal scrollable cast cards
│   │   ├── DownloadButton.tsx
│   │   └── BackendStatus.tsx   # Shows /api/probe results
│   ├── lib/
│   │   ├── api.ts              # Worker API client
│   │   ├── tmdb.ts             # TMDB API client
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── match.ts            # TMDB ↔ Worker ID matcher
│   │   └── srt-to-vtt.ts       # SRT → WebVTT converter
│   ├── hooks/
│   │   ├── useSearch.ts
│   │   ├── useTrending.ts
│   │   ├── useStream.ts
│   │   ├── useTMDB.ts          # TMDB-specific hooks
│   │   └── useIDMatch.ts       # TMDB ↔ Worker ID resolution
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
└── README.md
```

---

## Part 1 — Cloudflare Worker (`moviebox-worker.js`)

### Improvements Required

1. **Add `/api/` prefix** to all routes
2. **KV caching** (binding: `CACHE`):
   - Search results: 10 min TTL
   - Details + stream URLs: 30 min TTL
   - Homepage/trending: 5 min TTL
3. **`/api/health`** endpoint: `{ uptime, cacheHitRate, lastSuccessfulBackend, timestamp }`
4. **`/api/probe`** endpoint: test all backends, return latency + status per backend
5. **Better HTTP codes**: 404 no results, 429 rate-limited upstream, 502 all backends failed
6. **`X-Response-Source`** header on every response
7. **Request deduplication**: coalesce identical URLs arriving within 100ms
8. **Quality picker** — normalize these strings to canonical qualities:
   - `"4K"`, `"UHD"`, `"2160"`, `"2160p"` → `4k`
   - `"FHD"`, `"1080"`, `"1080p"`, `"Full HD"` → `1080p`
   - `"HD"`, `"720"`, `"720p"` → `720p`
   - `"SD"`, `"480"`, `"480p"` → `480p`
   - `"360"`, `"360p"`, `"Low"` → `360p`
   - `"worst"`, `"lowest"` → `worst`
   - `"best"`, `"highest"`, `"auto"` → `best`
9. **CORS**: Allow all origins, expose `X-Response-Source`
10. **Rate limit passthrough**: forward upstream `Retry-After` header when 429

### `wrangler.toml`
```toml
name = "moviebox-worker"
main = "moviebox-worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID"

[[kv_namespaces]]
binding = "WORKER_STATE"
id = "YOUR_WORKER_STATE_KV_ID"
preview_id = "YOUR_WORKER_STATE_PREVIEW_KV_ID"
```

---

## Part 2 — TMDB Client (`frontend/lib/tmdb.ts`)

```ts
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY!; // api key is "bd634eb69266f3baa2e85c14ead1c14a"

export const tmdb = {
  // Image URLs
  poster: (path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' = 'w500') =>
    path ? `${TMDB_IMAGE}/${size}${path}` : null,
  backdrop: (path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280') =>
    path ? `${TMDB_IMAGE}/${size}${path}` : null,
  avatar: (path: string | null) =>
    path ? `${TMDB_IMAGE}/w185${path}` : null,

  // API calls (all return typed responses)
  trending: (timeWindow: 'day' | 'week' = 'week') =>
    fetch(`${TMDB_BASE}/trending/all/${timeWindow}?api_key=${TMDB_KEY}`).then(r => r.json()),
  searchMovie: (query: string, page = 1) =>
    fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=${page}`).then(r => r.json()),
  searchTV: (query: string, page = 1) =>
    fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=${page}`).then(r => r.json()),
  movieDetails: (id: number) =>
    fetch(`${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&append_to_response=credits,videos,similar,watch/providers`).then(r => r.json()),
  tvDetails: (id: number) =>
    fetch(`${TMDB_BASE}/tv/${id}?api_key=${TMDB_KEY}&append_to_response=credits,videos,similar,watch/providers`).then(r => r.json()),
  seasonDetails: (tvId: number, season: number) =>
    fetch(`${TMDB_BASE}/tv/${tvId}/season/${season}?api_key=${TMDB_KEY}`).then(r => r.json()),
  genres: (type: 'movie' | 'tv') =>
    fetch(`${TMDB_BASE}/genre/${type}/list?api_key=${TMDB_KEY}`).then(r => r.json()),
  discover: (type: 'movie' | 'tv', params: Record<string, string>) => {
    const qs = new URLSearchParams({ api_key: TMDB_KEY, ...params }).toString();
    return fetch(`${TMDB_BASE}/discover/${type}?${qs}`).then(r => r.json());
  },
  popular: (type: 'movie' | 'tv') =>
    fetch(`${TMDB_BASE}/${type}/popular?api_key=${TMDB_KEY}`).then(r => r.json()),
  topRated: (type: 'movie' | 'tv') =>
    fetch(`${TMDB_BASE}/${type}/top_rated?api_key=${TMDB_KEY}`).then(r => r.json()),
};
```

---

## Part 3 — Worker API Client (`frontend/lib/api.ts`)

```ts
const WORKER_BASE = process.env.NEXT_PUBLIC_WORKER_URL!;

export const api = {
  search: (q: string, type?: 'movies' | 'tv_series', page = 1, pageSize = 20) => {
    const params = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
    if (type) params.set('type', type);
    return fetch(`${WORKER_BASE}/api/search?${params}`).then(r => r.json());
  },
  details: (id: string, source: 'v1' | 'v2' = 'v1') =>
    fetch(`${WORKER_BASE}/api/details?id=${id}&source=${source}`).then(r => r.json()),
  stream: (id: string, quality = 'best') =>
    fetch(`${WORKER_BASE}/api/stream?id=${id}&quality=${quality}`).then(r => r.json()),
  subtitle: (id: string, lang = 'English') =>
    fetch(`${WORKER_BASE}/api/subtitle?id=${id}&lang=${lang}`).then(r => r.json()),
  episode: (id: string, season: number, episode: number) =>
    fetch(`${WORKER_BASE}/api/episode?id=${id}&season=${season}&episode=${episode}`).then(r => r.json()),
  homepage: () => fetch(`${WORKER_BASE}/api/homepage`).then(r => r.json()),
  trending: (type: 'movies' | 'tv_series' | 'all' = 'all') =>
    fetch(`${WORKER_BASE}/api/trending?type=${type}`).then(r => r.json()),
  popular: () => fetch(`${WORKER_BASE}/api/popular`).then(r => r.json()),
  probe: () => fetch(`${WORKER_BASE}/api/probe`).then(r => r.json()),
  health: () => fetch(`${WORKER_BASE}/api/health`).then(r => r.json()),
};
```

---

## Part 4 — ID Matcher (`frontend/lib/match.ts`)

Create a utility that resolves a TMDB ID to a Worker ID by:
1. Checking `localStorage` for a cached mapping (`tmdb:{tmdbId}` → `workerId`)
2. If not cached, fetching TMDB details to get title + year, then calling `api.search(title)` on the Worker
3. Scoring Worker results by title similarity (Levenshtein distance or simple token matching) + year match
4. Storing the best match in localStorage and returning it
5. If no match found, return `null` (gracefully hide playback options)

```ts
export async function resolveWorkerId(tmdbId: number, type: 'movie' | 'tv'): Promise<string | null> {
  const cacheKey = `tmdb:${type}:${tmdbId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  // Get TMDB details for title/year
  const details = type === 'movie'
    ? await tmdb.movieDetails(tmdbId)
    : await tmdb.tvDetails(tmdbId);
  const title = details.title || details.name;
  const year = parseInt((details.release_date || details.first_air_date || '').slice(0, 4));

  // Search Worker
  const workerType = type === 'movie' ? 'movies' : 'tv_series';
  const results = await api.search(title, workerType);
  if (!results?.data?.length) return null;

  // Score and pick best match
  const best = results.data.reduce((prev: any, curr: any) => {
    const score = titleScore(curr.title, title) + (curr.year === year ? 10 : 0);
    const prevScore = titleScore(prev.title, title) + (prev.year === year ? 10 : 0);
    return score > prevScore ? curr : prev;
  });

  const workerId = best?.id ?? null;
  if (workerId) localStorage.setItem(cacheKey, workerId);
  return workerId;
}

function titleScore(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 70;
  const tokensA = new Set(na.split(' '));
  const tokensB = new Set(nb.split(' '));
  const overlap = [...tokensA].filter(t => tokensB.has(t)).length;
  return (overlap / Math.max(tokensA.size, tokensB.size)) * 60;
}
```

---

## Part 5 — TypeScript Types (`frontend/lib/types.ts`)

Define strict types for:
- `TMDBMovie`, `TMDBTVShow`, `TMDBEpisode`, `TMDBCastMember`, `TMDBVideo`, `TMDBWatchProvider`
- `WorkerSearchResult`, `WorkerDetails`, `WorkerStream`, `WorkerEpisode`, `WorkerSubtitle`
- `WorkerHealth`, `WorkerProbe`
- `MediaCardProps`, `StreamModalProps`, `EpisodePickerProps`
- `Quality` = `'4k' | '1080p' | '720p' | '480p' | '360p' | 'best' | 'worst'`
- `StreamSource` = `{ url: string; quality: Quality; mimeType: 'application/x-mpegURL' | 'video/mp4' | string }`

---

## Part 6 — React Query Setup (`frontend/app/providers.tsx`)

```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min default
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

### React Query hooks with correct stale times:
- `useQuery(['tmdb-trending'], tmdb.trending, { staleTime: 2 * 60 * 1000 })`
- `useQuery(['tmdb-movie', id], () => tmdb.movieDetails(id), { staleTime: 5 * 60 * 1000 })`
- `useQuery(['worker-search', q], () => api.search(q), { staleTime: 30 * 1000, enabled: q.length > 2 })`
- `useQuery(['worker-stream', id, quality], () => api.stream(id, quality), { staleTime: 30 * 60 * 1000 })`

---

## Part 7 — Components

### `<StreamModal />`
The most critical component. Build it with three layers:

**Layer 1 — Vidstack Player** (primary):
```tsx
import { MediaPlayer, MediaProvider, Track } from '@vidstack/react';
import '@vidstack/react/player/styles/default/theme.css';
import Hls from 'hls.js';

// Detect stream type
const isHLS = streamUrl.includes('.m3u8');
```

**Layer 2 — Plyr fallback** (if Vidstack fails):
```tsx
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
// Initialize programmatically when Vidstack fires an error event
```

**Layer 3 — Raw URL fallback** (if all players fail):
- Show the stream URL in a `<code>` block with a copy button
- VLC deep-link: `<a href={`vlc://${streamUrl}`}>Open in VLC</a>`
- IINA deep-link: `<a href={`iina://weblink?url=${encodeURIComponent(streamUrl)}`}>Open in IINA</a>`
- Instruction text: "Copy URL and paste it into any video player"

**Modal also includes:**
- Quality selector (pill buttons for available qualities)
- Subtitle selector (language dropdown, loads `.srt` → converted to WebVTT in-browser)
- Download button (triggers `<a download>` with stream URL)
- Share button (Web Share API with fallback to clipboard copy)

### `<TrailerModal />`
```tsx
import YouTube from 'react-youtube';

// Fetch TMDB videos, pick first result where type=Trailer and site=YouTube
const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');

<YouTube videoId={trailer.key} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }} />
```

### `<HeroSlider />`
- Source data from TMDB trending (`/trending/all/week`) — guaranteed to have backdrops
- Use `tmdb.backdrop(item.backdrop_path, 'w1280')` for the background image
- Auto-advance every 6 seconds using `useEffect` + `setInterval`
- Framer Motion `AnimatePresence` for crossfade transition
- Show: title, tagline (from TMDB details on hover/expand), rating, year, genres
- Buttons: "▶ Watch Now" (opens StreamModal after resolving Worker ID), "ℹ More Info" (navigates to detail page), "🎬 Trailer" (opens TrailerModal if YouTube key exists)
- Dot navigation: clicking a dot pauses auto-advance for 10 seconds then resumes

### `<MediaCard />`
- Source: TMDB data (poster_path, title/name, release_date/first_air_date, vote_average, media_type)
- Poster: `tmdb.poster(item.poster_path, 'w342')` with `next/image`
- Skeleton: use CSS `animate-pulse` while loading
- Hover state: reveal quick-play button (▶) and rating badge
- Click navigates to `/movie/{tmdbId}` or `/series/{tmdbId}`
- Quick-play button resolves Worker ID then opens StreamModal
- Rating badge: color-coded (green ≥7, amber ≥5, red <5)
- Type badge: "MOVIE" or "SERIES" pill in top-left corner

### `<EpisodePicker />`
- Props: `tvId` (TMDB), `workerId` (Worker, may be null)
- Season selector: dropdown from `tv.number_of_seasons`
- Episode grid: load from `tmdb.seasonDetails(tvId, season)` for thumbnails + titles
- Each episode card: still image (`tmdb.poster(episode.still_path, 'w185')`), episode number, title, air date, runtime
- Each episode: "▶ Stream" button (calls `api.episode(workerId, season, ep)` then opens StreamModal), "↓ Download" button
- If `workerId` is null, show "Stream unavailable" state with link to search manually

### `<CastRow />`
- Horizontal scroll of cast cards from TMDB credits
- Each card: actor photo (`tmdb.avatar(cast.profile_path)`), actor name, character name
- Clicking a cast card triggers `sendPrompt` / navigates to a search for that actor

### `<BackendStatus />`
- Calls `/api/probe` and `/api/health`
- Shows a small status bar with colored dots per backend (green = up, red = down)
- Includes a "Retry" button that re-fires the probe
- Show cache hit rate from `/api/health`
- Collapse by default, expand on click

---

## Part 8 — Pages

### `app/page.tsx` — Homepage
Data sources:
1. `tmdb.trending('week')` — Hero slider (20 items)
2. `tmdb.trending('week')` filtered by `media_type=movie` — "Trending Movies" row
3. `tmdb.trending('week')` filtered by `media_type=tv` — "Trending TV" row
4. `tmdb.popular('movie')` — "Popular Movies" row
5. `tmdb.topRated('movie')` — "Top Rated" row
6. `api.homepage()` — "On MovieBox" row (Worker-native content, may be empty)

Layout:
- `<HeroSlider />` (full viewport height, 100vw)
- Horizontal scroll rows with section headings ("Trending Movies ›")
- Each row: `overflow-x: auto`, `scroll-snap-type: x mandatory`, cards with `scroll-snap-align: start`
- `<BackendStatus />` as a dismissible banner if backends are down

### `app/search/page.tsx` — Search
- Dual search: query both TMDB and Worker simultaneously
- Debounce: 300ms using `useDebounce` hook
- TMDB results displayed prominently (better metadata, thumbnails guaranteed)
- Worker-only results shown in a separate "Also on MovieBox" section
- Filter chips: All / Movies / TV (filter both result sets)
- Infinite scroll: `useIntersectionObserver` to load next page when last card visible
- URL-synced: `?q=` param so search is bookmarkable
- Empty state: Animated icon + "No results for '{query}'" + suggestion to try a different spelling
- Error state: `<BackendStatus />` + retry button

### `app/movie/[id]/page.tsx` — Movie Detail
- `[id]` is the **TMDB movie ID**
- Server component: fetch `tmdb.movieDetails(id)` for metadata (title, backdrop, poster, overview, genres, runtime, release date, rating, tagline, cast, videos)
- Client component: resolve Worker ID via `useIDMatch(id, 'movie')`, then enable stream/download buttons
- Layout:
  - Full-width backdrop (blur bottom edge into content)
  - Left: poster image
  - Right: title, tagline, genres, rating, runtime, release year
  - Buttons: "▶ Watch" (StreamModal), "🎬 Trailer" (TrailerModal if available), "↓ Download" (downloads best quality), "⊕ Watchlist" (localStorage)
  - `<QualitySelector />` — pick quality before opening StreamModal
  - `<SubtitleSelector />` — pick subtitle language
  - "Cast & Crew" section: `<CastRow />`
  - "Similar Titles" section: MediaCard row from TMDB similar endpoint
  - Watch Providers section: show streaming badges (Netflix, Prime, etc.) from `watch/providers` — links open provider site

### `app/series/[id]/page.tsx` — Series Detail
- Same as movie but with:
  - `<EpisodePicker />` replacing the watch button area
  - Season picker (tabs or dropdown)
  - Episode list with individual stream/download per episode
  - "Next Episode to Air" badge if show is ongoing

### `app/browse/page.tsx` — Browse
- Genre filter chips (from `tmdb.genres('movie')` + `tmdb.genres('tv')`)
- Sort options: Popularity / Rating / Release Date / Title
- Masonry grid layout (CSS columns or `react-masonry-css`)
- Infinite scroll
- Toggle: Movies / TV / All

---

## Part 9 — Design System

### Colors
```css
:root {
  --bg-primary: #070710;       /* Near-black with blue tint */
  --bg-secondary: #0f0f1a;     /* Card backgrounds */
  --bg-tertiary: #161625;      /* Elevated surfaces */
  --accent: #e50914;           /* Netflix-red for primary actions */
  --accent-hover: #f40612;
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #606070;
  --border: rgba(255,255,255,0.08);
  --rating-good: #21d07a;      /* ≥7.0 */
  --rating-mid: #d2a53a;       /* ≥5.0 */
  --rating-bad: #e7534a;       /* <5.0 */
}
```

### Typography
- Use `next/font/google` — import `Bebas Neue` (headings/titles), `DM Sans` (body/UI)
- `<title>` on MediaCard: Bebas Neue, tracked, bold
- `<body>`: DM Sans
- Rating badge: DM Sans medium

### Animations (Framer Motion)
- Page transitions: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`
- Card hover: `whileHover={{ scale: 1.04 }}` with `layoutId` for shared hero transitions
- Modal open: scale from 0.9 + fade, `AnimatePresence` for exit
- Skeleton: CSS `animate-pulse` (no Framer Motion — avoids JS overhead on many cards)

### Tailwind Config
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'bg-primary': '#070710',
        'bg-secondary': '#0f0f1a',
        'bg-tertiary': '#161625',
        'accent': '#e50914',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'sans-serif'],
      },
    },
  },
};
```

---

## Part 10 — SRT to WebVTT Converter (`frontend/lib/srt-to-vtt.ts`)

```ts
export function srtToVtt(srt: string): string {
  return 'WEBVTT\n\n' + srt
    .trim()
    .replace(/\r\n|\r/g, '\n')
    .split(/\n\n+/)
    .map(block => {
      const lines = block.split('\n');
      // Remove sequence number if present
      if (/^\d+$/.test(lines[0])) lines.shift();
      // Convert timestamps: 00:00:00,000 → 00:00:00.000
      lines[0] = lines[0].replace(/,/g, '.');
      return lines.join('\n');
    })
    .join('\n\n');
}

export function createVttObjectUrl(srtContent: string): string {
  const vtt = srtToVtt(srtContent);
  const blob = new Blob([vtt], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
}
```

---

## Part 11 — Environment Variables

```env
# .env.local
NEXT_PUBLIC_WORKER_URL=https://moviebox-worker.your-name.workers.dev
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here

# Optional — OpenSubtitles
NEXT_PUBLIC_OPENSUBTITLES_API_KEY=your_opensubtitles_api_key_here
```

---

## Part 12 — `next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
      { protocol: 'https', hostname: 'app-oss.byte-app.com' },
      { protocol: 'https', hostname: '*.byte-app.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Part 13 — `package.json` Dependencies

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "^18",
    "react-dom": "^18",
    "@tanstack/react-query": "^5",
    "@tanstack/react-query-devtools": "^5",
    "@vidstack/react": "^1",
    "hls.js": "^1",
    "plyr": "^3",
    "react-youtube": "^10",
    "framer-motion": "^11",
    "lucide-react": "^0.400.0",
    "date-fns": "^3",
    "react-masonry-css": "^1"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/plyr": "^3",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

---

## Part 14 — README.md

Write a complete README covering:

1. **What it is**: TMDB-enriched frontend + MovieBox API Worker for stream URL discovery
2. **Architecture diagram** (text-art):
   ```
   Browser → Next.js (Vercel/CF Pages)
                ↓ metadata          ↓ stream URLs
           TMDB API           Cloudflare Worker
                                    ↓
                           MovieBox Backends
                           (api.byte-app.com, etc.)
   ```
3. **Quick Start**: `wrangler deploy` + `.env.local` setup + `npm run dev`
4. **TMDB Setup**: Link to https://www.themoviedb.org/settings/api, free key instructions
5. **API routes reference table** (all `/api/*` routes)
6. **Deployment**: Worker on Cloudflare Workers, frontend on Cloudflare Pages (same zone) or Vercel
7. **Known limitations**: Stream availability varies by backend health; TMDB ↔ Worker ID matching may fail for obscure titles; some streams are HLS and require a player with HLS support
8. **Legal disclaimer**: Content belongs to original creators. This project is a technical demonstration only. Use the official app or licensed services for regular viewing.
9. **Free resources used** (attribution): TMDB, Vidstack, Plyr, HLS.js, moviebox-api Python library

---

## Build Order

1. **`moviebox-worker.js`** — add `/api/` prefix, KV caching, `/api/health`, `/api/probe`, better errors, quality normalizer
2. **`wrangler.toml`** — declare both KV namespaces
3. **`npx create-next-app@latest frontend --typescript --tailwind --app`**
4. **Install all deps** from the package.json above
5. **`lib/types.ts`** — define all types
6. **`lib/tmdb.ts`** — TMDB client
7. **`lib/api.ts`** — Worker client
8. **`lib/match.ts`** — ID matcher
9. **`lib/srt-to-vtt.ts`** — subtitle converter
10. **`app/providers.tsx`** — React Query provider
11. **`app/layout.tsx`** — root layout with fonts + providers
12. **Components** (dependency order):
    - `MediaCard` → `SearchBar` → `BackendStatus`
    - `QualitySelector` → `SubtitleSelector` → `StreamModal`
    - `TrailerModal` → `CastRow` → `EpisodePicker`
    - `HeroSlider` → `DownloadButton`
13. **Pages** (dependency order): `page.tsx` → `search/page.tsx` → `movie/[id]/page.tsx` → `series/[id]/page.tsx` → `browse/page.tsx`
14. **`next.config.ts`** — image domains
15. **`README.md`**

---

## Technical Constraints

- **Worker**: Vanilla JS ES modules, no npm, `wrangler deploy` as-is
- **Frontend**: Next.js 14 App Router, TypeScript strict, Tailwind, React Query — `npm run build` must pass
- **All stream requests** go through the Worker — never directly from the frontend to MovieBox backends
- **TMDB requests** go directly from the frontend (no CORS issues, TMDB allows browser requests)
- **Video player fallback chain**: Vidstack → Plyr → native `<video>` + hls.js → raw URL
- **Graceful degradation**: if Worker is down, metadata-only mode using pure TMDB still works (no streaming)
- **No API keys in Worker**: TMDB key stays in frontend env; Worker has no TMDB dependency
- **Offline/poor connection**: show skeleton states, implement `retry` with exponential backoff in React Query

---

*Generated prompt — paste this entire document into Claude Code to scaffold the project.*
