'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { cn, yearOf } from '@/lib/utils';
import type { WorkerSearchResult } from '@/lib/types';

type TrendingTab = {
  label: string;
  tabId: string;
  subjectType?: number;
};

const TRENDING_TABS: TrendingTab[] = [
  { label: 'All', tabId: '0' },
  { label: 'Movies', tabId: '1', subjectType: 1 },
  { label: 'TV Series', tabId: '2', subjectType: 2 },
  { label: 'Anime', tabId: '7', subjectType: 7 },
];

function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
  if (t === 2 || t === 'tv_series') return 'tv';
  return 'movie';
}

export function TrendingSection() {
  const [activeTab, setActiveTab] = useState('0');

  const trending = useQuery({
    queryKey: ['worker', 'trending', activeTab],
    queryFn: ({ signal }) => api.trending(activeTab as any, signal),
    staleTime: 5 * 60 * 1000,
  });

  // The trending endpoint returns data.items[].subjects or flat data
  const subjects: WorkerSearchResult[] = (() => {
    const raw = trending.data;
    if (!raw) return [];
    // Data might be flat array or nested under items[].subjects
    if (Array.isArray((raw as any).data)) return (raw as any).data;
    if (Array.isArray((raw as any).data?.items)) {
      return (raw as any).data.items.flatMap((item: any) =>
        Array.isArray(item.subjects) ? item.subjects : [item],
      );
    }
    return [];
  })();

  return (
    <section>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {TRENDING_TABS.map((tab) => (
          <button
            key={tab.tabId}
            onClick={() => setActiveTab(tab.tabId)}
            className={cn(
              'chip whitespace-nowrap',
              activeTab === tab.tabId && 'chip-active',
            )}
          >
            {tab.label}
          </button>
        ))}
        {/* Live/Sports hint from decompile (SportLiveProvider / LiveListItem in home operate) */}
        <span className="text-[10px] text-accent ml-1">Live in tabs/operating where present</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {trending.isLoading && Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)}
        {!trending.isLoading && subjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted">
            No trending content found.
          </div>
        )}
        {subjects.slice(0, 15).map((s) => (
          <MediaCard
            key={s.id || (s as any).subjectId}
            id={s.id || (s as any).subjectId}
            type={subjectTypeToRoute((s as any).subjectType ?? s.type)}
            title={s.title}
            poster={s.poster ?? (s as any).cover?.url ?? null}
            rating={s.rating}
            year={s.year ?? yearOf((s as any).releaseDate)}
            hasResource={(s as any).hasResource}
            corner={(s as any).corner}
          />
        ))}
      </div>
    </section>
  );
}