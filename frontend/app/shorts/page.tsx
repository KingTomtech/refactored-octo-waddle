'use client';

import { useState } from 'react';
import { useWorkerShortsTrending, useWorkerShortsFavorites } from '@/hooks/useSearch';
import { ShortCard } from '@/components/ShortCard';
import { Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'trending' as const, label: 'Trending', icon: Sparkles },
  { id: 'favorites' as const, label: 'Favorites', icon: Heart },
];

export default function ShortsPage() {
  const [active, setActive] = useState<'trending' | 'favorites'>('trending');
  const trending = useWorkerShortsTrending(1, 30);
  const favorites = useWorkerShortsFavorites(1, 30);
  const q = active === 'trending' ? trending : favorites;

  const shorts = (q.data?.data ?? []).filter((s) => !!s.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide">Shorts</h1>
        <p className="text-text-secondary mt-1 text-sm">Bite-sized vertical videos.</p>
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
          {active === 'favorites' ? 'No favorites yet.' : 'No shorts to show right now.'}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {shorts.map((s) => <ShortCard key={s.id} short={s} />)}
      </div>
    </div>
  );
}
