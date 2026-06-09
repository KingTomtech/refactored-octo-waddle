'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, AlertCircle, Download, Share2, RefreshCw,
  Loader2, Volume2, Globe, Play, Pause, FileText,
} from 'lucide-react';
import { useStream, vlcDeepLink, iinaDeepLink, shareStream } from '@/hooks/useStream';
import { fetchAndConvertSrt } from '@/lib/srt-to-vtt';
import { QualitySelector } from './QualitySelector';
import { SubtitleSelector } from './SubtitleSelector';
import { cn, isHlsUrl, isMp4Url, formatTime, downloadStreamPackage } from '@/lib/utils';
import type { Quality, StreamSubtitle } from '@/lib/types';

// Player is loaded client-only so its static imports of dashjs/hls.js never
// run during SSR (they touch `window` at module load).
const StreamPlayer = dynamic(
  () => import('./StreamPlayer').then((m) => m.StreamPlayer),
  { ssr: false, loading: () => null }
);

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  workerId: string | null;
  initialQuality?: Quality;
  episodeInfo?: { season: number; episode: number };
}

export function StreamModal({ open, onClose, title, workerId, initialQuality = 'best', episodeInfo }: Props) {
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'copied' | 'unsupported'>('idle');
  const [cookieCopyState, setCookieCopyState] = useState<'idle' | 'copied'>('idle');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [hevcNotSupported, setHevcNotSupported] = useState(false);
  const [showStreamInfo, setShowStreamInfo] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stream = useStream(workerId, quality, episodeInfo?.season ?? 0, episodeInfo?.episode ?? 0);
  const primaryUrl = stream.primaryUrl;
  const isHls = isHlsUrl(primaryUrl);
  const isMp4 = isMp4Url(primaryUrl);
  const isDash = stream.isDash;

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setQuality(initialQuality);
      setActiveSubtitle(null);
      setVttUrl(null);
      setCopyState('idle');
      setShareState('idle');
      setPlayerError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setMuted(false);
      setHevcNotSupported(false);
    }
  }, [open, initialQuality]);

  const subtitles: StreamSubtitle[] = stream.subtitles;

  // Fetch subtitle VTT when a language is selected
  useEffect(() => {
    if (!workerId || !activeSubtitle) return;
    let cancelled = false;
    (async () => {
      try {
        const sub = subtitles.find((s) => s.lang === activeSubtitle || s.label === activeSubtitle);
        if (!sub?.url) return;
        const vtt = await fetchAndConvertSrt(sub.url);
        if (!cancelled) setVttUrl(vtt);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [workerId, activeSubtitle, subtitles]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  // Cleanup vtt blob URL
  useEffect(() => {
    return () => { if (vttUrl) URL.revokeObjectURL(vttUrl); };
  }, [vttUrl]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch((e) => setPlayerError(e.message));
    else v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function seek(to: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration || 0, to));
  }

  function fullscreen() {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.requestFullscreen?.().catch(() => {});
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-6xl max-h-[95vh] bg-bg-secondary rounded-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h2 className="font-display text-lg tracking-wide truncate pr-2">{title}</h2>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded hover:bg-white/10"
                aria-label="Close player"
              >
                <X size={20} />
              </button>
            </div>

            {/* Player surface */}
            <div className="relative flex-1 bg-black min-h-[260px] sm:min-h-[400px] flex items-center justify-center">
              {stream.isLoading && (
                <div className="flex flex-col items-center gap-3 text-text-secondary">
                  <Loader2 size={32} className="animate-spin" />
                  <p>Resolving stream…</p>
                </div>
              )}

              {!stream.isLoading && stream.isError && (
                <div className="flex flex-col items-center gap-3 text-text-muted p-6 text-center">
                  <AlertCircle size={40} className="text-red-400" />
                  <p className="font-medium text-text-primary">Well, that didn&apos;t go as planned. Classic.</p>
                  <p className="text-sm">Could not find a playable stream for this title right now.</p>
                  <button onClick={() => stream.refetch()} className="btn-secondary text-sm">
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              )}

              {!stream.isLoading && !stream.isError && !primaryUrl && (
                <div className="flex flex-col items-center gap-3 text-text-muted p-6 text-center">
                  <AlertCircle size={40} />
                  <p className="font-medium text-text-primary">Looks like this one&apos;s taking a nap. Maximum effort required.</p>
                  <p className="text-sm max-w-md">This title is not currently available. Use the Open Stream / VLC / IINA links below if a URL appears.</p>
                </div>
              )}

              {/* Video element + client-only player wiring */}
              {primaryUrl && (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Hide video if we know the codec isn't supported. The action bar
                      below (Open Stream / VLC / IINA) always remains visible. */}
                  {isDash && hevcNotSupported ? (
                    <div className="flex flex-col items-center gap-3 text-text-muted p-6 text-center max-w-lg">
                      <AlertCircle size={40} className="text-amber-400" />
                      <p className="font-medium text-text-primary">HEVC playback not available</p>
                      <p className="text-sm text-accent-yellow mt-1">No luck, chimichangas.</p>
                      <p className="text-sm">This stream is encoded in H.265/HEVC. Open it in a desktop player that supports HEVC — the proxy URL below includes authentication cookies.</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <a href={vlcDeepLink(primaryUrl)} className="btn-primary text-sm" title="Open in VLC (all platforms)">
                          <Volume2 size={14} /> Open in VLC
                        </a>
                        <a href={iinaDeepLink(primaryUrl)} className="btn-secondary text-sm" title="Open in IINA (macOS)">
                          <Globe size={14} /> IINA
                        </a>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(primaryUrl);
                            setCopyState('copied');
                            setTimeout(() => setCopyState('idle'), 2000);
                          }}
                          className="btn-secondary text-sm"
                          title="Copy stream URL for mpv, ffplay, etc."
                        >
                          <Download size={14} /> {copyState === 'copied' ? 'Copied!' : 'Copy URL'}
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Tip: <code className="bg-white/10 px-1 rounded">mpv &quot;{primaryUrl}&quot;</code> also works
                      </p>
                    </div>
                  ) : (
                    <StreamPlayer
                      key={`${primaryUrl}-${quality}`}
                      src={primaryUrl}
                      isDash={isDash}
                      isHls={isHls}
                      autoPlay={true}
                      muted={muted}
                      className="w-full h-full max-h-[80vh] bg-black"
                      onReady={(v) => { videoRef.current = v; }}
                      onError={(msg) => setPlayerError(msg)}
                      onCodecUnsupported={() => setHevcNotSupported(true)}
                      onTime={(t, d) => { setCurrentTime(t); if (Number.isFinite(d) && d > 0) setDuration(d); }}
                      onPlaying={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onVolumeChange={(m) => setMuted(m)}
                      onNativeClick={togglePlay}
                    />
                  )}

                  {/* Centered play overlay when paused */}
                  {!isPlaying && !playerError && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                      aria-label="Play"
                    >
                      <span className="flex items-center justify-center w-20 h-20 rounded-full bg-accent text-white shadow-2xl">
                        <Play size={36} fill="currentColor" />
                      </span>
                    </button>
                  )}

                  {/* Subtitle tracks attach directly to the video element */}
                  {vttUrl && (
                    <SubtitleTrackAdder videoRef={videoRef} vttUrl={vttUrl} lang={activeSubtitle ?? 'en'} label={activeSubtitle ?? 'English'} />
                  )}

                  {/* Player error toast */}
                  {playerError && (
                    <div className="absolute top-3 left-3 right-3 px-3 py-2 rounded bg-red-900/80 text-sm text-white flex items-center gap-2">
                      <AlertCircle size={16} />
                      {playerError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom controls + action bar — always visible */}
            <div className="px-4 py-3 border-t border-border-subtle space-y-3 bg-bg-secondary">
              {/* Quality + Captions */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs text-text-muted mb-1.5">Quality</p>
                  <QualitySelector value={quality} onChange={setQuality} size="sm" />
                </div>
                {subtitles.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1.5">Captions</p>
                    <SubtitleSelector subtitles={subtitles} value={activeSubtitle} onChange={setActiveSubtitle} />
                  </div>
                )}
                {primaryUrl && (
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={togglePlay}
                      className="btn-primary text-sm"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <><Pause size={14} fill="currentColor" /> Pause</> : <><Play size={14} fill="currentColor" /> Play</>}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="btn-secondary text-sm"
                      aria-label={muted ? 'Unmute' : 'Mute'}
                    >
                      <Volume2 size={14} className={cn(muted && 'opacity-40')} />
                    </button>
                    <button
                      onClick={fullscreen}
                      className="btn-secondary text-sm"
                      aria-label="Fullscreen"
                    >
                      ⛶
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {primaryUrl && duration > 0 && (
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="w-12 text-right tabular-nums">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={(e) => seek(Number(e.target.value))}
                    className="flex-1 accent-accent"
                    aria-label="Seek"
                  />
                  <span className="w-12 tabular-nums">{formatTime(duration)}</span>
                </div>
              )}

              {/* Action buttons — always visible so user always has a path */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {primaryUrl && (
                  <>
                    <a
                      href={primaryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-sm"
                      title="Open stream URL in new tab"
                    >
                      <Download size={14} /> Open Stream
                    </a>
                    <button
                      onClick={async () => {
                        const r = await shareStream(title, primaryUrl);
                        setShareState(r);
                        setTimeout(() => setShareState('idle'), 2500);
                      }}
                      className="btn-secondary text-sm"
                    >
                      <Share2 size={14} />
                      {shareState === 'shared' ? 'Shared' : shareState === 'copied' ? 'Copied!' : 'Share'}
                    </button>
                    <a href={vlcDeepLink(primaryUrl)} className="btn-secondary text-sm" title="Open in VLC">
                      <Volume2 size={14} /> VLC
                    </a>
                    <a href={iinaDeepLink(primaryUrl)} className="btn-secondary text-sm" title="Open in IINA (macOS)">
                      <Globe size={14} /> IINA
                    </a>
                    <button
                      onClick={() => downloadStreamPackage({
                        title,
                        primaryUrl: primaryUrl,
                        rawUrl: stream.rawUrl,
                        cookies: stream.cookies,
                        referer: stream.referer,
                      })}
                      className="btn-secondary text-sm"
                      title="Download stream info as text file (URL, cookies, mpv/vlc commands)"
                    >
                      <FileText size={14} /> Info
                    </button>
                  </>
                )}
                <div className="ml-auto text-xs text-text-muted flex items-center gap-1.5">
                  {episodeInfo && (
                    <span className="px-2 py-0.5 rounded bg-white/10">
                      S{episodeInfo.season} · E{episodeInfo.episode}
                    </span>
                  )}
                  {stream.quality && <span>· {stream.quality}</span>}
                </div>
              </div>

              {/* Stream info — collapsible block. Surfaces the proxy URL (what
                  Open Stream / VLC / IINA actually use) and the raw MPD URL
                  with the signed CloudFront cookies, so the user can paste
                  them into mpv / ffplay / curl. The proxy is what makes
                  browser-side playback and `vlc://` deep links work without
                  any client-side cookie handling. */}
              {primaryUrl && (
                <div className="pt-2 border-t border-border-subtle">
                  <button
                    onClick={() => setShowStreamInfo((s) => !s)}
                    className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1.5"
                  >
                    {showStreamInfo ? '▾' : '▸'} Stream info
                    {stream.cookies.length > 0 && (
                      <span className="text-text-muted">· {stream.cookies.length} cookies</span>
                    )}
                  </button>
                  {showStreamInfo && (
                    <div className="mt-2 space-y-3 text-xs">
                      <UrlRow
                        label={stream.proxyUrl ? 'Proxy URL (Open Stream / VLC / IINA use this)' : 'URL'}
                        value={primaryUrl}
                        copyState={copyState}
                        onCopy={async () => {
                          try { await navigator.clipboard.writeText(primaryUrl); setCopyState('copied'); setTimeout(() => setCopyState('idle'), 1500); } catch {}
                        }}
                      />
                      {stream.rawUrl && stream.rawUrl !== stream.proxyUrl && (
                        <UrlRow
                          label="Raw MPD URL (for mpv / ffplay with cookies)"
                          value={stream.rawUrl}
                          copyState={copyState}
                          onCopy={async () => {
                            try { await navigator.clipboard.writeText(stream.rawUrl!); setCopyState('copied'); setTimeout(() => setCopyState('idle'), 1500); } catch {}
                          }}
                        />
                      )}
                      {stream.referer && (
                        <div>
                          <p className="text-text-muted mb-1">Referer</p>
                          <code className="block px-2 py-1.5 rounded bg-black/30 border border-border-subtle break-all font-mono text-[11px] leading-snug">
                            {stream.referer}
                          </code>
                        </div>
                      )}
                      {stream.cookies.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-text-muted">CloudFront cookies (paste into mpv if needed)</p>
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(stream.cookies.join('; '));
                                  setCookieCopyState('copied');
                                  setTimeout(() => setCookieCopyState('idle'), 1500);
                                } catch {}
                              }}
                              className="btn-secondary text-[11px] px-2 py-1"
                            >
                              {cookieCopyState === 'copied' ? 'Copied' : 'Copy all'}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {stream.cookies.map((c, i) => (
                              <code key={i} className="block px-2 py-1.5 rounded bg-black/30 border border-border-subtle break-all font-mono text-[11px] leading-snug">
                                {c.length > 200 ? c.slice(0, 200) + '…' : c}
                              </code>
                            ))}
                          </div>
                          {stream.rawUrl && (
                            <p className="text-text-muted mt-2 font-mono text-[10px]">
                              mpv --http-header=&quot;Cookie: {stream.cookies.map(c => c.split('=')[0]).join('; ')}=…&quot; '{stream.rawUrl}'
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper: renders a labeled <code> block with a copy button.
function UrlRow({
  label,
  value,
  copyState,
  onCopy,
}: {
  label: string;
  value: string;
  copyState: 'idle' | 'copied';
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="text-text-muted mb-1">{label}</p>
      <div className="flex items-stretch gap-1">
        <code className="flex-1 px-2 py-1.5 rounded bg-black/30 border border-border-subtle break-all font-mono text-[11px] leading-snug">
          {value}
        </code>
        <button
          onClick={onCopy}
          className="btn-secondary text-[11px] px-2 py-1.5"
        >
          {copyState === 'copied' ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// Helper: attaches a <track> element to the underlying <video> when VTT URL is ready.
function SubtitleTrackAdder({
  videoRef,
  vttUrl,
  lang,
  label,
}: {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  vttUrl: string;
  lang: string;
  label: string;
}) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Remove any prior tracks we added
    v.querySelectorAll('track[data-subtitle]').forEach((t) => t.remove());
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = vttUrl;
    track.srclang = lang;
    track.label = label;
    track.default = true;
    track.setAttribute('data-subtitle', '1');
    v.appendChild(track);
    return () => {
      try { track.remove(); } catch {}
    };
  }, [videoRef, vttUrl, lang, label]);
  return null;
}
