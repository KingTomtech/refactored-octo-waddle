// ────────────────────────────────────────────────────────────
//  Convenience stream hook wrapping useWorkerStream
//  + VLC / IINA / share helpers
// ────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useWorkerStream } from './useSearch';
import { isHlsUrl, isMp4Url } from '@/lib/utils';
import type { Quality, StreamSource, StreamSubtitle } from '@/lib/types';

const WORKER_BASE = process.env.NEXT_PUBLIC_WORKER_URL ?? '';

// Worker returns relative URLs (e.g. `/api/proxy?token=…`) for DASH playback.
// The page is served by Next.js, so the browser would resolve them against the
// Next origin and 404. Rewrite to the worker origin.
function absolutize(u: string | null | undefined): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/api/') && WORKER_BASE) {
    const base = WORKER_BASE.replace(/\/$/, '');
    return `${base}${u}`;
  }
  return u;
}

export interface StreamResult {
  sources: StreamSource[];
  primaryUrl: string | null;
  rawUrl: string | null;
  proxyUrl: string | null;
  isHls: boolean;
  isMp4: boolean;
  isDash: boolean;
  quality: Quality | null;
  cookies: string[];
  referer: string | null;
  resourceId: string | null;
  subtitles: StreamSubtitle[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useStream(
  workerId: string | null | undefined,
  quality: Quality = 'best',
  season = 0,
  episode = 0,
): StreamResult {
  const q = useWorkerStream(workerId, quality, season, episode);

  return useMemo<StreamResult>(() => {
    const data: any = q.data?.data;
    const sources: StreamSource[] = [];

    if (data) {
      if (data.url) {
        const absUrl = absolutize(data.url)!;
        sources.push({
          url: absUrl,
          quality: (data.quality as Quality) || quality,
          mimeType: data.mimeType || (isHlsUrl(absUrl) ? 'application/x-mpegURL' : 'video/mp4'),
        });
      }
      if (Array.isArray(data.sources)) {
        // also absolutize any relative URLs the worker might have returned
        for (const s of data.sources) {
          if (s?.url) sources.push({ ...s, url: absolutize(s.url) ?? s.url });
        }
      }
    }

    const primaryUrl = sources[0]?.url ?? null;
    const mime = data?.mimeType || '';
    const isDash = mime.includes('dash') || (primaryUrl?.includes('.mpd') ?? false) || data?.format === 'dash';

    return {
      sources,
      primaryUrl,
      rawUrl: data?.rawUrl ?? null,
      proxyUrl: data?.proxyUrl ?? null,
      isHls: isHlsUrl(primaryUrl),
      isMp4: isMp4Url(primaryUrl),
      isDash,
      quality: (data?.quality as Quality) ?? quality,
      cookies: Array.isArray(data?.cookies) ? data!.cookies : [],
      referer: typeof data?.referer === 'string' ? data.referer : null,
      resourceId: data?.resourceId ?? null,
      subtitles: Array.isArray(data?.subtitles) ? data.subtitles : [],
      isLoading: q.isLoading,
      isError: q.isError,
      error: q.error,
      refetch: q.refetch,
    };
  }, [q.data, q.isLoading, q.isError, q.error, q.refetch, quality]);
}

// ── External-player helpers ─────────────────────────────────

export function vlcDeepLink(streamUrl: string): string {
  return `vlc://${streamUrl}`;
}

export function iinaDeepLink(streamUrl: string): string {
  return `iina://weblink?url=${encodeURIComponent(streamUrl)}`;
}

export function mxPlayerDeepLink(streamUrl: string): string {
  // Android: MX Player accepts http(s) streams
  return `intent://${streamUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.mxtech.videoplayer.ad;end`;
}

export async function shareStream(title: string, streamUrl: string): Promise<'shared' | 'copied' | 'unsupported'> {
  if (typeof navigator === 'undefined') return 'unsupported';
  if (navigator.share) {
    try {
      await navigator.share({ title, url: streamUrl });
      return 'shared';
    } catch { /* fallthrough */ }
  }
  try {
    await navigator.clipboard.writeText(streamUrl);
    return 'copied';
  } catch {
    return 'unsupported';
  }
}
