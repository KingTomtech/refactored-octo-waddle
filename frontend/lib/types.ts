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
