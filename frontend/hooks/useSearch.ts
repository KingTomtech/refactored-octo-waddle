// ────────────────────────────────────────────────────────────
//  Worker (MovieBox backend) hooks
// ────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Quality, WorkerStreamResponse, WorkerEpisodeResponse, WorkerDetails } from '@/lib/types';

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
