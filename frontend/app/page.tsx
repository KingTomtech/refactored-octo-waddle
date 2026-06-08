'use client';

import { useState } from 'react';
import { useWorkerHomepage } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { MediaRow } from '@/components/MediaRow';
import { HeroSlider } from '@/components/HeroSlider';
import { yearOf } from '@/lib/utils';

type RawSubject = {
  subjectId: string;
  subjectType: number; // 1=movie, 2=tv, 7=anime
  title: string;
  cover?: { url: string };
  preVideoCover?: { url: string } | null;
  preVideoAddress?: { url: string }[];
  imdbRatingValue?: string;
  releaseDate?: string;
  description?: string;
  countryName?: string;
  language?: string;
  hasResource?: boolean;
};

function isTv(s: RawSubject) {
  return s.subjectType === 2 || s.subjectType === 7;
}

function isMovie(s: RawSubject) {
  return s.subjectType === 1;
}

function pickBackdrop(s: RawSubject): string | null {
  if (s.preVideoCover && typeof s.preVideoCover === 'object' && 'url' in s.preVideoCover) return s.preVideoCover.url ?? null;
  if (s.cover?.url) return s.cover.url;
  return null;
}

function pickPoster(s: RawSubject): string | null {
  return s.cover?.url ?? null;
}

function pickRating(s: RawSubject): number | undefined {
  if (!s.imdbRatingValue) return undefined;
  const n = Number(s.imdbRatingValue);
  return Number.isFinite(n) ? n : undefined;
}

function pickTrailerUrl(s: RawSubject): string | null {
  if (s.preVideoAddress && s.preVideoAddress.length > 0) return s.preVideoAddress[0].url;
  return null;
}

export default function HomePage() {
  const homepage = useWorkerHomepage();

  // The worker /api/homepage returns a flat list of subjects (not sectioned).
  const all: RawSubject[] = Array.isArray(homepage.data?.data)
    ? (homepage.data!.data as RawSubject[])
    : [];

  const movies = all.filter(isMovie);
  const tvs = all.filter(isTv);

  // For the hero we want subjects with a good backdrop. Movies get priority.
  const heroPool: RawSubject[] = [...movies, ...tvs]
    .filter((s) => pickBackdrop(s))
    .slice(0, 8);

  const isLoading = homepage.isLoading;

  // Hero item must include subjectId for the StreamModal to know what to play
  const heroItems = heroPool.map((s) => ({
    id: s.subjectId,
    subjectId: s.subjectId,
    subjectType: s.subjectType,
    title: s.title,
    cover: pickBackdrop(s),
    poster: pickPoster(s),
    backdrop: pickBackdrop(s),
    rating: pickRating(s),
    imdbRatingValue: s.imdbRatingValue,
    year: s.releaseDate ? Number(yearOf(s.releaseDate)) : undefined,
    description: s.description,
    preVideoAddress: s.preVideoAddress,
    preVideoCover: s.preVideoCover,
  }));

  return (
    <div className="-mt-16 sm:-mt-[72px]">
      {/* Hero */}
      {heroItems.length > 0 ? (
        <HeroSlider items={heroItems as any} />
      ) : (
        <div className="h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="mt-4 text-text-muted">Loading…</p>
          </div>
        </div>
      )}

      <div className="mt-12 space-y-10">
        <MediaRow title="Trending Movies ›" href="/browse?type=movie">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <MediaCardSkeleton key={i} />)
            : movies.slice(0, 14).map((s) => (
                <MediaCard
                  key={s.subjectId}
                  id={s.subjectId}
                  type="movie"
                  title={s.title}
                  poster={pickPoster(s)}
                  rating={pickRating(s)}
                  year={s.releaseDate ? yearOf(s.releaseDate) : undefined}
                />
              ))}
        </MediaRow>

        <MediaRow title="TV Series ›" href="/browse?type=tv">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <MediaCardSkeleton key={i} />)
            : tvs.slice(0, 14).map((s) => (
                <MediaCard
                  key={s.subjectId}
                  id={s.subjectId}
                  type="tv"
                  title={s.title}
                  poster={pickPoster(s)}
                  rating={pickRating(s)}
                  year={s.releaseDate ? yearOf(s.releaseDate) : undefined}
                />
              ))}
        </MediaRow>

        <MediaRow title="More to Watch ›" href="/browse?type=movie">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <MediaCardSkeleton key={i} />)
            : all.slice(20, 34).map((s) => (
                <MediaCard
                  key={s.subjectId}
                  id={s.subjectId}
                  type={isTv(s) ? 'tv' : 'movie'}
                  title={s.title}
                  poster={pickPoster(s)}
                  rating={pickRating(s)}
                  year={s.releaseDate ? yearOf(s.releaseDate) : undefined}
                />
              ))}
        </MediaRow>
      </div>
    </div>
  );
}
