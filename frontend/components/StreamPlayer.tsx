'use client';

// Client-only video element + dashjs/hls.js wiring. Player libraries are
// loaded as UMD <script> tags via useScript so they're available on the
// `window` and never imported at module-load (no SSR / hydration risk).

import { useEffect, useRef } from 'react';
import { useScript } from '@/hooks/useScript';

interface Props {
  src: string;
  isDash: boolean;
  isHls: boolean;
  autoPlay: boolean;
  muted: boolean;
  className?: string;
  onReady?: (video: HTMLVideoElement) => void;
  onError?: (msg: string) => void;
  onCodecUnsupported?: () => void;
  onTime?: (currentTime: number, duration: number) => void;
  onPlaying?: () => void;
  onPause?: () => void;
  onVolumeChange?: (muted: boolean) => void;
  onNativeClick?: () => void;
}

const DASHJS_SRC = '/vendor/dashjs.min.js';
const HLSJS_SRC = '/vendor/hls.min.js';
const HEVCJS_SRC = '/vendor/hevcjs-plugin.umd.js';
const HEVC_WORKER_URL = '/vendor/hevc/transcode-worker.js';
const HEVC_WASM_URL = '/vendor/hevc/wasm/hevc-decode.wasm';

export function StreamPlayer({
  src,
  isDash,
  isHls,
  autoPlay,
  muted,
  className,
  onReady,
  onError,
  onCodecUnsupported,
  onTime,
  onPlaying,
  onPause,
  onVolumeChange,
  onNativeClick,
}: Props) {
  const dashjsReady = useScript(DASHJS_SRC, 'dashjs');
  const hlsReady = useScript(HLSJS_SRC, 'Hls');
  const hevcReady = useScript(HEVCJS_SRC, 'HevcDashjsPlugin');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dashRef = useRef<any>(null);
  const hlsRef = useRef<any>(null);
  const hevcCleanupRef = useRef<(() => void) | null>(null);
  const hevcWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsWiredRef = useRef(false);

  // Wire up native event listeners once
  useEffect(() => {
    const v = videoRef.current;
    if (!v || eventsWiredRef.current) return;
    eventsWiredRef.current = true;

    const hPlay = () => onPlaying?.();
    const hPause = () => onPause?.();
    const hTime = () => onTime?.(v.currentTime, v.duration || 0);
    const hMeta = () => onTime?.(v.currentTime, v.duration || 0);
    const hVol = () => onVolumeChange?.(v.muted);
    const hErr = () => {
      const err = v.error;
      onError?.(err ? `Video: code ${err.code}` : 'Playback error');
    };
    v.addEventListener('play', hPlay);
    v.addEventListener('pause', hPause);
    v.addEventListener('timeupdate', hTime);
    v.addEventListener('loadedmetadata', hMeta);
    v.addEventListener('durationchange', hMeta);
    v.addEventListener('volumechange', hVol);
    v.addEventListener('error', hErr);
    return () => {
      v.removeEventListener('play', hPlay);
      v.removeEventListener('pause', hPause);
      v.removeEventListener('timeupdate', hTime);
      v.removeEventListener('loadedmetadata', hMeta);
      v.removeEventListener('durationchange', hMeta);
      v.removeEventListener('volumechange', hVol);
      v.removeEventListener('error', hErr);
      eventsWiredRef.current = false;
    };
  }, [onPlaying, onPause, onTime, onError, onVolumeChange]);

  // Attach the right player when the source changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    if (typeof window === 'undefined') return;

    // Tear down previous
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    if (dashRef.current) {
      try { dashRef.current.reset(); } catch {}
      dashRef.current = null;
    }
    if (hevcCleanupRef.current) {
      try { hevcCleanupRef.current(); } catch {}
      hevcCleanupRef.current = null;
    }
    try { v.removeAttribute('src'); v.load(); } catch {}

    let cancelled = false;

    if (isDash) {
      if (!dashjsReady) return; // will retry when ready
      const dashjs = (window as any).dashjs;
      if (!dashjs) {
        onError?.('DASH player not loaded');
        return;
      }
      try {
        const player = dashjs.MediaPlayer().create();

        // Pre-flight: MPD codec probe. If every video Representation is
        // HEVC (`hvc*`/`hev*`) and this Chromium build cannot decode HEVC
        // natively, there is no point spinning up the dashjs player + the
        // hevc.js WASM transcoder (the transcoder's init-segment handling
        // is incompatible with dashjs 5.x's timestampOffset flush behavior,
        // so the stream cannot play in-Chrome). Surface the external-player
        // fallback UI up-front so the user is not stuck on a black surface.
        // (Safari macOS will report native HEVC support and skip this path.)
        const v0 = videoRef.current;
        const hevcCodecTest = v0 && typeof v0.canPlayType === 'function'
          ? v0.canPlayType('video/mp4; codecs="hvc1"')
          : '';
        if (v0 && (hevcCodecTest === '' || hevcCodecTest === 'no')) {
          // Chromium/Firefox with no native HEVC. Show the fallback UI
          // immediately rather than waiting for the dashjs failure chain.
          console.log('[StreamPlayer] No native HEVC support — showing external-player fallback');
          onCodecUnsupported?.();
          return;
        }

        // Universal safety-net watchdog: if the player never produces
        // playable video tracks within 6s — whether the hevc.js plugin is
        // attached, the manifest fails to parse, or any other failure mode
        // — surface the external-player fallback so the user is not stuck
        // looking at a black surface. The actual handler is wired below
        // (it inspects `tracksAvailable()` and `hevcCleanupRef`).
        if (hevcWatchdogRef.current) clearTimeout(hevcWatchdogRef.current);
        hevcWatchdogRef.current = setTimeout(() => {
          hevcWatchdogRef.current = null;
          if (cancelled) return;
          try {
            const t = player.getTracksFor('video');
            if (t && t.length > 0) return;
          } catch { /* fall through */ }
          console.warn('[StreamPlayer] dashjs produced no playable video tracks within 6s — falling back to external players');
          onCodecUnsupported?.();
        }, 6000);

        // Async setup: attach hevc.js plugin BEFORE initialize. The plugin:
        //  - is a no-op on Safari / browsers with native HEVC support
        //  - on Chromium, registers a capabilities filter that lets the
        //    HEVC Representations through, and installs an MSE interceptor
        //    that transcodes each HEVC segment to H.264 in a Web Worker
        //    using WebCodecs + our WASM decoder.
        (async () => {
          if (hevcReady) {
            const plugin = (window as any).HevcDashjsPlugin;
            if (plugin?.attachHevcSupport) {
              console.log('[StreamPlayer] attaching hevc.js plugin…');
              try {
                // Force the MSE interceptor to install regardless of native
                // HEVC detection — dashjs's CapabilitiesFilter removes HEVC
                // Representations even when MediaSource.isTypeSupported returns
                // true, so we must override the filter and route every segment
                // through the WASM transcoder. On Safari the native decoder is
                // used inside the worker; on Chromium we transcode to H.264.
                const cleanup = await plugin.attachHevcSupport(player, {
                  workerUrl: HEVC_WORKER_URL,
                  wasmBinaryUrl: HEVC_WASM_URL,
                  forceTranscode: true,
                });
                console.log('[StreamPlayer] hevc.js plugin attached');
                hevcCleanupRef.current = cleanup;
              } catch (err) {
                console.warn('[StreamPlayer] hevc.js plugin init failed', err);
              }
            } else {
              console.warn('[StreamPlayer] HevcDashjsPlugin global not found');
            }
          } else {
            console.log('[StreamPlayer] hevc.js plugin script not yet ready');
          }
          if (cancelled) return;
          player.initialize(v, src, autoPlay);
        })();

        player.on('error', (e: any) => {
          if (cancelled) return;
          const msg = e?.error?.message || e?.message || 'DASH playback error';
          console.error('[dashjs] error', e);
          onError?.(msg);
        });
        // After manifest parses, decide whether the stream is playable in this
        // browser. Three paths:
        //  1) hevc.js plugin attached AND we got tracks → leave player alive
        //  2) plugin attached but no tracks after the watchdog window (the
        //     plugin's MSE intercept could not feed the transcoder an init
        //     segment — a known incompatibility with dashjs 5.x's
        //     timestampOffset flush behavior) → fall back to the
        //     external-player panel
        //  3) plugin never attached (script missing, etc.) AND no tracks →
        //     fall back to external-player panel
        const tracksAvailable = () => {
          try {
            const t = player.getTracksFor('video');
            return t && t.length > 0;
          } catch { return false; }
        };
        const armWatchdog = () => {
          if (hevcWatchdogRef.current) clearTimeout(hevcWatchdogRef.current);
          hevcWatchdogRef.current = setTimeout(() => {
            hevcWatchdogRef.current = null;
            if (cancelled) return;
            if (tracksAvailable()) return;
            console.warn('[StreamPlayer] no playable video tracks within 6s — falling back to external players');
            onCodecUnsupported?.();
          }, 6000);
        };
        player.on('manifestLoaded', () => {
          if (cancelled) return;
          if (tracksAvailable()) {
            console.log('[StreamPlayer] manifestLoaded with playable video tracks');
            return;
          }
          if (hevcCleanupRef.current) {
            console.warn('[StreamPlayer] hevc.js attached but no tracks — waiting for transcoder to initialize');
          } else {
            console.warn('[StreamPlayer] No playable video tracks after manifest parse');
          }
          armWatchdog();
        });
        // If real frames ever start flowing, cancel the watchdog.
        const onPlaying = () => {
          if (hevcWatchdogRef.current) { clearTimeout(hevcWatchdogRef.current); hevcWatchdogRef.current = null; }
        };
        player.on('play', onPlaying);
        // Also wire to the video element directly for broader coverage.
        const v = videoRef.current;
        if (v) v.addEventListener('playing', onPlaying, { once: true });
        dashRef.current = player;
        onReady?.(v);
      } catch (e: any) {
        console.error('[StreamPlayer] dashjs init failed', e);
        onError?.(e?.message || 'DASH init failed');
      }
    } else if (isHls) {
      if (!hlsReady) return; // will retry when ready
      const Hls = (window as any).Hls;
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (cancelled) return;
          if (data?.fatal) onError?.(`HLS: ${data.details || 'playback error'}`);
        });
        hlsRef.current = hls;
        onReady?.(v);
      } else {
        // Safari native HLS
        v.src = src;
        if (autoPlay) v.play().catch(() => {});
        onReady?.(v);
      }
    } else {
      // Native MP4
      v.src = src;
      if (autoPlay) v.play().catch(() => {});
      onReady?.(v);
    }

    return () => {
      cancelled = true;
      if (hevcWatchdogRef.current) { clearTimeout(hevcWatchdogRef.current); hevcWatchdogRef.current = null; }
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
      if (dashRef.current) { try { dashRef.current.reset(); } catch {} dashRef.current = null; }
      if (hevcCleanupRef.current) { try { hevcCleanupRef.current(); } catch {} hevcCleanupRef.current = null; }
    };
  }, [src, isDash, isHls, autoPlay, dashjsReady, hlsReady, hevcReady, onError, onReady]);

  return (
    <video
      ref={videoRef}
      className={className}
      controls
      autoPlay={autoPlay}
      playsInline
      muted={muted}
      crossOrigin="anonymous"
      onClick={onNativeClick}
    />
  );
}
