'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Film, Tv } from 'lucide-react';
import { useWorkerHomepage } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { cn, yearOf } from '@/lib/utils';

type Type = 'movie' | 'tv';

type RawSubject = {
  subjectId: string;
  subjectType: number;
  title: string;
  cover?: { url: string };
  imdbRatingValue?: string;
  releaseDate?: string;
  hasResource?: boolean;
};

function isTv(s: RawSubject) {
  return s.subjectType === 2 || s.subjectType === 7;
}

export default function BrowseClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<Type>((params.get('type') as Type) || 'movie');

  const homepage = useWorkerHomepage();

  // URL sync
  useEffect(() => {
    const usp = new URLSearchParams();
    usp.set('type', type);
    router.replace(`${pathname}?${usp.toString()}`);
  }, [type, pathname, router]);

  // /api/homepage returns a flat list of subjects, not sectioned
  const all: RawSubject[] = Array.isArray(homepage.data?.data)
    ? (homepage.data!.data as RawSubject[])
    : [];

  const items = type === 'tv' ? all.filter(isTv) : all.filter((s) => !isTv(s));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-display text-3xl tracking-wide mb-4">Browse</h1>

      {/* Type toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setType('movie')}
          className={cn('chip', type === 'movie' && 'chip-active')}
        >
          <Film size={14} /> Movies
        </button>
        <button
          onClick={() => setType('tv')}
          className={cn('chip', type === 'tv' && 'chip-active')}
        >
          <Tv size={14} /> Series
        </button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {homepage.isLoading && Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)}
        {items.map((s) => (
          <MediaCard
            key={s.subjectId}
            id={s.subjectId}
            type={type}
            title={s.title ?? 'Untitled'}
            poster={s.cover?.url ?? null}
            rating={s.imdbRatingValue ? Number(s.imdbRatingValue) : undefined}
            year={s.releaseDate ? yearOf(s.releaseDate) : undefined}
          />
        ))}
        {!homepage.isLoading && items.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted">
            No {type === 'tv' ? 'TV shows' : 'movies'} found.
          </div>
        )}
      </div>
    </div>
  );
}
