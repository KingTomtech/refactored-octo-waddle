'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Play, Info, Film } from 'lucide-react';
import { cn, ratingColor, yearOf } from '@/lib/utils';
import { StreamModal } from './StreamModal';
import { TrailerModal } from './TrailerModal';
import type { Quality, WorkerSearchResult } from '@/lib/types';

interface Props {
  // Worker-shaped hero pool. We accept WorkerSearchResult plus the raw
  // cover.url / preVideoCover.url fields that are present on the homepage
  // sections but not always normalised.
  items: (WorkerSearchResult & {
    subjectId?: string;
    subjectType?: number;
    cover?: { url: string } | string;
    preVideoCover?: { url: string } | string;
    preVideoAddress?: { url: string }[];
    imdbRatingValue?: string | number;
    description?: string;
  })[];
  autoAdvanceMs?: number;
}

type HeroItem = Props['items'][number];

function pickType(item: HeroItem): 'movie' | 'tv' {
  return item.subjectType === 2 || item.type === 'tv_series' ? 'tv' : 'movie';
}

function pickBackdrop(item: HeroItem): string | null {
  if (typeof item.cover === 'string') return item.cover;
  if (item.cover && typeof item.cover === 'object' && 'url' in item.cover) return (item.cover as any).url ?? null;
  if (typeof item.preVideoCover === 'string') return item.preVideoCover;
  if (item.preVideoCover && typeof item.preVideoCover === 'object' && 'url' in item.preVideoCover) return (item.preVideoCover as any).url ?? null;
  return item.backdrop ?? item.poster ?? null;
}

function pickTitle(item: HeroItem): string {
  return item.title || 'Untitled';
}

function pickRating(item: HeroItem): number | undefined {
  if (typeof item.rating === 'number') return item.rating;
  if (item.imdbRatingValue) {
    const n = Number(item.imdbRatingValue);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function pickTrailerUrl(item: HeroItem): string | null {
  if (item.preVideoAddress && item.preVideoAddress.length > 0) return item.preVideoAddress[0].url;
  return null;
}

export function HeroSlider({ items, autoAdvanceMs = 6000 }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const top = items.filter((i) => pickBackdrop(i)).slice(0, 5);
  if (!top.length) return null;
  const item = top[index % top.length];
  const type = pickType(item);
  const title = pickTitle(item);
  const year = item.year;
  const backdrop = pickBackdrop(item);
  const rating = pickRating(item);
  const subjectId = item.subjectId ?? item.id;
  const overview = (item as any).overview ?? (item as any).description ?? '';
  const trailerUrl = pickTrailerUrl(item);

  const [streamOpen, setStreamOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  // For TV subjects, "Watch Now" needs a real (season, episode). Fetching that
  // here would be expensive; route TV clicks to the series detail page which has
  // an episode picker.
  function handleWatchNow() {
    if (type === 'tv') {
      router.push(`/series/${subjectId}`);
    } else {
      setStreamOpen(true);
    }
  }

  // Auto-advance
  useEffect(() => {
    if (top.length < 2) return;
    function tick() {
      if (Date.now() < pausedUntil) {
        timerRef.current = setTimeout(tick, Math.max(500, pausedUntil - Date.now()));
        return;
      }
      setIndex((i) => (i + 1) % top.length);
      timerRef.current = setTimeout(tick, autoAdvanceMs);
    }
    timerRef.current = setTimeout(tick, autoAdvanceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [top.length, autoAdvanceMs, pausedUntil]);

  function jumpTo(i: number) {
    setIndex(i);
    setPausedUntil(Date.now() + 10_000);
  }

  return (
    <section className="relative w-full h-[80vh] sm:h-[88vh] overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={subjectId}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {backdrop && (
            <Image
              src={backdrop}
              alt={title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/40 to-transparent" />
          <div className="absolute inset-0 bg-vignette-red pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-end pb-20 sm:pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${subjectId}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <p className="text-sm uppercase tracking-widest text-text-secondary mb-2">
              {type === 'movie' ? 'Movie' : 'Series'}{year ? ` · ${year}` : ''}
            </p>
            <h1 className="font-display text-5xl sm:text-7xl tracking-wide leading-none mb-3 text-shadow-red">
              {title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-text-secondary mb-4">
              {rating !== undefined && rating > 0 && (
                <span className={cn(
                  'px-2 py-0.5 rounded font-semibold',
                  ratingColor(rating) === 'good' && 'bg-rating-good/20 text-rating-good',
                  ratingColor(rating) === 'mid' && 'bg-rating-mid/20 text-rating-mid',
                  ratingColor(rating) === 'bad' && 'bg-rating-bad/20 text-rating-bad',
                )}>
                  ★ {rating.toFixed(1)}
                </span>
              )}
              {overview && <span className="line-clamp-1">{overview}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-6">
              <button
                onClick={handleWatchNow}
                className="btn-primary text-base"
              >
                <Play size={18} fill="currentColor" /> {type === 'tv' ? 'View Episodes' : 'Watch Now'}
              </button>
              <button
                onClick={() => router.push(type === 'movie' ? `/movie/${subjectId}` : `/series/${subjectId}`)}
                className="btn-secondary text-base"
              >
                <Info size={18} /> More Info
              </button>
              {trailerUrl && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="btn-ghost text-base"
                  aria-label="Watch trailer"
                >
                  <Film size={18} /> Trailer
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar + Dots */}
      {top.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10">
          {/* Progress bar */}
          <div className="w-64 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div
              key={index % top.length}
              className="h-full bg-accent rounded-full animate-progress-fill"
              style={{ '--slide-duration': `${autoAdvanceMs}ms` } as React.CSSProperties}
            />
          </div>
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {top.map((_, i) => (
              <button
                key={i}
                onClick={() => jumpTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index % top.length ? 'w-8 bg-accent shadow-glow-red' : 'w-1.5 bg-white/30 hover:bg-accent/50',
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <StreamModal
        open={streamOpen}
        onClose={() => setStreamOpen(false)}
        title={title}
        workerId={subjectId ?? null}
        initialQuality={'best' as Quality}
      />
      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={title}
        videoUrl={trailerUrl}
      />
    </section>
  );
}
