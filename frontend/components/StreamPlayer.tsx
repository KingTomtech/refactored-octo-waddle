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

  // Stash the latest callback identities in refs so the effects below don't
  // need them in their dep arrays. Otherwise every parent re-render (e.g.
  // when StreamModal updates `currentTime` on every timeupdate) recreates
  // these inline arrow functions, blowing the effect dep array, tearing down
  // the player, and producing the "play, stop, play" / "audio only" bug.
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onCodecUnsupportedRef = useRef(onCodecUnsupported);
  const onTimeRef = useRef(onTime);
  const onPlayingRef = useRef(onPlaying);
  const onPauseRef = useRef(onPause);
  const onVolumeChangeRef = useRef(onVolumeChange);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onCodecUnsupportedRef.current = onCodecUnsupported;
  onTimeRef.current = onTime;
  onPlayingRef.current = onPlaying;
  onPauseRef.current = onPause;
  onVolumeChangeRef.current = onVolumeChange;

  // Wire up native event listeners once. The event handlers read the latest
  // callback identity from the refs above, so re-wiring is never required.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || eventsWiredRef.current) return;
    eventsWiredRef.current = true;

    const hPlay = () => onPlayingRef.current?.();
    const hPause = () => onPauseRef.current?.();
    const hTime = () => onTimeRef.current?.(v.currentTime, v.duration || 0);
    const hMeta = () => onTimeRef.current?.(v.currentTime, v.duration || 0);
    const hVol = () => onVolumeChangeRef.current?.(v.muted);
    const hErr = () => {
      const err = v.error;
      onErrorRef.current?.(err ? `Video: code ${err.code}` : 'Playback error');
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
  }, []);

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
      if (!dashjsReady) return;

      const dashjs = (window as any).dashjs;
      if (!dashjs) {
        onErrorRef.current?.('DASH player not loaded');
        return;
      }

      // Detect native HEVC support. Safari/macOS and Edge/Windows (with
      // HEVC extension) support it natively. Chrome/Firefox do not and
      // need the hevc.js WASM transcoder plugin.
      const v0 = videoRef.current;
      const nativeHevc = v0 && typeof v0.canPlayType === 'function'
        ? !!v0.canPlayType('video/mp4; codecs="hvc1"')
        : false;

      // On non-native-HEVC browsers, we MUST wait for the hevc.js plugin
      // before initializing dash.js — otherwise dash.js will reject the
      // HEVC codec and produce audio-only playback. If hevc.js hasn't
      // loaded yet, arm the watchdog so the user gets a fallback panel
      // if the plugin never loads, and bail out. The effect will re-run
      // when `hevcReady` flips true (effect deps include it).
      if (!nativeHevc && !hevcReady) {
        console.log('[StreamPlayer] waiting for hevc.js plugin to load…');
        // Surface a clear "loading codec…" state in the console so users
        // can see why playback hasn't started. We don't arm a watchdog
        // here because the next effect run (triggered by hevcReady=true)
        // will initialize the player with the transcoder attached.
        return;
      }

      try {
        const player = dashjs.MediaPlayer().create();

        // Safety-net watchdog: if no playable video tracks appear within
        // 10 seconds, fall back to the external-player panel.
        const tracksAvailable = () => {
          try {
            const t = player.getTracksFor('video');
            return t && t.length > 0;
          } catch { return false; }
        };

        const armWatchdog = (reason: string) => {
          if (hevcWatchdogRef.current) clearTimeout(hevcWatchdogRef.current);
          hevcWatchdogRef.current = setTimeout(() => {
            hevcWatchdogRef.current = null;
            if (cancelled) return;
            if (tracksAvailable()) return;
            // Video element might already be playing even if dashjs
            // tracks report is delayed — check for actual playback.
            const ve = videoRef.current;
            if (ve && ve.readyState >= 2 && ve.currentTime > 0) return;
            console.warn(`[StreamPlayer] ${reason} — no playable tracks in 10s, falling back to external players`);
            onCodecUnsupportedRef.current?.();
          }, 10000);
        };

        // Wire up events before async plugin attachment so we don't miss
        // the manifestLoaded callback.
        player.on('error', (e: any) => {
          if (cancelled) return;
          const msg = e?.error?.message || e?.message || 'DASH playback error';
          console.error('[dashjs] error', e);
          onErrorRef.current?.(msg);
        });

        player.on('manifestLoaded', () => {
          if (cancelled) return;
          if (tracksAvailable()) {
            console.log('[StreamPlayer] manifestLoaded — playable video tracks available');
            return;
          }
          // Manifest loaded but no tracks yet — the hevc.js transcoder
          // might still be initializing, or the codec is unsupported.
          if (hevcCleanupRef.current) {
            console.warn('[StreamPlayer] hevc.js attached but no tracks yet — waiting for transcoder');
          } else if (!nativeHevc) {
            console.warn('[StreamPlayer] No native HEVC and no hevc.js plugin — likely unsupported');
          }
          armWatchdog('manifestLoaded but no tracks');
        });

        // If real frames start flowing, cancel the watchdog.
        const onPlaying = () => {
          if (hevcWatchdogRef.current) {
            clearTimeout(hevcWatchdogRef.current);
            hevcWatchdogRef.current = null;
          }
        };
        player.on('play', onPlaying);
        const v2 = videoRef.current;
        if (v2) v2.addEventListener('playing', onPlaying, { once: true });

        // Attach hevc.js WASM transcoder plugin on non-native-HEVC browsers
        // BEFORE calling player.initialize(). The plugin registers a
        // capabilities filter that lets HEVC Representations through dash.js's
        // codec check, and installs an MSE interceptor that transcodes each
        // HEVC segment to H.264 in a Web Worker using the WASM decoder.
        (async () => {
          if (!nativeHevc && hevcReady) {
            const plugin = (window as any).HevcDashjsPlugin;
            if (plugin?.attachHevcSupport) {
              console.log('[StreamPlayer] attaching hevc.js WASM transcoder…');
              try {
                const cleanup = await plugin.attachHevcSupport(player, {
                  workerUrl: HEVC_WORKER_URL,
                  wasmBinaryUrl: HEVC_WASM_URL,
                  forceTranscode: true,
                });
                console.log('[StreamPlayer] hevc.js plugin attached OK');
                hevcCleanupRef.current = cleanup;
              } catch (err) {
                console.warn('[StreamPlayer] hevc.js plugin init failed — will try native dash.js as fallback', err);
                // Plugin failed — arm watchdog immediately. Without the
                // transcoder, dash.js will reject HEVC Representations and
                // produce no playable tracks on non-native-HEVC browsers.
                armWatchdog('hevc.js plugin init failed');
              }
            } else {
              console.warn('[StreamPlayer] HevcDashjsPlugin global not found');
              armWatchdog('hevc.js plugin not available');
            }
          }
          if (cancelled) return;
          console.log(`[StreamPlayer] initializing dash.js (nativeHevc=${nativeHevc}, hevcPlugin=${!!hevcCleanupRef.current})`);
          player.initialize(v, src, autoPlay);
        })();

        dashRef.current = player;
        if (v2) onReadyRef.current?.(v2);
      } catch (e: any) {
        console.error('[StreamPlayer] dashjs init failed', e);
        onErrorRef.current?.(e?.message || 'DASH init failed');
      }
    } else if (isHls) {
      if (!hlsReady) return;
      const Hls = (window as any).Hls;
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (cancelled) return;
          if (data?.fatal) onErrorRef.current?.(`HLS: ${data.details || 'playback error'}`);
        });
        hlsRef.current = hls;
        onReadyRef.current?.(v);
      } else {
        // Safari native HLS
        v.src = src;
        if (autoPlay) v.play().catch(() => {});
        onReadyRef.current?.(v);
      }
    } else {
      // Native MP4
      v.src = src;
      if (autoPlay) v.play().catch(() => {});
      onReadyRef.current?.(v);
    }

    return () => {
      cancelled = true;
      if (hevcWatchdogRef.current) { clearTimeout(hevcWatchdogRef.current); hevcWatchdogRef.current = null; }
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
      if (dashRef.current) { try { dashRef.current.reset(); } catch {} dashRef.current = null; }
      if (hevcCleanupRef.current) { try { hevcCleanupRef.current(); } catch {} hevcCleanupRef.current = null; }
    };
  }, [src, isDash, isHls, autoPlay, dashjsReady, hlsReady, hevcReady]);

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