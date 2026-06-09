'use client';

import { useWorkerDetailRec, useWorkerPlayRelatedRec } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { yearOf } from '@/lib/utils';

function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
  if (t === 2 || t === 'tv_series') return 'tv';
  return 'movie';
}

/** "You may also like" recommendations on detail pages */
export function DetailRecSection({ id }: { id: string }) {
  const rec = useWorkerDetailRec(id);
  const items = (rec.data?.data ?? []).slice(0, 10);

  if (!rec.isLoading && items.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-2xl tracking-wide mb-3">You May Also Like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {rec.isLoading && Array.from({ length: 5 }).map((_, i) => <MediaCardSkeleton key={i} />)}
        {items.map((s) => (
          <MediaCard
            key={s.id}
            id={s.id}
            type={subjectTypeToRoute(s.subjectType)}
            title={s.title}
            poster={s.poster ?? null}
            rating={s.rating}
            year={s.releaseDate ? yearOf(s.releaseDate) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

/** Play-related recommendations (shown during/after playback) */
export function PlayRelatedSection({ id }: { id: string }) {
  const rec = useWorkerPlayRelatedRec(id);
  const items = (rec.data?.data ?? []).slice(0, 10);

  if (!rec.isLoading && items.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-2xl tracking-wide mb-3">Related</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {rec.isLoading && Array.from({ length: 5 }).map((_, i) => <MediaCardSkeleton key={i} />)}
        {items.map((s) => (
          <MediaCard
            key={s.id}
            id={s.id}
            type={subjectTypeToRoute(s.subjectType)}
            title={s.title}
            poster={s.poster ?? null}
            rating={s.rating}
            year={s.releaseDate ? yearOf(s.releaseDate) : undefined}
          />
        ))}
      </div>
    </section>
  );
}