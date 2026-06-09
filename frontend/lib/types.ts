// ────────────────────────────────────────────────────────────
//  Shared TypeScript types
// ────────────────────────────────────────────────────────────

// Qualities used by the Worker and player UI
export type Quality = '4k' | '1080p' | '720p' | '480p' | '360p' | 'best' | 'worst';

export const ALL_QUALITIES: Quality[] = ['4k', '1080p', '720p', '480p', '360p'];

export interface StreamSource {
  url: string;
  quality: Quality;
  mimeType: 'application/x-mpegURL' | 'video/mp4' | string;
  sizeBytes?: number;
}

export interface StreamSubtitle {
  url: string;
  lang: string;
  format: 'srt' | 'vtt' | string;
  label?: string;
}

// ── Worker types ────────────────────────────────────────────
export interface WorkerSearchResult {
  id: string;
  title: string;
  year?: number;
  type: 'movies' | 'tv_series';
  poster?: string;
  backdrop?: string;
  rating?: number;
  duration?: string;
  description?: string;
}

export interface WorkerSearchResponse {
  ok: boolean;
  data?: WorkerSearchResult[];
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerImage {
  url: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  thumbnail?: string;
  averageHueLight?: string;
  averageHueDark?: string;
}

export interface WorkerVideoAddress {
  videoId?: string;
  definition?: string;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
  fps?: number;
  bitrate?: number;
  type?: number;
}

export interface WorkerTrailer {
  VideoAddress?: WorkerVideoAddress;
  cover?: WorkerImage;
}

export interface WorkerStaff {
  staffId: string;
  staffType: number; // 1 = actor, 2 = director
  name: string;
  character?: string;
  avatarUrl?: string;
}

export interface WorkerSeason {
  season_number: number;
  episode_count: number;
  maxEp: number;
  allEp: string; // comma-separated available episodes, e.g. "1,2,4,5"
  resolutions: { resolution: number; epNum: number }[];
}

export interface WorkerDetails {
  id: string;
  title: string;
  year?: number;
  type: 'movies' | 'tv_series';
  description?: string;
  poster?: string;       // full URL from cover.url
  backdrop?: string;     // full URL from stills.url
  rating?: number;       // parsed from imdbRatingValue
  duration?: string;
  durationSeconds?: number;
  genres?: string[];     // split from genre string
  cast?: WorkerStaff[];
  crew?: WorkerStaff[];
  seasons?: WorkerSeason[];
  trailer?: WorkerTrailer;
  trailerUrl?: string;   // direct MP4 URL if available
  stills?: WorkerImage;
  cover?: WorkerImage;
  language?: string;
  country?: string;
  contentRating?: string;
  releaseDate?: string;
  imdbRatingValue?: string;
  subjectId?: string;
  subjectType?: number;
  raw?: any;             // pass-through of raw backend data for edge cases
}

export interface WorkerStream {
  url: string;
  quality: Quality;
  mimeType: string;
  sizeBytes?: number;
  cookies?: string[];                 // CloudFront cookies for DASH/MPD
  resourceId?: string;                // for subtitle lookup
  sources?: StreamSource[];
  subtitles?: StreamSubtitle[];
  referer?: string;
  userAgent?: string;
}

export interface WorkerStreamResponse {
  ok: boolean;
  data?: WorkerStream;
  quality?: Quality;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerEpisode {
  id: string;
  seriesId: string;
  season: number;
  episode: number;
  title?: string;
  url: string;
  quality: Quality;
  mimeType: string;
  sources?: StreamSource[];
  subtitles?: StreamSubtitle[];
}

export interface WorkerEpisodeResponse {
  ok: boolean;
  data?: WorkerEpisode;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerSubtitle {
  url: string;
  lang: string;
  format: 'srt' | 'vtt';
  label?: string;
}

export interface WorkerSubtitleResponse {
  ok: boolean;
  data?: WorkerSubtitle | WorkerSubtitle[];
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerHealth {
  ok: boolean;
  uptime: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
  lastSuccessfulBackend: string | null;
  timestamp: string;
}

export interface WorkerProbeResult {
  name: string;
  ok: boolean;
  latencyMs: number;
  status: number;
  error?: string;
}

export interface WorkerProbeResponse {
  ok: boolean;
  results: WorkerProbeResult[];
  testedAt: string;
}

// ── New worker types (unwired endpoints) ─────────────────────

export interface WorkerRecommendItem {
  id: string;
  title: string;
  poster?: string;
  backdrop?: string;
  rating?: number;
  subjectType?: number;
  releaseDate?: string;
}

export interface WorkerRecommendResponse {
  ok: boolean;
  data?: WorkerRecommendItem[];
  degraded?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerBottomTab {
  btTabType: string;
  name: string;
  btTabCode: string;
  icon?: string;
  statusWhite?: string;
  url?: string;
  operateTabId?: string;
  displayType?: string;
  badge?: string;
}

export interface WorkerHomeTab {
  name: string;
  tabId: number;
  type: string;
  tabCode?: string;
  url?: string;
  nameImage?: string;
  selectNameImage?: string;
  displayType?: string;
}

export interface WorkerBottomTabResponse {
  ok: boolean;
  data?: {
    bottomTabs?: WorkerBottomTab[];
    homeTabs?: WorkerHomeTab[];
    version?: number;
    badgeVer?: number;
  };
  degraded?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerFilterItem {
  id: string | number;
  name: string;
  type?: string;
  values?: { id: string | number; name: string }[];
}

export interface WorkerFilterResponse {
  ok: boolean;
  data?: WorkerFilterItem[];
  degraded?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerListResponse {
  ok: boolean;
  data?: WorkerSearchResult[];
  pager?: { page: number; perPage: number; total: number };
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerDubTrack {
  name: string;
  languageCode?: string;
  url?: string;
}

export interface WorkerDubInfoResponse {
  ok: boolean;
  data?: WorkerDubTrack[];
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerWantToSeeResponse {
  ok: boolean;
  data?: any;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerStreamCaption {
  url: string;
  lang: string;
  format: string;
  label?: string;
}

export interface WorkerStreamCaptionsResponse {
  ok: boolean;
  data?: WorkerStreamCaption[];
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerSearchRankItem {
  keyword: string;
  hot?: number;
}

export interface WorkerSearchRankResponse {
  ok: boolean;
  data?: WorkerSearchRankItem[];
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerResourceItem {
  resourceId: string;
  resolution?: number;
  format?: string;
  size?: number;
  url?: string;
  episode?: number;
  season?: number;
}

export interface WorkerResourceResponse {
  ok: boolean;
  data?: WorkerResourceItem[];
  source?: string;
  error?: { code: string; message: string };
}

// ── APK-mapped types (v5 worker additions) ────────────────────

export interface WorkerShort {
  id: string;
  title: string;
  poster?: string;
  backdrop?: string;
  description?: string;
  duration?: number;
  videoUrl?: string;
  likes?: number;
  plays?: number;
  subjectType?: number;
  releaseDate?: string;
}

export interface WorkerShortsResponse {
  ok: boolean;
  data?: WorkerShort[];
  pager?: { page: number; perPage: number; total: number };
  degraded?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerShortInfo {
  id: string;
  title: string;
  description?: string;
  poster?: string;
  backdrop?: string;
  videoUrl?: string;
  duration?: number;
  plays?: number;
  likes?: number;
  authorId?: string;
  authorName?: string;
}

export interface WorkerShortInfoResponse {
  ok: boolean;
  data?: WorkerShortInfo;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerStaffInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  dob?: string;
  birthplace?: string;
  filmography?: WorkerSearchResult[];
}

export interface WorkerStaffInfoResponse {
  ok: boolean;
  data?: WorkerStaffInfo;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerStaffRelated {
  staffId: string;
  related: WorkerSearchResult[];
}

export interface WorkerStaffRelatedResponse {
  ok: boolean;
  data?: WorkerStaffRelated;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerWidgetSection {
  type: string;
  title?: string;
  items?: WorkerSearchResult[];
}

export interface WorkerWidgetResponse {
  ok: boolean;
  data?: WorkerWidgetSection[];
  degraded?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerDailyRecResponse {
  ok: boolean;
  data?: WorkerSearchResult[];
  degraded?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerPlaylistContentResponse {
  ok: boolean;
  data?: {
    playlistId: string;
    title?: string;
    description?: string;
    items?: WorkerSearchResult[];
  };
  source?: string;
  error?: { code: string; message: string };
}

export interface WorkerSearchSuggestResponse {
  ok: boolean;
  data?: { keyword: string; subjects?: WorkerSearchResult[] }[];
  degraded?: boolean;
  source?: string;
  error?: { code: string; message: string };
}

// ── Component prop types ────────────────────────────────────
export interface MediaCardProps {
  id: string;
  type: 'movie' | 'tv';
  title: string;
  poster: string | null;
  rating?: number;
  year?: string | number;
  onQuickPlay?: () => void;
}

export interface StreamModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  workerId: string | null;
  initialQuality?: Quality;
  episodeInfo?: { season: number; episode: number };
}

export interface TrailerModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl?: string | null;
  title: string;
}

export interface EpisodePickerProps {
  workerId: string | null;
  workerSeasons?: WorkerSeason[];
  onPlay?: (season: number, episode: number, title: string) => void;
}

export interface QualitySelectorProps {
  value: Quality;
  onChange: (q: Quality) => void;
  available?: Quality[];
  size?: 'sm' | 'md';
}

export interface SubtitleSelectorProps {
  subtitles: StreamSubtitle[];
  value: string | null;
  onChange: (lang: string | null) => void;
}
