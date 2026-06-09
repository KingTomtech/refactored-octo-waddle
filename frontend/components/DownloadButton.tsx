'use client';

import { useState } from 'react';
import { Download, Loader2, Check, FileText } from 'lucide-react';
import { useStream } from '@/hooks/useStream';
import { vlcDeepLink, iinaDeepLink } from '@/hooks/useStream';
import { cn, downloadStreamPackage } from '@/lib/utils';
import type { Quality } from '@/lib/types';

interface Props {
  workerId: string | null;
  title: string;
  defaultQuality?: Quality;
  variant?: 'button' | 'icon';
}

export function DownloadButton({ workerId, title, defaultQuality = 'best', variant = 'button' }: Props) {
  const [quality, setQuality] = useState<Quality>(defaultQuality);
  const stream = useStream(workerId, quality);
  const [copied, setCopied] = useState(false);

  if (!workerId) {
    return (
      <button disabled className="btn-secondary opacity-50 cursor-not-allowed" title="Stream not available">
        <Download size={16} /> Not Available
      </button>
    );
  }

  const url = stream.primaryUrl;
  if (variant === 'icon') {
    return (
      <a
        href={url ?? '#'}
        target="_blank"
        rel="noreferrer"
        download
        aria-disabled={!url}
        className={cn('p-2 rounded hover:bg-white/10', !url && 'pointer-events-none opacity-50')}
        title="Download"
      >
        {stream.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <a
          href={url ?? '#'}
          target="_blank"
          rel="noreferrer"
          download
          aria-disabled={!url}
          className={cn('btn-primary', !url && 'pointer-events-none opacity-50')}
        >
          {stream.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download
        </a>
        <a href={url ? vlcDeepLink(url) : '#'} className="btn-secondary text-sm">VLC</a>
        <a href={url ? iinaDeepLink(url) : '#'} className="btn-secondary text-sm">IINA</a>
        <button
          onClick={() => {
            if (url) {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }}
          className="btn-ghost text-sm"
          disabled={!url}
        >
          {copied ? <Check size={14} /> : null}
          {copied ? 'Copied' : 'Copy URL'}
        </button>
        <button
          onClick={() => {
            if (url) {
              downloadStreamPackage({
                title,
                primaryUrl: url,
                rawUrl: stream.rawUrl,
                cookies: stream.cookies,
                referer: stream.referer,
              });
            }
          }}
          className="btn-ghost text-sm"
          disabled={!url}
          title="Download stream info as text file"
        >
          <FileText size={14} /> Info
        </button>
      </div>
      <p className="text-xs text-text-muted">{stream.quality ? `Best available: ${stream.quality}` : title}</p>
    </div>
  );
}
