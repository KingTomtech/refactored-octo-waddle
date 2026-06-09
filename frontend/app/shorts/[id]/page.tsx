'use client';

import { useWorkerShortInfo, useWorkerShortsMiniList } from '@/hooks/useSearch';
import { ShortCard } from '@/components/ShortCard';
import { MediaRow } from '@/components/MediaRow';
import { Loader2, Play } from 'lucide-react';

export default function ShortDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const info = useWorkerShortInfo(id);
  const mini = useWorkerShortsMiniList(id, 0, 20);

  const data = info.data?.data;
  const shorts = (mini.data?.data ?? []).filter((s) => !!s.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {info.isLoading && (
        <div className="py-16 text-center text-text-muted inline-flex items-center gap-2 mx-auto">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="aspect-[9/16] md:aspect-[2/3] rounded-md overflow-hidden bg-bg-secondary">
              {data.poster || data.backdrop ? (
                <img
                  src={(data.poster ?? data.backdrop)!}
                  alt={data.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <Play size={48} />
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-3">
              <h1 className="font-display text-3xl tracking-wide">{data.title}</h1>
              {data.authorName && (
                <p className="text-text-secondary text-sm">By {data.authorName}</p>
              )}
              {data.description && (
                <p className="text-text-secondary text-sm leading-relaxed">{data.description}</p>
              )}
              {data.videoUrl && (
                <a
                  href={data.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-md bg-accent text-white text-sm hover:bg-accent-hover"
                >
                  <Play size={14} /> Watch
                </a>
              )}
            </div>
          </div>

          {shorts.length > 0 && (
            <div className="mt-10">
              <MediaRow title="More episodes">
                {shorts.map((s) => <ShortCard key={s.id} short={s} />)}
              </MediaRow>
            </div>
          )}
        </>
      )}
    </div>
  );
}
