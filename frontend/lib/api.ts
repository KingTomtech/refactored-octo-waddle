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
  WorkerRecommendResponse,
  WorkerRecommendItem,
  WorkerBottomTabResponse,
  WorkerBottomTab,
  WorkerHomeTab,
  WorkerFilterResponse,
  WorkerFilterItem,
  WorkerListResponse,
  WorkerDubInfoResponse,
  WorkerDubTrack,
  WorkerWantToSeeResponse,
  WorkerStreamCaptionsResponse,
  WorkerStreamCaption,
  WorkerSearchRankResponse,
  WorkerSearchRankItem,
  WorkerResourceResponse,
  WorkerShort,
  WorkerShortsResponse,
  WorkerShortInfo,
  WorkerShortInfoResponse,
  WorkerStaffInfoResponse,
  WorkerStaffRelatedResponse,
  WorkerWidgetResponse,
  WorkerWidgetSection,
  WorkerDailyRecResponse,
  WorkerPlaylistContentResponse,
  WorkerSearchSuggestResponse,
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

// ── Normalisers for new endpoints ────────────────────────────

function normaliseRecommend(raw: any): WorkerRecommendResponse {
  if (!raw || raw.ok === false) return raw;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerRecommendItem[] = items.map((s: any) => ({
    id: String(s.subjectId ?? s.id ?? ''),
    title: s.title ?? s.name ?? 'Untitled',
    poster: s.cover?.url ?? s.poster ?? undefined,
    backdrop: s.stills?.url ?? s.backdrop?.url ?? undefined,
    rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
    subjectType: s.subjectType,
    releaseDate: s.releaseDate,
  }));
  return { ok: true, data: mapped, source: raw?.source, degraded: raw?.degraded };
}

function normaliseBottomTab(raw: any): WorkerBottomTabResponse {
  if (!raw || raw.ok === false) return raw;
  const d = raw?.data ?? {};
  const bottomTabs: WorkerBottomTab[] = Array.isArray(d.bottomTabs)
    ? d.bottomTabs.map((t: any) => ({
        btTabType: t.btTabType ?? '',
        name: t.name ?? t.text ?? '',
        btTabCode: t.btTabCode ?? '',
        icon: t.icon ?? undefined,
        statusWhite: t.statusWhite ?? undefined,
        url: t.url ?? undefined,
        operateTabId: t.operateTabId ?? undefined,
        displayType: t.displayType ?? undefined,
        badge: t.badge ?? undefined,
      }))
    : [];
  const homeTabs: WorkerHomeTab[] = Array.isArray(d.homeTabs)
    ? d.homeTabs.map((t: any) => ({
        name: t.name ?? '',
        tabId: Number(t.tabId ?? t.operateTabId ?? 0),
        type: t.type ?? '',
        tabCode: t.tabCode ?? undefined,
        url: t.url ?? undefined,
        nameImage: t.nameImage ?? undefined,
        selectNameImage: t.selectNameImage ?? undefined,
        displayType: t.displayType ?? undefined,
      }))
    : [];
  return { ok: true, data: { bottomTabs, homeTabs, version: d.version, badgeVer: d.badgeVer }, source: raw?.source, degraded: raw?.degraded };
}

function normaliseFilterItems(raw: any): WorkerFilterResponse {
  if (!raw || raw.ok === false) return raw;
  const d = raw?.data ?? {};
  const typeList: any[] = Array.isArray(d?.typeList) ? d.typeList : Array.isArray(d) ? d : [];
  const mapped: WorkerFilterItem[] = typeList.map((f: any) => ({
    id: String(f.id ?? f.typeId ?? ''),
    name: f.name ?? f.typeName ?? '',
    type: f.type ?? undefined,
    values: Array.isArray(f.values ?? f.items)
      ? (f.values ?? f.items).map((v: any) => ({ id: String(v.id ?? v.value ?? ''), name: v.name ?? v.text ?? '' }))
      : undefined,
  }));
  return { ok: true, data: mapped, source: raw?.source, degraded: raw?.degraded };
}

function normaliseList(raw: any): WorkerListResponse {
  if (!raw || raw.ok === false) return raw;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerSearchResult[] = items.map((s: any) => ({
    id: String(s.subjectId ?? s.id ?? ''),
    title: s.title ?? s.name ?? 'Untitled',
    year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : undefined,
    type: mapSubjectTypeToContentType(s.subjectType),
    poster: s.cover?.url ?? s.poster ?? undefined,
    backdrop: s.stills?.url ?? s.backdrop?.url ?? undefined,
    rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
    duration: s.duration,
    description: s.description,
  }));
  return { ok: true, data: mapped, pager: raw?.pager, source: raw?.source };
}

function normaliseDubInfo(raw: any): WorkerDubInfoResponse {
  if (!raw || raw.ok === false) return raw;
  const d = raw?.data ?? {};
  const tracks: WorkerDubTrack[] = Array.isArray(d?.dubs ?? d?.audioTracks)
    ? (d.dubs ?? d.audioTracks).map((t: any) => ({
        name: t.name ?? t.languageName ?? '',
        languageCode: t.languageCode ?? t.lang ?? undefined,
        url: t.url ?? undefined,
      }))
    : [];
  return { ok: true, data: tracks, source: raw?.source };
}

function normaliseStreamCaptions(raw: any): WorkerStreamCaptionsResponse {
  if (!raw || raw.ok === false) return raw;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerStreamCaption[] = items.map((c: any) => ({
    url: c.url ?? '',
    // Per APK spec, captions use `lan` (BCP-47) and `lanName` (display)
    lang: c.lan ?? c.languageCode ?? c.lang ?? 'en',
    format: c.format ?? (c.url?.split('.').pop() ?? 'srt'),
    label: c.lanName ?? c.languageName ?? c.label ?? undefined,
  }));
  return { ok: true, data: mapped, source: raw?.source };
}

function normaliseSearchRank(raw: any): WorkerSearchRankResponse {
  if (!raw || raw.ok === false) return raw;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerSearchRankItem[] = items.map((k: any) => ({
    keyword: k.keyword ?? k.key ?? k.searchKeyword ?? String(k),
    hot: k.hot ?? k.heat ?? k.score ?? undefined,
  }));
  return { ok: true, data: mapped, source: raw?.source };
}

// ── v5 normalisers (APK-mapped endpoints) ────────────────────

function normaliseSearchSuggest(raw: any): WorkerSearchSuggestResponse {
  if (!raw || raw.ok === false) return raw;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped = items.map((g: any) => ({
    keyword: g.keyword ?? g.title ?? '',
    subjects: Array.isArray(g.subjects) ? g.subjects.map((s: any) => ({
      id: String(s.subjectId ?? s.id ?? ''),
      title: s.title ?? s.name ?? 'Untitled',
      year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : undefined,
      type: mapSubjectTypeToContentType(s.subjectType),
      poster: s.cover?.url ?? s.poster ?? undefined,
      rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
    })) : undefined,
  }));
  return { ok: true, data: mapped, source: raw?.source, degraded: raw?.degraded };
}

function normaliseShorts(raw: any): WorkerShortsResponse {
  if (!raw || raw.ok === false) return raw;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerShort[] = items.map((s: any) => ({
    id: String(s.subjectId ?? s.id ?? s.shortId ?? ''),
    title: s.title ?? s.name ?? 'Untitled',
    poster: s.cover?.url ?? s.poster ?? undefined,
    backdrop: s.stills?.url ?? s.backdrop?.url ?? undefined,
    description: s.description ?? undefined,
    duration: s.duration ? Number(s.duration) : undefined,
    videoUrl: s.videoUrl ?? s.video?.url ?? undefined,
    likes: s.likes ? Number(s.likes) : undefined,
    plays: s.plays ? Number(s.plays) : undefined,
    subjectType: s.subjectType,
    releaseDate: s.releaseDate,
  }));
  return { ok: true, data: mapped, pager: raw?.pager, source: raw?.source, degraded: raw?.degraded };
}

function normaliseShortInfo(raw: any): WorkerShortInfoResponse {
  if (!raw || raw.ok === false) return raw;
  const d = raw?.data ?? {};
  const out: WorkerShortInfo = {
    id: String(d.subjectId ?? d.id ?? ''),
    title: d.title ?? d.name ?? 'Untitled',
    description: d.description ?? undefined,
    poster: d.cover?.url ?? undefined,
    backdrop: d.stills?.url ?? undefined,
    videoUrl: d.videoUrl ?? d.video?.url ?? undefined,
    duration: d.duration ? Number(d.duration) : undefined,
    plays: d.plays ? Number(d.plays) : undefined,
    likes: d.likes ? Number(d.likes) : undefined,
    authorId: d.authorId ?? undefined,
    authorName: d.authorName ?? undefined,
  };
  return { ok: true, data: out, source: raw?.source };
}

function normaliseStaffInfo(raw: any): WorkerStaffInfoResponse {
  if (!raw || raw.ok === false) return raw;
  const d = raw?.data ?? {};
  const filmography: WorkerSearchResult[] = Array.isArray(d.filmography)
    ? d.filmography.map((s: any) => ({
        id: String(s.subjectId ?? s.id ?? ''),
        title: s.title ?? s.name ?? 'Untitled',
        year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : undefined,
        type: mapSubjectTypeToContentType(s.subjectType),
        poster: s.cover?.url ?? s.poster ?? undefined,
        rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
      }))
    : [];
  return {
    ok: true,
    data: {
      id: String(d.staffId ?? d.id ?? ''),
      name: d.name ?? d.staffName ?? 'Unknown',
      avatarUrl: d.avatarUrl ?? d.avatar ?? undefined,
      bio: d.bio ?? d.description ?? undefined,
      dob: d.birthday ?? d.dob ?? undefined,
      birthplace: d.birthplace ?? undefined,
      filmography,
    },
    source: raw?.source,
  };
}

function normaliseStaffRelated(raw: any): WorkerStaffRelatedResponse {
  if (!raw || raw.ok === false) return raw;
  const d = raw?.data ?? {};
  const related: WorkerSearchResult[] = Array.isArray(d.related ?? d.items ?? d.data)
    ? (d.related ?? d.items ?? d.data).map((s: any) => ({
        id: String(s.subjectId ?? s.id ?? ''),
        title: s.title ?? s.name ?? 'Untitled',
        year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : undefined,
        type: mapSubjectTypeToContentType(s.subjectType),
        poster: s.cover?.url ?? s.poster ?? undefined,
        rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
      }))
    : [];
  return { ok: true, data: { staffId: String(d.staffId ?? d.id ?? ''), related }, source: raw?.source };
}

function normaliseWidget(raw: any): WorkerWidgetResponse {
  if (!raw || raw.ok === false) return raw;
  const sections: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerWidgetSection[] = sections.map((s: any) => ({
    type: s.type ?? s.sectionType ?? 'unknown',
    title: s.title ?? s.name ?? undefined,
    items: Array.isArray(s.items ?? s.subjects)
      ? (s.items ?? s.subjects).map((it: any) => ({
          id: String(it.subjectId ?? it.id ?? ''),
          title: it.title ?? it.name ?? 'Untitled',
          year: it.releaseDate ? Number(String(it.releaseDate).slice(0, 4)) : undefined,
          type: mapSubjectTypeToContentType(it.subjectType),
          poster: it.cover?.url ?? it.poster ?? undefined,
          rating: it.imdbRatingValue ? Number(it.imdbRatingValue) : undefined,
        }))
      : undefined,
  }));
  return { ok: true, data: mapped, source: raw?.source, degraded: raw?.degraded };
}

function normaliseDailyRec(raw: any): WorkerDailyRecResponse {
  if (!raw || raw.ok === false) return raw;
  const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const mapped: WorkerSearchResult[] = items.map((s: any) => ({
    id: String(s.subjectId ?? s.id ?? ''),
    title: s.title ?? s.name ?? 'Untitled',
    year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : undefined,
    type: mapSubjectTypeToContentType(s.subjectType),
    poster: s.cover?.url ?? s.poster ?? undefined,
    backdrop: s.stills?.url ?? undefined,
    rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
    description: s.description,
  }));
  return { ok: true, data: mapped, source: raw?.source, degraded: raw?.degraded };
}

function normalisePlaylistContent(raw: any): WorkerPlaylistContentResponse {
  if (!raw || raw.ok === false) return raw;
  const d = raw?.data ?? {};
  const items: WorkerSearchResult[] = Array.isArray(d.items ?? d.subjects)
    ? (d.items ?? d.subjects).map((s: any) => ({
        id: String(s.subjectId ?? s.id ?? ''),
        title: s.title ?? s.name ?? 'Untitled',
        year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : undefined,
        type: mapSubjectTypeToContentType(s.subjectType),
        poster: s.cover?.url ?? s.poster ?? undefined,
        rating: s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined,
      }))
    : [];
  return {
    ok: true,
    data: { playlistId: String(d.playlistId ?? d.id ?? ''), title: d.title, description: d.description, items },
    source: raw?.source,
  };
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

  // ── New endpoints (from APK audit) ────────────────────────────

  /** Recommendations shown on detail pages ("You may also like") */
  detailRec: async (id: string, signal?: AbortSignal): Promise<WorkerRecommendResponse> => {
    const raw = await workerFetch<any>('/api/detail-rec', { id }, signal ? { signal } : undefined);
    return normaliseRecommend(raw);
  },

  /** Top/trending recommendations for homepage */
  topRec: async (signal?: AbortSignal): Promise<WorkerRecommendResponse> => {
    const raw = await workerFetch<any>('/api/top-rec', {}, signal ? { signal } : undefined);
    return normaliseRecommend(raw);
  },

  /** Bottom tab + home tab configuration from the backend */
  bottomTab: async (host = '0', signal?: AbortSignal): Promise<WorkerBottomTabResponse> => {
    const raw = await workerFetch<any>('/api/bottom-tab', { host }, signal ? { signal } : undefined);
    return normaliseBottomTab(raw);
  },

  /** Play-related recommendations (shown during/after playback) */
  playRelatedRec: async (id: string, signal?: AbortSignal): Promise<WorkerRecommendResponse> => {
    const raw = await workerFetch<any>('/api/play-related-rec', { id }, signal ? { signal } : undefined);
    return normaliseRecommend(raw);
  },

  /** Mark a title as "want to see" (watchlist on server) */
  wantToSee: async (id: string, signal?: AbortSignal): Promise<WorkerWantToSeeResponse> => {
    const res = await fetch(`${WORKER_BASE.replace(/\/$/, '')}/api/want-to-see?id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ subjectId: id }),
      signal: signal ?? undefined,
    });
    if (!res.ok) throw new Error(`want-to-see → ${res.status}`);
    return res.json();
  },

  /** Mark a title as "have seen" (watched on server) */
  haveSeen: async (id: string, signal?: AbortSignal): Promise<WorkerWantToSeeResponse> => {
    const res = await fetch(`${WORKER_BASE.replace(/\/$/, '')}/api/have-seen?id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ subjectId: id }),
      signal: signal ?? undefined,
    });
    if (!res.ok) throw new Error(`have-seen → ${res.status}`);
    return res.json();
  },

  /** Dub/audio track info for a title */
  dubInfo: async (id: string, signal?: AbortSignal): Promise<WorkerDubInfoResponse> => {
    const raw = await workerFetch<any>('/api/dub-info', { id }, signal ? { signal } : undefined);
    return normaliseDubInfo(raw);
  },

  /** Filter items for browse page (genres, years, countries) */
  filterItems: async (tabId = '0', page = 1, pageSize = 20, signal?: AbortSignal): Promise<WorkerFilterResponse> => {
    const raw = await workerFetch<any>('/api/filter-items', { tabId, page, pageSize }, signal ? { signal } : undefined);
    return normaliseFilterItems(raw);
  },

  /** Paginated content list (browse/filter results) */
  list: async (listId = '0', page = 1, pageSize = 20, signal?: AbortSignal): Promise<WorkerListResponse> => {
    const raw = await workerFetch<any>('/api/list', { id: listId, page, pageSize }, signal ? { signal } : undefined);
    return normaliseList(raw);
  },

  /** Stream captions (richer subtitle source) */
  streamCaptions: async (id: string, streamId?: string, signal?: AbortSignal): Promise<WorkerStreamCaptionsResponse> => {
    const params: Record<string, string | number> = { id };
    if (streamId) params.streamId = streamId;
    const raw = await workerFetch<any>('/api/stream-captions', params, signal ? { signal } : undefined);
    return normaliseStreamCaptions(raw);
  },

  /** Hot search keywords for search suggestions */
  searchRank: async (keyword = '', perPage = 10, signal?: AbortSignal): Promise<WorkerSearchRankResponse> => {
    const raw = await workerFetch<any>('/api/search-rank', { keyword, perPage }, signal ? { signal } : undefined);
    return normaliseSearchRank(raw);
  },

  /** Download resource list for a title (v5) */
  resourceList: async (id: string, signal?: AbortSignal): Promise<WorkerResourceResponse> => {
    const raw = await workerFetch<any>('/api/resource', { id }, signal ? { signal } : undefined);
    const d = raw?.data ?? {};
    // Upstream returns DownloadListBean: { resourceList: [{ resourceId, resolution, format, size, episode, season, shareUrl, ... }] }
    const list: any[] = Array.isArray(d?.resourceList) ? d.resourceList
      : Array.isArray(d?.resources) ? d.resources
      : Array.isArray(raw?.data) ? raw.data
      : [];
    const mapped = list.map((r: any) => ({
      resourceId: String(r.resourceId ?? r.id ?? ''),
      resolution: r.resolution ? Number(r.resolution) : undefined,
      format: r.format ?? undefined,
      size: r.size ? Number(r.size) : undefined,
      url: r.shareUrl ?? r.url ?? undefined,
      episode: r.episode ? Number(r.episode) : undefined,
      season: r.season ? Number(r.season) : undefined,
    }));
    return { ok: !!raw?.ok, data: mapped, source: raw?.source };
  },

  // ── v5 APK-mapped endpoints ───────────────────────────────────

  /** Auto-suggest as the user types in the search bar */
  searchSuggest: async (keyword: string, perPage = 10, resultMode = '', signal?: AbortSignal): Promise<WorkerSearchSuggestResponse> => {
    const raw = await workerFetch<any>('/api/search-suggest',
      { keyword, perPage, resultMode },
      signal ? { signal } : undefined);
    return normaliseSearchSuggest(raw);
  },

  /** Trending short-form (vertical) videos */
  shortsMostTrending: async (page = 1, perPage = 20, signal?: AbortSignal): Promise<WorkerShortsResponse> => {
    const raw = await workerFetch<any>('/api/shorts/most-trending', { page, perPage }, signal ? { signal } : undefined);
    return normaliseShorts(raw);
  },

  /** User's favorite shorts (server-stored) */
  shortsFavoriteList: async (page = 1, perPage = 20, signal?: AbortSignal): Promise<WorkerShortsResponse> => {
    const raw = await workerFetch<any>('/api/shorts/favorite-list', { page, perPage }, signal ? { signal } : undefined);
    return normaliseShorts(raw);
  },

  /** Single short's metadata (for the /shorts/[id] page) */
  shortsGetInfo: async (id: string, signal?: AbortSignal): Promise<WorkerShortInfoResponse> => {
    const raw = await workerFetch<any>('/api/shorts/get-info', { id }, signal ? { signal } : undefined);
    return normaliseShortInfo(raw);
  },

  /** Episode rail for a short subject (anime/short-tv series) */
  shortsMiniList: async (id: string, startPosition = 0, endPosition = 20, signal?: AbortSignal): Promise<WorkerShortsResponse> => {
    const raw = await workerFetch<any>('/api/shorts/mini-list', { id, startPosition, endPosition }, signal ? { signal } : undefined);
    return normaliseShorts(raw);
  },

  /** Cast/crew member's profile + filmography */
  staffInfo: async (id: string, signal?: AbortSignal): Promise<WorkerStaffInfoResponse> => {
    const raw = await workerFetch<any>('/api/staff-info', { id }, signal ? { signal } : undefined);
    return normaliseStaffInfo(raw);
  },

  /** Cast/crew related subjects (per genre etc.) */
  staffRelated: async (id: string, signal?: AbortSignal): Promise<WorkerStaffRelatedResponse> => {
    const raw = await workerFetch<any>('/api/staff-related', { id }, signal ? { signal } : undefined);
    return normaliseStaffRelated(raw);
  },

  /** Server's "pick of the day" — shown above the fold on the homepage */
  dailyMovieRec: async (signal?: AbortSignal): Promise<WorkerDailyRecResponse> => {
    const raw = await workerFetch<any>('/api/daily-movie-rec', {}, signal ? { signal } : undefined);
    return normaliseDailyRec(raw);
  },

  /** Home-screen widget payload (continue watching, hot list, etc.) */
  widget: async (signal?: AbortSignal): Promise<WorkerWidgetResponse> => {
    const raw = await workerFetch<any>('/api/widget', {}, signal ? { signal } : undefined);
    return normaliseWidget(raw);
  },

  /** Curated playlist of subjects */
  playlistContent: async (playlistId: string, signal?: AbortSignal): Promise<WorkerPlaylistContentResponse> => {
    const raw = await workerFetch<any>('/api/playlist/content', { id: playlistId }, signal ? { signal } : undefined);
    return normalisePlaylistContent(raw);
  },

  /** Trending feed v2 — multi-tab (Trending / Movie / TV / etc.) */
  trendingV2: async (tabId = '0', page = 1, signal?: AbortSignal): Promise<any> => {
    return workerFetch<any>('/api/trending/v2', { tabId, page }, signal ? { signal } : undefined);
  },
};

export { WORKER_BASE };
