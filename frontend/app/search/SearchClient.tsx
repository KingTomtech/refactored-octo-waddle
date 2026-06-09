'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, X, Film, Tv } from 'lucide-react';
import { useWorkerSearch } from '@/hooks/useSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { SearchBar } from '@/components/SearchBar';
import { cn, yearOf } from '@/lib/utils';
import { useState } from 'react';
import type { WorkerSearchResult } from '@/lib/types';

type FilterType = 'all' | 'movie' | 'tv';

function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
  if (t === 2 || t === 'tv_series') return 'tv';
  return 'movie';
}

export default function SearchClient() {
  const params = useSearchParams();
  const [filter, setFilter] = useState<FilterType>('all');
  const initialQ = params.get('q') || '';

  const debouncedQ = useDebounce(initialQ, 300);
  const workerQ = useWorkerSearch(debouncedQ);

  const workerResults: WorkerSearchResult[] = useMemo(() => {
    const list = workerQ.data?.data ?? [];
    if (filter === 'movie') return list.filter((i) => subjectTypeToRoute((i as any).subjectType) === 'movie');
    if (filter === 'tv') return list.filter((i) => subjectTypeToRoute((i as any).subjectType) === 'tv');
    return list;
  }, [workerQ.data, filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-wide mb-3">Search</h1>
        <SearchBar initial={initialQ} />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {(['all', 'movie', 'tv'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('chip', filter === f && 'chip-active')}
          >
            {f === 'all' ? 'All' : f === 'movie' ? <><Film size={14} /> Movies</> : <><Tv size={14} /> Series</>}
          </button>
        ))}
        {debouncedQ && workerResults.length > 0 && (
          <span className="ml-2 text-sm text-text-muted">
            {workerResults.length} result{workerResults.length !== 1 && 's'} for &ldquo;{debouncedQ}&rdquo;
          </span>
        )}
      </div>

      {/* Empty state (no query) */}
      {!debouncedQ && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted">
          <SearchIcon size={48} className="mb-3" />
          <p className="text-lg">Type something to start searching</p>
          <p className="text-sm mt-1">Try &ldquo;Inception&rdquo;, &ldquo;Breaking Bad&rdquo;, or your favourite actor.</p>
        </div>
      )}

      {/* Results */}
      {debouncedQ && (
        <>
          {/* Loading initial */}
          {workerQ.isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)}
            </div>
          )}

          {/* No results */}
          {!workerQ.isLoading && workerResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted">
              <X size={48} className="mb-3" />
              <p className="text-lg">No results for &ldquo;{debouncedQ}&rdquo;</p>
              <p className="text-sm mt-1">Try a different spelling.</p>
            </div>
          )}

          {/* Worker results */}
          {workerResults.length > 0 && (
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {workerResults.map((item) => (
                  <MediaCard
                    key={item.id}
                    id={item.id}
                    type={subjectTypeToRoute((item as any).subjectType)}
                    title={item.title}
                    poster={item.poster ?? null}
                    rating={item.rating}
                    year={item.year ?? yearOf((item as any).releaseDate)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
