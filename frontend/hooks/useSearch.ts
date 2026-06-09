// ────────────────────────────────────────────────────────────
//  Worker (DPTV backend) hooks
// ────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Quality, WorkerStreamResponse, WorkerEpisodeResponse, WorkerDetails,
  WorkerRecommendResponse, WorkerBottomTabResponse, WorkerFilterResponse,
  WorkerListResponse, WorkerDubInfoResponse, WorkerWantToSeeResponse,
  WorkerStreamCaptionsResponse, WorkerSearchRankResponse,
  WorkerShortsResponse, WorkerShortInfoResponse, WorkerStaffInfoResponse,
  WorkerStaffRelatedResponse, WorkerWidgetResponse, WorkerDailyRecResponse,
  WorkerPlaylistContentResponse, WorkerSearchSuggestResponse,
  WorkerResourceResponse,
} from '@/lib/types';

export function useWorkerSearch(q: string, type?: 'movies' | 'tv_series') {
  return useQuery({
    queryKey: ['worker', 'search', q, type ?? 'all'],
    queryFn: ({ signal }) => api.search(q, type, 1, 20, signal),
    enabled: q.trim().length > 1,
    staleTime: 30 * 1000,
  });
}

export function useWorkerDetails(id: string | null | undefined, source: 'v1' | 'v2' = 'v1') {
  return useQuery<WorkerDetails>({
    queryKey: ['worker', 'details', id, source],
    queryFn: ({ signal }) => api.details(id!, source, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

export function useWorkerSeasonInfo(id: string | null | undefined) {
  return useQuery({
    queryKey: ['worker', 'seasonInfo', id],
    queryFn: ({ signal }) => api.seasonInfo(id!, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

export function useWorkerStream(id: string | null | undefined, quality: Quality = 'best', season = 0, episode = 0) {
  return useQuery<WorkerStreamResponse>({
    queryKey: ['worker', 'stream', id, quality, season, episode],
    queryFn: ({ signal }) => api.stream(id!, quality, season, episode, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

export function useWorkerEpisode(
  id: string | null | undefined,
  season: number | null,
  episode: number | null,
) {
  return useQuery<WorkerEpisodeResponse>({
    queryKey: ['worker', 'episode', id, season, episode],
    queryFn: ({ signal }) => api.episode(id!, season!, episode!, signal),
    enabled: !!id && season !== null && episode !== null,
    staleTime: 30 * 60 * 1000,
  });
}

export function useWorkerHomepage() {
  return useQuery({
    queryKey: ['worker', 'homepage'],
    queryFn: ({ signal }) => api.homepage(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useWorkerPopular() {
  return useQuery({
    queryKey: ['worker', 'popular'],
    queryFn: ({ signal }) => api.popular(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useWorkerHealth(opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['worker', 'health'],
    queryFn: ({ signal }) => api.health(signal),
    refetchInterval: opts?.refetchInterval ?? 30_000,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useWorkerProbe(opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['worker', 'probe'],
    queryFn: ({ signal }) => api.probe(signal),
    refetchInterval: opts?.refetchInterval ?? 30_000,
    staleTime: 15_000,
    retry: 1,
  });
}

// ── New hooks (from APK audit) ──────────────────────────────────

/** Detail-page recommendations ("You may also like") */
export function useWorkerDetailRec(id: string | null | undefined) {
  return useQuery<WorkerRecommendResponse>({
    queryKey: ['worker', 'detailRec', id],
    queryFn: ({ signal }) => api.detailRec(id!, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/** Top/trending recommendations for homepage */
export function useWorkerTopRec() {
  return useQuery<WorkerRecommendResponse>({
    queryKey: ['worker', 'topRec'],
    queryFn: ({ signal }) => api.topRec(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Bottom tab + home tab configuration */
export function useWorkerBottomTab() {
  return useQuery<WorkerBottomTabResponse>({
    queryKey: ['worker', 'bottomTab'],
    queryFn: ({ signal }) => api.bottomTab('0', signal),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

/** Play-related recommendations (shown during/after playback) */
export function useWorkerPlayRelatedRec(id: string | null | undefined) {
  return useQuery<WorkerRecommendResponse>({
    queryKey: ['worker', 'playRelatedRec', id],
    queryFn: ({ signal }) => api.playRelatedRec(id!, signal),
    enabled: !!id,
    staleTime: 15 * 60 * 1000,
  });
}

/** Dub/audio track info */
export function useWorkerDubInfo(id: string | null | undefined) {
  return useQuery<WorkerDubInfoResponse>({
    queryKey: ['worker', 'dubInfo', id],
    queryFn: ({ signal }) => api.dubInfo(id!, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/** Filter items (genres, years, countries) */
export function useWorkerFilterItems(tabId = '0') {
  return useQuery<WorkerFilterResponse>({
    queryKey: ['worker', 'filterItems', tabId],
    queryFn: ({ signal }) => api.filterItems(tabId, 1, 50, signal),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

/** Paginated content list */
export function useWorkerList(listId = '0', page = 1, pageSize = 20) {
  return useQuery<WorkerListResponse>({
    queryKey: ['worker', 'list', listId, page, pageSize],
    queryFn: ({ signal }) => api.list(listId, page, pageSize, signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** Stream captions (richer subtitle source) */
export function useWorkerStreamCaptions(id: string | null | undefined, streamId?: string) {
  return useQuery<WorkerStreamCaptionsResponse>({
    queryKey: ['worker', 'streamCaptions', id, streamId],
    queryFn: ({ signal }) => api.streamCaptions(id!, streamId, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/** Hot search keywords */
export function useWorkerSearchRank(keyword = '') {
  return useQuery<WorkerSearchRankResponse>({
    queryKey: ['worker', 'searchRank', keyword],
    queryFn: ({ signal }) => api.searchRank(keyword, 10, signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** Want-to-see (watchlist) mutation */
export function useWantToSee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.wantToSee(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worker'] }),
  });
}

/** Have-seen (watched) mutation */
export function useHaveSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.haveSeen(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worker'] }),
  });
}

// ── v5 hooks (APK-mapped endpoints) ─────────────────────────

/** Auto-suggest as the user types in the search bar */
export function useWorkerSearchSuggest(keyword: string, perPage = 10) {
  return useQuery<WorkerSearchSuggestResponse>({
    queryKey: ['worker', 'searchSuggest', keyword, perPage],
    queryFn: ({ signal }) => api.searchSuggest(keyword, perPage, '', signal),
    enabled: keyword.trim().length > 0,
    staleTime: 60 * 1000,
  });
}

/** Trending short-form (vertical) videos */
export function useWorkerShortsTrending(page = 1, perPage = 20) {
  return useQuery<WorkerShortsResponse>({
    queryKey: ['worker', 'shorts', 'trending', page, perPage],
    queryFn: ({ signal }) => api.shortsMostTrending(page, perPage, signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** User's favorite shorts */
export function useWorkerShortsFavorites(page = 1, perPage = 20) {
  return useQuery<WorkerShortsResponse>({
    queryKey: ['worker', 'shorts', 'favorites', page, perPage],
    queryFn: ({ signal }) => api.shortsFavoriteList(page, perPage, signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** Single short's metadata */
export function useWorkerShortInfo(id: string | null | undefined) {
  return useQuery<WorkerShortInfoResponse>({
    queryKey: ['worker', 'shorts', 'info', id],
    queryFn: ({ signal }) => api.shortsGetInfo(id!, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/** Episode rail for a short subject */
export function useWorkerShortsMiniList(id: string | null | undefined, startPosition = 0, endPosition = 20) {
  return useQuery<WorkerShortsResponse>({
    queryKey: ['worker', 'shorts', 'mini', id, startPosition, endPosition],
    queryFn: ({ signal }) => api.shortsMiniList(id!, startPosition, endPosition, signal),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/** Cast/crew member's profile + filmography */
export function useWorkerStaffInfo(id: string | null | undefined) {
  return useQuery<WorkerStaffInfoResponse>({
    queryKey: ['worker', 'staff', 'info', id],
    queryFn: ({ signal }) => api.staffInfo(id!, signal),
    enabled: !!id,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

/** Cast/crew related subjects */
export function useWorkerStaffRelated(id: string | null | undefined) {
  return useQuery<WorkerStaffRelatedResponse>({
    queryKey: ['worker', 'staff', 'related', id],
    queryFn: ({ signal }) => api.staffRelated(id!, signal),
    enabled: !!id,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

/** Server's "pick of the day" */
export function useWorkerDailyRec() {
  return useQuery<WorkerDailyRecResponse>({
    queryKey: ['worker', 'dailyRec'],
    queryFn: ({ signal }) => api.dailyMovieRec(signal),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

/** Home-screen widget payload */
export function useWorkerWidget() {
  return useQuery<WorkerWidgetResponse>({
    queryKey: ['worker', 'widget'],
    queryFn: ({ signal }) => api.widget(signal),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/** Curated playlist of subjects */
export function useWorkerPlaylistContent(playlistId: string | null | undefined) {
  return useQuery<WorkerPlaylistContentResponse>({
    queryKey: ['worker', 'playlist', playlistId],
    queryFn: ({ signal }) => api.playlistContent(playlistId!, signal),
    enabled: !!playlistId,
    staleTime: 60 * 60 * 1000,
  });
}

/** Trending feed v2 */
export function useWorkerTrendingV2(tabId = '0', page = 1) {
  return useQuery({
    queryKey: ['worker', 'trendingV2', tabId, page],
    queryFn: ({ signal }) => api.trendingV2(tabId, page, signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** Resource list (download variants) for a subject */
export function useWorkerResourceList(id: string | null | undefined) {
  return useQuery<WorkerResourceResponse>({
    queryKey: ['worker', 'resource', id],
    queryFn: ({ signal }) => api.resourceList(id!, signal),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}
