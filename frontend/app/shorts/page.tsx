'use client';

import { useState } from 'react';
import { useWorkerShortsTrending, useWorkerShortsFavorites, useWorkerShortsOperating } from '@/hooks/useSearch';
import { ShortCard } from '@/components/ShortCard';
import { Sparkles, Heart, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'trending' as const, label: 'Trending', icon: Sparkles },
  { id: 'discover' as const, label: 'Discover', icon: Compass },
  { id: 'favorites' as const, label: 'Favorites', icon: Heart },
];

export default function ShortsPage() {
  const [active, setActive] = useState<'trending' | 'discover' | 'favorites'>('trending');
  const trending = useWorkerShortsTrending(1, 30);
  const discover = useWorkerShortsOperating();
  const favorites = useWorkerShortsFavorites(1, 30);
  const q = active === 'trending' ? trending : active === 'discover' ? discover : favorites;

  let shorts: any[] = [];
  if (active === 'discover') {
    // OperatingResp: banners + ops (from decompile ShortTVDiscover, operating list)
    const ops = (q.data?.data?.ops || q.data?.data || []);
    shorts = Array.isArray(ops) ? ops.flatMap((op: any) => op.subjects || op.items || []).filter((s: any) => s?.id) : [];
  } else {
    shorts = (q.data?.data ?? []).filter((s: any) => !!s.id);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide">Shorts</h1>
        <p className="text-text-secondary mt-1 text-sm">Bite-sized vertical videos. (Discover uses operating from decompile for banners/sections.)</p>
      </header>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn('chip inline-flex items-center gap-1 whitespace-nowrap', active === tab.id && 'chip-active')}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {q.isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-md skeleton-pulse" />
          ))}
        </div>
      )}

      {!q.isLoading && shorts.length === 0 && (
        <div className="py-16 text-center text-text-muted">
          {active === 'favorites' ? 'No favorites yet.' : active === 'discover' ? 'No discover sections.' : 'No shorts to show right now.'}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {shorts.map((s) => <ShortCard key={s.id || s.subjectId} short={s} />)}
      </div>

      {/* OperatingResp sections (banners + ops per ShortTVDiscoverFragment / getOperatingList from decompile) */}
      {active === 'discover' && q.data?.data && (
        <div className="mt-8 space-y-6">
          {q.data.data.banners && Array.isArray(q.data.data.banners) && (
            <div>
              <div className="text-xs uppercase tracking-widest text-text-muted mb-2">Featured</div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {q.data.data.banners.map((b: any, i: number) => (
                  <div key={i} className="shrink-0 w-40 text-xs p-2 rounded bg-bg-tertiary/60 border border-border-subtle">{b.title || b.name || 'Banner'}</div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(q.data.data.ops) && q.data.data.ops.length > 0 && (
            <div className="text-xs text-text-muted">Discover sections loaded from /shorts/operating (OperatingResp).</div>
          )}
        </div>
      )}
    </div>
  );
}
