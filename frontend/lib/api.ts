// ────────────────────────────────────────────────────────────
//  Worker API client — normalises the worker's raw payload
//  into the typed Worker* shapes expected by the hooks/components.
// ────────────────────────────────────────────────────────────

import type {
  WorkerSearchResponse,
  WorkerSearchResult,
  WorkerStreamResponse,
  WorkerStream,
  WorkerEpisodeResponse,
  WorkerEpisode,
  WorkerSubtitleResponse,
  WorkerHealth,
  WorkerProbeResponse,
  WorkerDetails,
  WorkerSeason,
  Quality,
} from './types';

const WORKER_BASE = process.env.NEXT_PUBLIC_WORKER_URL ?? '';

function buildWorkerUrl(path: string, params: Record<string, string | number>): string {
  if (!WORKER_BASE) throw new Error('NEXT_PUBLIC_WORKER_URL is not set');
  const base = WORKER_BASE.replace(/\/$/, '');
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Worker returned non-JSON (${ct}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function workerFetch<T>(path: string, params: Record<string, string | number> = {}, init?: RequestInit): Promise<T> {
  const url = buildWorkerUrl(path, params);
  const res = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Worker ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return safeJson<T>(res);
}

// ── Normalisers ──────────────────────────────────────────────

function mapSubjectTypeToContentType(subjectType: number | undefined): 'movies' | 'tv_series' {
  // worker subjectType: 0=All, 1=Movies, 2=TV_SERIES, 5=Education, 6=Music, 7=Anime, 8=Other
  if (subjectType === 2) return 'tv_series';
  return 'movies';
}

function resolutionToQuality(r: number | undefined): Quality {
  if (!r) return '1080p';
  if (r >= 2160) return '4k';
  if (r >= 1080) return '1080p';
  if (r >= 720)  return '720p';
  if (r >= 480)  return '480p';
  return '360p';
}

function formatToMime(format: string | undefined, url: string): string {
  if (format) {
    const f = format.toLowerCase();
    if (f.includes('dash') || f.includes('mpd')) return 'application/dash+xml';
    if (f.includes('hls')  || f.includes('m3u8')) return 'application/x-mpegURL';
    if (f.includes('mp4')) return 'video/mp4';
  }
  if (url.includes('.m3u8')) return 'application/x-mpegURL';
  if (url.includes('.mpd'))   return 'application/dash+xml';
  if (url.includes('.mp4'))   return 'video/mp4';
  return 'video/mp4';
}

function normaliseSearch(raw: any): WorkerSearchResponse {
  if (!raw || raw.ok === false) return raw as WorkerSearchResponse;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerSearchResult[] = items.map((s) => ({
    id: String(s.subjectId ?? s.id ?? ''),
    title: s.title ?? s.name ?? 'Untitled',
    year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : undefined,
    type: mapSubjectTypeToContentType(s.subjectType),
    poster: s.cover?.url ?? s.poster ?? undefined,
    backdrop: s.backdrop?.url ?? undefined,
    rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
    duration: s.duration,
    description: s.description,
  }));
  return {
    ok: true,
    data: mapped,
    source: raw?.source ?? 'origin',
  };
}

function normaliseStream(raw: any): WorkerStreamResponse {
  if (!raw || raw.ok === false) return raw as WorkerStreamResponse;
  const d = raw.data ?? {};
  if (!d.url) {
    return { ok: false, error: { code: 'no_stream', message: 'No stream returned by worker' } };
  }
  const quality: Quality = d.quality || resolutionToQuality(d.resolution);
  const mimeType = d.mimeType || formatToMime(d.format, d.url);
  const out: WorkerStream = {
    url: d.url,
    quality,
    mimeType,
    sizeBytes: d.size ? Number(d.size) : undefined,
    cookies: Array.isArray(d.cookies) ? d.cookies : undefined,
    resourceId: d.resourceId,
    subtitles: Array.isArray(d.subtitles) ? d.subtitles : undefined,
    sources: [{ url: d.url, quality, mimeType }],
  };
  return {
    ok: true,
    data: out,
    quality: out.quality,
    source: raw?.source ?? 'origin',
  };
}

function normaliseEpisode(raw: any, id: string, season: number, episode: number): WorkerEpisodeResponse {
  if (!raw || raw.ok === false) return raw as WorkerEpisodeResponse;
  const d = raw.data ?? {};
  if (!d.url) {
    return { ok: false, error: { code: 'no_stream', message: 'No stream returned by worker' } };
  }
  const out: WorkerEpisode = {
    id: String(d.resourceId ?? d.id ?? `${id}-s${season}-e${episode}`),
    seriesId: id,
    season,
    episode,
    url: d.url,
    quality: resolutionToQuality(d.resolution),
    mimeType: formatToMime(d.format, d.url),
    sources: [{ url: d.url, quality: resolutionToQuality(d.resolution), mimeType: formatToMime(d.format, d.url) }],
  };
  return { ok: true, data: out, source: raw?.source ?? 'origin' };
}

function normaliseDetails(raw: any): WorkerDetails {
  if (!raw || raw.ok === false) return raw as WorkerDetails;
  const d = raw.data ?? raw;
  const subjectId = String(d.subjectId ?? d.id ?? '');
  const subjectType = d.subjectType;
  const type: 'movies' | 'tv_series' = subjectType === 2 ? 'tv_series' : 'movies';

  // Parse genre string like "Adventure, Drama, Sci-Fi"
  const genres: string[] | undefined = d.genre
    ? String(d.genre).split(/,\s*/).filter(Boolean)
    : undefined;

  // Cast vs crew from staffList
  const staffList: any[] = Array.isArray(d.staffList) ? d.staffList : [];
  const cast = staffList.filter((s: any) => s.staffType === 1);
  const crew = staffList.filter((s: any) => s.staffType === 2);

  // Trailer direct URL
  const trailerUrl = d.trailer?.VideoAddress?.url ?? undefined;

  return {
    id: subjectId,
    title: d.title ?? d.name ?? 'Untitled',
    year: d.releaseDate ? Number(String(d.releaseDate).slice(0, 4)) : undefined,
    type,
    description: d.description,
    poster: d.cover?.url ?? undefined,
    backdrop: d.stills?.url ?? d.backdrop?.url ?? undefined,
    rating: d.imdbRatingValue ? Number(d.imdbRatingValue) : undefined,
    duration: d.duration,
    durationSeconds: d.durationSeconds ? Number(d.durationSeconds) : undefined,
    genres,
    cast,
    crew,
    trailer: d.trailer,
    trailerUrl,
    stills: d.stills,
    cover: d.cover,
    language: d.language,
    country: d.countryName,
    contentRating: d.contentRating,
    releaseDate: d.releaseDate,
    imdbRatingValue: d.imdbRatingValue,
    subjectId,
    subjectType,
    raw: d,
  };
}

function normaliseSeasonInfo(raw: any): { ok: boolean; seasons?: WorkerSeason[]; error?: { code: string; message: string } } {
  if (!raw || raw.ok === false) return raw;
  const d = raw.data ?? {};
  const seasons: WorkerSeason[] = Array.isArray(d.seasons)
    ? d.seasons.map((s: any) => ({
        season_number: Number(s.se ?? s.season_number ?? 0),
        episode_count: Number(s.maxEp ?? s.episode_count ?? 0),
        maxEp: Number(s.maxEp ?? 0),
        allEp: String(s.allEp ?? ''),
        resolutions: Array.isArray(s.resolutions)
          ? s.resolutions.map((r: any) => ({ resolution: Number(r.resolution ?? 0), epNum: Number(r.epNum ?? 0) }))
          : [],
      }))
    : [];
  return { ok: true, seasons };
}

function normaliseSubtitle(raw: any): WorkerSubtitleResponse {
  if (!raw || raw.ok === false) return raw as WorkerSubtitleResponse;
  const d = raw.data ?? {};
  const extCaptions: any[] = Array.isArray(d.extCaptions) ? d.extCaptions : [];
  const mapped: import('./types').WorkerSubtitle[] = extCaptions.map((c: any) => ({
    url: c.url,
    lang: c.lan || 'en',
    format: (c.url || '').split('.').pop() || 'srt',
    label: c.lanName || c.lan || 'Unknown',
  }));
  return {
    ok: true,
    data: mapped.length === 1 ? mapped[0] : mapped,
    source: raw?.source ?? 'origin',
  };
}

function normaliseTrending(raw: any): any {
  if (!raw || raw.ok === false) return raw;
  // worker's /api/trending returns `data` as flat subjects (per the worker rewrite)
  // the frontend (useTrending) expects the subjects directly
  return raw;
}

function normaliseHealth(raw: any): WorkerHealth {
  if (!raw) return raw as WorkerHealth;
  return {
    ok: !!raw.ok,
    uptime: Number(raw.uptime ?? 0),
    cacheHitRate: Number(raw.cacheHitRate ?? 0),
    cacheHits: Number(raw.cacheHits ?? 0),
    cacheMisses: Number(raw.cacheMisses ?? 0),
    lastSuccessfulBackend: raw.activeBackend ?? null,
    timestamp: raw.timestamp ?? new Date().toISOString(),
  };
}

function normaliseProbe(raw: any): WorkerProbeResponse {
  if (!raw) return raw as WorkerProbeResponse;
  const results = (raw.results ?? []).map((r: any) => ({
    name: r.backend ?? r.name,
    ok: !!r.ok,
    latencyMs: Number(r.latencyMs ?? 0),
    status: Number(r.status ?? 0),
    error: r.error,
  }));
  return { ok: !!raw.ok, results, testedAt: raw.testedAt ?? new Date().toISOString() };
}

// ── Public API ──────────────────────────────────────────────

export const api = {
  search: async (q: string, type?: 'movies' | 'tv_series' | 'all', page = 1, pageSize = 20, signal?: AbortSignal): Promise<WorkerSearchResponse> => {
    const t = type ?? 'all';
    const raw = await workerFetch<any>('/api/search', { q, type: t, page, perPage: pageSize }, signal ? { signal } : undefined);
    return normaliseSearch(raw);
  },

  details: async (id: string, _source: 'v1' | 'v2' = 'v1', signal?: AbortSignal): Promise<WorkerDetails> => {
    const raw = await workerFetch<any>('/api/details', { id }, signal ? { signal } : undefined);
    return normaliseDetails(raw);
  },

  seasonInfo: async (id: string, signal?: AbortSignal) => {
    const raw = await workerFetch<any>('/api/season-info', { id }, signal ? { signal } : undefined);
    return normaliseSeasonInfo(raw);
  },

  stream: async (id: string, quality: Quality = '1080p', season = 0, episode = 0, signal?: AbortSignal): Promise<WorkerStreamResponse> => {
    const raw = await workerFetch<any>('/api/stream', { id, quality, season, episode }, signal ? { signal } : undefined);
    return normaliseStream(raw);
  },

  subtitle: async (id: string, lang?: string, resourceId?: string, signal?: AbortSignal): Promise<WorkerSubtitleResponse> => {
    const raw = await workerFetch<any>('/api/subtitle', { id, resourceId: resourceId ?? id, lang: lang ?? 'English' }, signal ? { signal } : undefined);
    return normaliseSubtitle(raw);
  },

  episode: async (id: string, season: number, episode: number, signal?: AbortSignal): Promise<WorkerEpisodeResponse> => {
    // Worker doesn't have a separate /api/episode route — reuse /api/stream with se/ep
    const raw = await workerFetch<any>('/api/stream', { id, season, episode, quality: '1080p' }, signal ? { signal } : undefined);
    return normaliseEpisode(raw, id, season, episode);
  },

  homepage: (signal?: AbortSignal) => workerFetch<any>('/api/homepage', {}, signal ? { signal } : undefined),

  trending: (type: 'movies' | 'tv_series' | 'all' = 'all', signal?: AbortSignal) => {
    // Map friendly → numeric tabId; worker uses tabId=0 for All, but the front-end
    // can pass through and let the worker handle the default.
    return workerFetch<any>('/api/trending', { tabId: type }, signal ? { signal } : undefined);
  },

  popular: (signal?: AbortSignal) => workerFetch<any>('/api/trending', { tabId: '0' }, signal ? { signal } : undefined),

  probe: async (signal?: AbortSignal): Promise<WorkerProbeResponse> => {
    const raw = await workerFetch<any>('/api/probe', {}, signal ? { signal } : undefined);
    return normaliseProbe(raw);
  },

  health: async (signal?: AbortSignal): Promise<WorkerHealth> => {
    const raw = await workerFetch<any>('/api/health', {}, signal ? { signal } : undefined);
    return normaliseHealth(raw);
  },
};

export { WORKER_BASE };
