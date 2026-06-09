'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Play, Heart, Eye } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { WorkerShort } from '@/lib/types';

interface Props {
  short: WorkerShort;
}

export function ShortCard({ short }: Props) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  const href = `/shorts/${short.id}`;
  const poster = short.poster ?? short.backdrop ?? null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(href); } }}
      whileHover={{ scale: 1.03 }}
      className="card-hover relative shrink-0 w-[160px] sm:w-[180px] aspect-[9/16] rounded-md overflow-hidden bg-bg-secondary cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label={short.title}
    >
      {!loaded && <div className="absolute inset-0 skeleton-pulse" />}
      {poster ? (
        <Image
          src={poster}
          alt={short.title}
          fill
          sizes="(max-width: 640px) 160px, 180px"
          className={`object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary text-text-muted">
          <Play size={36} />
        </div>
      )}

      {/* Bottom gradient + title */}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/95 to-transparent z-10">
        <p className="font-display text-sm leading-tight tracking-wide line-clamp-2" title={short.title}>{short.title}</p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-text-secondary">
          {short.plays !== undefined && (
            <span className="inline-flex items-center gap-0.5"><Eye size={10} />{formatCount(short.plays)}</span>
          )}
          {short.likes !== undefined && (
            <span className="inline-flex items-center gap-0.5"><Heart size={10} />{formatCount(short.likes)}</span>
          )}
        </div>
      </div>

      {/* Play overlay on hover */}
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white">
          <Play size={20} fill="currentColor" />
        </span>
      </div>
    </motion.div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
