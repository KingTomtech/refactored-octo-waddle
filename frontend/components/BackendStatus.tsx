'use client';

import { useState } from 'react';
import { useWorkerProbe, useWorkerHealth } from '@/hooks/useSearch';
import { Activity, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BackendStatus() {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const probe = useWorkerProbe({ refetchInterval: 60_000 });
  const health = useWorkerHealth({ refetchInterval: 60_000 });

  if (dismissed) return null;
  if (!probe.data) return null;

  const anyDown = probe.data.results.some((r) => !r.ok);
  const allDown = probe.data.results.every((r) => !r.ok);
  if (!anyDown) return null;

  return (
    <div
      className={cn(
        'border-b border-border-subtle',
        allDown ? 'bg-red-950/40' : 'bg-yellow-950/30',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 text-sm"
          aria-expanded={expanded}
        >
          <AlertCircle size={16} className={allDown ? 'text-red-400' : 'text-yellow-400'} />
          <span className="font-medium">
            {allDown ? 'All DPTV backends are unreachable' : 'Some DPTV backends are having issues'}
          </span>
          <span className="ml-auto flex items-center gap-3 text-text-muted">
            <span>cache {((health.data?.cacheHitRate ?? 0) * 100).toFixed(0)}%</span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {probe.data.results.map((r) => (
                <div
                  key={r.name}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                    r.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300',
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', r.ok ? 'bg-emerald-400' : 'bg-red-400')} />
                  <span className="font-mono">{r.name}</span>
                  <span className="text-text-muted">{r.latencyMs}ms</span>
                </div>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); probe.refetch(); }}
                className="ml-auto flex items-center gap-1 text-xs text-text-secondary hover:text-white"
              >
                <RefreshCw size={12} className={probe.isFetching ? 'animate-spin' : ''} />
                Retry
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
                className="text-xs text-text-muted hover:text-white px-2"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-text-muted flex items-center gap-1.5">
              <Activity size={12} />
              Cached catalogue entries remain available — playback may be affected until backends recover.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
