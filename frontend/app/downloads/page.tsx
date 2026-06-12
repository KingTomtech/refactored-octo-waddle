'use client';

import { useState } from 'react';
import { Download, Loader2, AlertCircle, ExternalLink, Play, Search } from 'lucide-react';
import { useWorkerResourceList, useWorkerResourcePosition, useStartDownloadResource, useFinishDownloadResource, useSniffConfig } from '@/hooks/useSearch';
import { ResourceDetectors } from '@/components/ResourceDetectors';

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
  const startDownload = useStartDownloadResource();
  const finishDownload = useFinishDownloadResource();
  const [selectedDetector, setSelectedDetector] = useState<any>(null);

  // Position (resume) + sniff (analyze links) per decompile download re-fragments + sniff-config
  const positionQ = useWorkerResourcePosition(enabled && submitted ? { subjectId: submitted } : null);
  const sniffQ = useSniffConfig(enabled && submitted ? { id: submitted } : null);

  const items = resources.data?.data ?? [];
  const detectors = (resources.data as any)?.detectors || [];

  const handleStart = (r: any) => {
    if (!submitted) return;
    startDownload.mutate({ body: { subjectId: submitted, resourceId: r.resourceId }, host: '' });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-8 text-center">
        <Download size={40} className="mx-auto text-accent-yellow mb-3" />
        <h1 className="font-display text-3xl tracking-wide mb-2">Resource List</h1>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Paste a subject ID (find one in any movie or series URL — e.g. <code className="text-accent-yellow">/movie/12345</code>) to see downloadable resources and direct links. Supports resourceDetectors (multi-source from decompile).
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

      {/* Rich detectors from decompile via dedicated component (APK adapter pattern) */}
      {detectors.length > 0 && (
        <div className="mb-6">
          <ResourceDetectors detectors={detectors} subjectId={submitted || undefined} />
          <button onClick={() => setSelectedDetector(detectors[0])} className="text-xs mt-2 text-accent hover:underline">Select first for tracking demo</button>
          {selectedDetector && <div className="mt-1 text-xs">Selected for start/finish: {selectedDetector.source}</div>}
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-md overflow-hidden border border-border-subtle divide-y divide-border-subtle">
          {items.map((r) => (
            <div key={r.resourceId} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
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
              <a href={r.url ?? '#'} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent">
                <ExternalLink size={14} />
              </a>
              <button onClick={() => handleStart(r)} className="text-xs px-2 py-1 bg-accent/10 rounded hover:bg-accent/20" disabled={startDownload.isPending}>
                {startDownload.isPending ? 'Starting...' : 'Start'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Position (resume) + Sniff + Finish full demo */}
      {submitted && (
        <div className="mt-6 p-3 rounded border border-border-subtle bg-bg-tertiary/40 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => sniffQ.refetch()}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 rounded hover:bg-white/20"
              disabled={sniffQ.isFetching}
            >
              <Search size={12} /> Sniff config (analyze links)
            </button>
            {sniffQ.isLoading && <Loader2 size={12} className="animate-spin" />}
            {sniffQ.data && <span className="text-accent">Sniff OK (see console or raw for links)</span>}
          </div>

          <div>
            Position / resume: {positionQ.isLoading ? '…' : (positionQ.data ? JSON.stringify(positionQ.data).slice(0,120) : 'no pos')}
            <button onClick={() => positionQ.refetch()} className="ml-2 underline">refresh</button>
          </div>

          <div className="pt-1">
            <button
              onClick={() => {
                if (!submitted || !selectedDetector) return;
                finishDownload.mutate({ body: { subjectId: submitted, resourceId: selectedDetector.resourceId || items[0]?.resourceId }, host: '' });
              }}
              className="text-xs px-3 py-1.5 bg-accent/80 text-white rounded hover:bg-accent disabled:opacity-50"
              disabled={!selectedDetector || finishDownload.isPending}
            >
              {finishDownload.isPending ? 'Finishing…' : 'Finish Download (using selected)'}
            </button>
            <span className="ml-2 text-text-muted">APK re-detector + start/finish/position/sniff full flow</span>
          </div>
        </div>
      )}
    </div>
  );
}
