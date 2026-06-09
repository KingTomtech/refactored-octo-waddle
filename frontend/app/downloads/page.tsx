'use client';

import { useState } from 'react';
import { Download, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useWorkerResourceList } from '@/hooks/useSearch';

function formatBytes(n: number | undefined): string {
  if (!n || n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function resolutionLabel(r: number | undefined): string {
  if (!r) return 'Source';
  if (r >= 2160) return '4K';
  if (r >= 1080) return '1080p';
  if (r >= 720)  return '720p';
  if (r >= 480)  return '480p';
  return `${r}p`;
}

export default function DownloadsPage() {
  const [id, setId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const enabled = !!submitted;

  const resources = useWorkerResourceList(enabled ? submitted : null);

  const items = resources.data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-8 text-center">
        <Download size={40} className="mx-auto text-accent-yellow mb-3" />
        <h1 className="font-display text-3xl tracking-wide mb-2">Resource List</h1>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Paste a subject ID (find one in any movie or series URL — e.g. <code className="text-accent-yellow">/movie/12345</code>) to see downloadable resources and direct links.
        </p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); if (id.trim()) setSubmitted(id.trim()); }}
        className="flex items-stretch gap-2 mb-8"
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Subject ID (e.g. 12345)"
          className="flex-1 px-4 py-2.5 rounded-md bg-white/10 border border-white/10 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          aria-label="Subject ID"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          disabled={!id.trim() || resources.isFetching}
        >
          {resources.isFetching ? <Loader2 size={16} className="animate-spin" /> : 'Lookup'}
        </button>
      </form>

      {resources.error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-200 inline-flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> Couldn&apos;t fetch resources — backend may be rate-limited.
        </div>
      )}

      {resources.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md skeleton-pulse" />
          ))}
        </div>
      )}

      {!resources.isLoading && submitted && items.length === 0 && !resources.error && (
        <div className="text-center py-8 text-text-muted text-sm">
          No downloadable resources for that subject.
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-md overflow-hidden border border-border-subtle divide-y divide-border-subtle">
          {items.map((r) => (
            <a
              key={r.resourceId}
              href={r.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
            >
              <div className="shrink-0 w-12 h-12 rounded bg-bg-tertiary flex items-center justify-center text-text-muted">
                <Download size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{resolutionLabel(r.resolution)}</span>
                  {r.format && <span className="text-xs text-text-muted uppercase">{r.format}</span>}
                  {r.season !== undefined && r.season > 0 && (
                    <span className="text-xs text-text-muted">S{String(r.season).padStart(2, '0')}</span>
                  )}
                  {r.episode !== undefined && r.episode > 0 && (
                    <span className="text-xs text-text-muted">E{String(r.episode).padStart(2, '0')}</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatBytes(r.size)} · {r.resourceId}
                </p>
              </div>
              <ExternalLink size={14} className="text-text-muted shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
