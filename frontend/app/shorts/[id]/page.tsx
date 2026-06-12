'use client';

import { useState } from 'react';
import { useWorkerShortInfo, useWorkerShortsMiniList, useWorkerShortsDubInfo } from '@/hooks/useSearch';
import { ShortCard } from '@/components/ShortCard';
import { MediaRow } from '@/components/MediaRow';
import { StreamModal } from '@/components/StreamModal';
import { Loader2, Play } from 'lucide-react';

export default function ShortDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [streamOpen, setStreamOpen] = useState(false);
  const info = useWorkerShortInfo(id);
  const mini = useWorkerShortsMiniList(id, 0, 20);
  const dubs = useWorkerShortsDubInfo(id);

  const data = info.data?.data;
  const shorts = (mini.data?.data ?? []).filter((s) => !!s.id);
  const dubList = dubs.data?.data ?? [];

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
              <div className="flex gap-2 pt-1">
                {data.videoUrl && (
                  <a
                    href={data.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm hover:bg-accent-hover"
                  >
                    <Play size={14} /> Watch direct
                  </a>
                )}
                <button onClick={() => setStreamOpen(true)} className="btn-secondary text-sm">
                  <Play size={14} /> Play via proxy
                </button>
              </div>
              {dubList.length > 0 && (
                <div className="text-xs text-text-muted">Dubs: {dubList.map((d: any) => d.name || d.languageCode).join(', ')}</div>
              )}
            </div>
          </div>

          {shorts.length > 0 && (
            <div className="mt-10">
              <MediaRow title="More episodes (mini-list)">
                {shorts.map((s) => <ShortCard key={s.id} short={s} />)}
              </MediaRow>
            </div>
          )}
        </>
      )}

      <StreamModal
        open={streamOpen}
        onClose={() => setStreamOpen(false)}
        title={data?.title || 'Short'}
        workerId={id}
      />
    </div>
  );
}
