'use client';

import { useWorkerStaffInfo, useWorkerStaffRelated } from '@/hooks/useSearch';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { User, Loader2 } from 'lucide-react';

export default function StaffPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const info = useWorkerStaffInfo(id);
  const related = useWorkerStaffRelated(id);

  const data = info.data?.data;
  const filmography = data?.filmography ?? [];
  const moreRelated = (related.data?.data?.related ?? []).filter((s) => !filmography.some((f) => f.id === s.id));

  function subjectTypeToRoute(t: number | string | undefined): 'movie' | 'tv' {
    if (t === 2 || t === 'tv_series') return 'tv';
    return 'movie';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {info.isLoading && (
        <div className="py-16 text-center text-text-muted inline-flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center md:items-start gap-3">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.name} className="w-40 h-40 rounded-full object-cover" />
            ) : (
              <div className="w-40 h-40 rounded-full bg-bg-tertiary flex items-center justify-center text-text-muted">
                <User size={48} />
              </div>
            )}
            <h1 className="font-display text-2xl tracking-wide text-center md:text-left">{data.name}</h1>
            {(data.dob || data.birthplace) && (
              <p className="text-xs text-text-muted text-center md:text-left">
                {[data.dob, data.birthplace].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            {data.bio && <p className="text-text-secondary leading-relaxed text-sm">{data.bio}</p>}

            {filmography.length > 0 && (
              <section>
                <h2 className="font-display text-xl mb-3">Filmography</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filmography.map((s) => (
                    <MediaCard
                      key={s.id}
                      id={s.id}
                      type={subjectTypeToRoute(s.type)}
                      title={s.title}
                      poster={s.poster ?? null}
                      rating={s.rating}
                      year={s.year}
                    />
                  ))}
                </div>
              </section>
            )}

            {related.isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <MediaCardSkeleton key={i} />)}
              </div>
            )}

            {moreRelated.length > 0 && (
              <section className="mt-6">
                <h2 className="font-display text-xl mb-3">Related</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {moreRelated.slice(0, 8).map((s) => (
                    <MediaCard
                      key={s.id}
                      id={s.id}
                      type={subjectTypeToRoute(s.type)}
                      title={s.title}
                      poster={s.poster ?? null}
                      rating={s.rating}
                      year={s.year}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
