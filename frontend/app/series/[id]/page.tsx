'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  Play, Film, Star, Calendar, Plus, Share2,
  Loader2, AlertCircle, Tv,
} from 'lucide-react';
import { useWorkerDetails, useWorkerSeasonInfo } from '@/hooks/useSearch';
import { cn, ratingColor, yearOf } from '@/lib/utils';
import { CastRow } from '@/components/CastRow';
import { DetailRecSection } from '@/components/DetailRecSection';
import { EpisodePicker } from '@/components/EpisodePicker';
import { StreamModal } from '@/components/StreamModal';
import { TrailerModal } from '@/components/TrailerModal';
import { QualitySelector } from '@/components/QualitySelector';
import type { Quality } from '@/lib/types';

export default function SeriesDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id; // worker subjectId (string)
  const [quality, setQuality] = useState<Quality>('best');
  const [streamOpen, setStreamOpen] = useState(false);
  const [streamEp, setStreamEp] = useState<{ season: number; episode: number; title: string } | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const details = useWorkerDetails(id);
  const seasonsQuery = useWorkerSeasonInfo(id);

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
      </div>
    );
  }
  if (details.isError || !w) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
        <p className="text-lg">Could not load this series.</p>
        <p className="text-accent-yellow text-sm mt-1">Well, that didn&apos;t go as planned. Classic.</p>
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
  const genres = w.genres ?? [];
  const cast = w.cast ?? [];
  const trailerUrl = w.trailerUrl || null;
  const seasonCount = w.seasons?.length ?? seasonsQuery.data?.seasons?.length ?? 0;

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

  return (
    <article>
      <div className="relative w-full h-[50vh] sm:h-[60vh] overflow-hidden">
        {backdrop && <Image src={backdrop} alt={title} fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-32 sm:-mt-48 relative z-10">
        <div className="grid sm:grid-cols-[200px_1fr] lg:grid-cols-[260px_1fr] gap-6">
          <div className="hidden sm:block">
            {poster ? (
              <Image src={poster} alt={title} width={260} height={390} className="w-full rounded-lg shadow-2xl" />
            ) : (
              <div className="aspect-[2/3] bg-bg-tertiary rounded-lg" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-text-muted">TV Series</span>
            </div>
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
              {seasonCount > 0 && <span><Tv size={12} className="inline mr-1" />{seasonCount} season{seasonCount !== 1 && 's'}</span>}
              {genres.slice(0, 3).map((g) => (
                <span key={g} className="px-2 py-0.5 rounded bg-white/10 text-xs">{g}</span>
              ))}
              {w.country && <span className="text-text-muted text-xs">{w.country}</span>}
              {w.language && <span className="text-text-muted text-xs">{w.language}</span>}
            </div>

            <p className="text-base text-text-primary/90 leading-relaxed mb-6 max-w-3xl">
              {description}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {trailerUrl && (
                <button onClick={() => setTrailerOpen(true)} className="btn-secondary">
                  <Film size={16} /> Trailer
                </button>
              )}
              <button onClick={toggleWatchlist} className="btn-secondary">
                <Plus size={16} className={cn(watchlisted && 'rotate-45')} />
                {watchlisted ? 'In Watchlist' : 'Watchlist'}
              </button>
              <button onClick={() => navigator.clipboard?.writeText(typeof window !== 'undefined' ? window.location.href : '')} className="btn-ghost">
                <Share2 size={16} /> Share
              </button>
            </div>

            <div className="mb-6">
              <p className="text-xs text-text-muted mb-1.5">Default quality for episode playback</p>
              <QualitySelector value={quality} onChange={setQuality} size="sm" />
            </div>
          </div>
        </div>

        {/* Episodes */}
        <section className="mt-12">
          <h2 className="font-display text-2xl tracking-wide mb-3">Episodes</h2>
          <EpisodePicker
            workerId={id}
            workerSeasons={w.seasons ?? seasonsQuery.data?.seasons}
            onPlay={(season, episode, title) => {
              setStreamEp({ season, episode, title });
              setStreamOpen(true);
            }}
          />
        </section>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl tracking-wide mb-3">Cast & Crew</h2>
            <CastRow cast={cast} />
          </section>
        )}

        {/* Recommendations */}
        <div className="mt-12">
          <DetailRecSection id={id} />
        </div>
      </div>

      <StreamModal
        open={streamOpen}
        onClose={() => setStreamOpen(false)}
        title={streamEp ? `${title} — ${streamEp.title}` : title}
        workerId={id}
        initialQuality={quality}
        episodeInfo={streamEp ?? undefined}
      />
      <TrailerModal open={trailerOpen} onClose={() => setTrailerOpen(false)} title={title} videoUrl={trailerUrl} />
    </article>
  );
}
