'use client';

import { useState } from 'react';
import { useWorkerPlaylistContent } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { MediaRow } from './MediaRow';
import { ListMusic } from 'lucide-react';
import { yearOf } from '@/lib/utils';

function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
  if (t === 2 || t === 'tv_series') return 'tv';
  return 'movie';
}

const SAMPLE_PLAYLISTS = [
  { id: 'p-action', label: 'High-Octane Action' },
  { id: 'p-animation', label: 'Animation Picks' },
];

export function PlaylistSection() {
  const [activeId, setActiveId] = useState(SAMPLE_PLAYLISTS[0].id);
  const playlist = useWorkerPlaylistContent(activeId);

  const items = playlist.data?.data?.items ?? [];
  const title = playlist.data?.data?.title ?? SAMPLE_PLAYLISTS.find((p) => p.id === activeId)?.label ?? 'Playlists';

  // Render tab strip if there's anything to show, including the loading state
  if (!playlist.isLoading && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide max-w-7xl mx-auto px-4 sm:px-6">
        <ListMusic size={20} className="text-accent shrink-0" />
        {SAMPLE_PLAYLISTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={`chip whitespace-nowrap ${activeId === p.id ? 'chip-active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <MediaRow title={title}>
        {playlist.isLoading
          ? Array.from({ length: 8 }).map((_, i) => <MediaCardSkeleton key={i} />)
          : items.slice(0, 14).map((s) => (
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
    </section>
  );
}
