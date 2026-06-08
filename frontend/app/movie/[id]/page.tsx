'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  Play, Film, Star, Clock, Calendar, Plus, Share2,
  Loader2, AlertCircle,
} from 'lucide-react';
import { useWorkerDetails } from '@/hooks/useSearch';
import { cn, formatRuntime, ratingColor, yearOf } from '@/lib/utils';
import { CastRow } from '@/components/CastRow';
import { StreamModal } from '@/components/StreamModal';
import { TrailerModal } from '@/components/TrailerModal';
import { QualitySelector } from '@/components/QualitySelector';
import type { Quality } from '@/lib/types';

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id; // worker subjectId (string)
  const [streamOpen, setStreamOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [quality, setQuality] = useState<Quality>('best');
  const [watchlisted, setWatchlisted] = useState(false);
  const details = useWorkerDetails(id);

  // Initialise watchlist state from localStorage (client-only)
  useEffect(() => {
    try {
      const wl: string[] = JSON.parse(localStorage.getItem('watchlist') || '[]');
      if (Array.isArray(wl) && wl.includes(id)) {
        setWatchlisted(true);
      }
    } catch { /* */ }
  }, [id]);

  const w = details.data;

  if (details.isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="aspect-[16/9] w-full rounded-lg skeleton" />
        <div className="mt-6 grid sm:grid-cols-[200px_1fr] gap-6">
          <div className="aspect-[2/3] rounded skeleton" />
          <div className="space-y-3">
            <div className="h-8 w-2/3 rounded skeleton" />
            <div className="h-4 w-1/3 rounded skeleton" />
            <div className="h-20 w-full rounded skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (details.isError || !w) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
        <p className="text-lg">Could not load this title.</p>
        <p className="text-sm text-text-muted mt-1">{details.error instanceof Error ? details.error.message : 'Unknown error'}</p>
      </div>
    );
  }

  const title = w.title || 'Untitled';
  const poster = w.poster || null;
  const backdrop = w.backdrop || null;
  const description = w.description || 'No overview available.';
  const rating = w.rating || 0;
  const year = w.releaseDate ? yearOf(w.releaseDate) : undefined;
  const runtime = w.duration || (w.durationSeconds ? formatRuntime(w.durationSeconds) : '');
  const genres = w.genres ?? [];
  const cast = w.cast ?? [];
  const trailerUrl = w.trailerUrl || null;

  function toggleWatchlist() {
    if (typeof window === 'undefined') return;
    try {
      const wl: string[] = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const idx = wl.indexOf(id);
      if (idx >= 0) wl.splice(idx, 1);
      else wl.push(id);
      localStorage.setItem('watchlist', JSON.stringify(wl));
      setWatchlisted(idx < 0);
    } catch { /* */ }
  }

  async function shareTitle() {
    if (typeof navigator === 'undefined') return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) { try { await navigator.share({ title, url }); } catch { /* */ } }
    else { try { await navigator.clipboard.writeText(url); } catch { /* */ } }
  }

  return (
    <article>
      {/* Backdrop */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] overflow-hidden">
        {backdrop && <Image src={backdrop} alt={title} fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-32 sm:-mt-48 relative z-10">
        <div className="grid sm:grid-cols-[200px_1fr] lg:grid-cols-[260px_1fr] gap-6">
          {/* Poster */}
          <div className="hidden sm:block">
            {poster ? (
              <Image src={poster} alt={title} width={260} height={390} className="w-full rounded-lg shadow-2xl" />
            ) : (
              <div className="aspect-[2/3] bg-bg-tertiary rounded-lg" />
            )}
          </div>

          {/* Meta */}
          <div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide leading-none mb-2">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary mb-4">
              {rating > 0 && (
                <span className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded font-semibold',
                  ratingColor(rating) === 'good' && 'bg-rating-good/20 text-rating-good',
                  ratingColor(rating) === 'mid' && 'bg-rating-mid/20 text-rating-mid',
                  ratingColor(rating) === 'bad' && 'bg-rating-bad/20 text-rating-bad',
                )}>
                  <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
                </span>
              )}
              {year && <span className="flex items-center gap-1"><Calendar size={12} /> {year}</span>}
              {runtime && <span className="flex items-center gap-1"><Clock size={12} /> {runtime}</span>}
              {genres.slice(0, 3).map((g) => (
                <span key={g} className="px-2 py-0.5 rounded bg-white/10 text-xs">{g}</span>
              ))}
              {w.country && <span className="text-text-muted text-xs">{w.country}</span>}
              {w.language && <span className="text-text-muted text-xs">{w.language}</span>}
            </div>

            <p className="text-base text-text-primary/90 leading-relaxed mb-6 max-w-3xl">
              {description}
            </p>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => setStreamOpen(true)}
                className="btn-primary"
              >
                <Play size={16} fill="currentColor" /> Watch
              </button>
              {trailerUrl && (
                <button onClick={() => setTrailerOpen(true)} className="btn-secondary">
                  <Film size={16} /> Trailer
                </button>
              )}
              <button onClick={toggleWatchlist} className="btn-secondary">
                <Plus size={16} className={cn(watchlisted && 'rotate-45 transition-transform')} />
                {watchlisted ? 'In Watchlist' : 'Watchlist'}
              </button>
              <button onClick={shareTitle} className="btn-ghost"><Share2 size={16} /> Share</button>
            </div>

            {/* Quality picker */}
            <div className="mb-6">
              <p className="text-xs text-text-muted mb-1.5">Quality</p>
              <QualitySelector value={quality} onChange={setQuality} size="sm" />
            </div>
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl tracking-wide mb-3">Cast & Crew</h2>
            <CastRow cast={cast} />
          </section>
        )}

        {/* Stills */}
        {w.stills && (w.stills as any).url && (
          <section className="mt-12">
            <h2 className="font-display text-2xl tracking-wide mb-3">Stills</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="relative aspect-video rounded overflow-hidden bg-bg-tertiary">
                <Image src={(w.stills as any).url} alt={title} fill sizes="33vw" className="object-cover" />
              </div>
            </div>
          </section>
        )}
      </div>

      <StreamModal
        open={streamOpen}
        onClose={() => setStreamOpen(false)}
        title={title}
        workerId={id}
        initialQuality={quality}
      />
      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={title}
        videoUrl={trailerUrl}
      />
    </article>
  );
}
