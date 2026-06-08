'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Play, Star, Film, Tv } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, ratingColor } from '@/lib/utils';
import type { MediaCardProps } from '@/lib/types';

export function MediaCard({ id, type, title, poster, rating, year, onQuickPlay }: MediaCardProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [hover, setHover] = useState(false);

  const href = type === 'movie' ? `/movie/${id}` : `/series/${id}`;
  const ratingCls = ratingColor(rating);
  const ratingColorMap = { good: 'text-rating-good', mid: 'text-rating-mid', bad: 'text-rating-bad', muted: 'text-text-muted' };
  // Worker returns absolute URLs for posters; pass through unchanged.
  const posterUrl = poster?.startsWith('http') ? poster : poster ?? null;

  function handleClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-quickplay]')) return;
    router.push(href);
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(href); } }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ scale: 1.04, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative shrink-0 w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] rounded-md overflow-hidden bg-bg-secondary cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label={`${title}${year ? ` (${year})` : ''}`}
    >
      {/* Skeleton */}
      {!loaded && <div className="absolute inset-0 skeleton" />}

      {/* Poster */}
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, 200px"
          className={cn('object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary text-text-muted">
          {type === 'movie' ? <Film size={48} /> : <Tv size={48} />}
        </div>
      )}

      {/* Type badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-semibold tracking-wider text-white uppercase">
          {type === 'movie' ? 'Movie' : 'Series'}
        </span>
      </div>

      {/* Rating badge */}
      {rating !== undefined && rating > 0 && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-xs font-semibold">
          <Star size={10} className={ratingColorMap[ratingCls]} fill="currentColor" />
          <span className={ratingColorMap[ratingCls]}>{rating.toFixed(1)}</span>
        </div>
      )}

      {/* Quick-play button on hover */}
      {onQuickPlay && hover && (
        <button
          data-quickplay
          onClick={(e) => { e.stopPropagation(); onQuickPlay(); }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 transition-opacity"
          aria-label={`Quick play ${title}`}
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white shadow-lg hover:bg-accent-hover transition-colors">
            <Play size={20} fill="currentColor" />
          </span>
        </button>
      )}

      {/* Title bar */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/95 to-transparent z-10">
        <p className="font-display text-base leading-tight tracking-wide truncate" title={title}>{title}</p>
        {year && <p className="text-xs text-text-secondary mt-0.5">{year}</p>}
      </div>
    </motion.div>
  );
}

export function MediaCardSkeleton() {
  return <div className="shrink-0 w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] rounded-md skeleton" />;
}
