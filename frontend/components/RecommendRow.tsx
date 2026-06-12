'use client';

import { useWorkerTopRec } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { MediaRow } from './MediaRow';
import { yearOf } from '@/lib/utils';

function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
  if (t === 2 || t === 'tv_series') return 'tv';
  return 'movie';
}

export function TopRecSection() {
  const rec = useWorkerTopRec();

  const items = (rec.data?.data ?? []).slice(0, 14);

  if (!rec.isLoading && items.length === 0) return null;

  return (
    <MediaRow title="Top Picks for You ›">
      {rec.isLoading
        ? Array.from({ length: 8 }).map((_, i) => <MediaCardSkeleton key={i} />)
        : items.map((s) => (
            <MediaCard
              key={s.id}
              id={s.id}
              type={subjectTypeToRoute(s.subjectType)}
              title={s.title}
              poster={s.poster ?? null}
              rating={s.rating}
              year={s.releaseDate ? yearOf(s.releaseDate) : undefined}
              hasResource={(s as any).hasResource}
              corner={(s as any).corner}
            />
          ))}
    </MediaRow>
  );
}