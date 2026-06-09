'use client';

import { useWorkerDailyRec } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { MediaRow } from './MediaRow';
import { Sparkles } from 'lucide-react';
import { yearOf } from '@/lib/utils';

function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
  if (t === 2 || t === 'tv_series') return 'tv';
  return 'movie';
}

export function DailyPicksSection() {
  const daily = useWorkerDailyRec();
  const items = (daily.data?.data ?? []).slice(0, 12);

  if (!daily.isLoading && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="font-display text-2xl sm:text-3xl tracking-wide inline-flex items-center gap-2">
          <Sparkles size={20} className="text-accent-yellow" />
          Daily Picks
        </h2>
      </div>
      <div className="scroll-row flex gap-3 overflow-x-auto px-4 sm:px-6 max-w-[100vw]">
        {daily.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <MediaCardSkeleton key={i} />)
          : items.map((s) => (
              <MediaCard
                key={s.id}
                id={s.id}
                type={subjectTypeToRoute(s.type)}
                title={s.title}
                poster={s.poster ?? null}
                rating={s.rating}
                year={s.year ?? yearOf((s as any).releaseDate)}
              />
            ))}
      </div>
    </section>
  );
}
