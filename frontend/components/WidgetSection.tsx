'use client';

import { useWorkerWidget } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { MediaRow } from './MediaRow';
import { yearOf } from '@/lib/utils';

function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
  if (t === 2 || t === 'tv_series') return 'tv';
  return 'movie';
}

export function WidgetSection() {
  const widget = useWorkerWidget();
  const sections = (widget.data?.data ?? []).filter((s) => (s.items?.length ?? 0) > 0);

  if (!widget.isLoading && sections.length === 0) return null;

  return (
    <>
      {widget.isLoading
        ? Array.from({ length: 1 }).map((_, i) => (
            <MediaRow key={`ws-${i}`} title="For You">
              {Array.from({ length: 8 }).map((__, j) => <MediaCardSkeleton key={j} />)}
            </MediaRow>
          ))
        : sections.map((section, idx) => (
            <MediaRow key={`ws-${idx}`} title={section.title ?? 'For You'}>
              {(section.items ?? []).slice(0, 12).map((s) => (
                <MediaCard
                  key={s.id}
                  id={s.id}
                  type={subjectTypeToRoute(s.type)}
                  title={s.title}
                  poster={s.poster ?? null}
                  rating={s.rating}
                  year={s.year ?? yearOf((s as any).releaseDate)}
                  hasResource={(s as any).hasResource}
                  corner={(s as any).corner}
                />
              ))}
            </MediaRow>
          ))}
    </>
  );
}
