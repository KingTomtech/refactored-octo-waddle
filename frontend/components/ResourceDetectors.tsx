'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';

interface Detector {
  type?: number;
  source?: string;
  resourceId?: string;
  resolutionList?: Array<{ resolution?: number; resourceLink?: string }>;
  totalSize?: number;
  signCookie?: string;
}

interface Props {
  detectors: Detector[];
  subjectId?: string;
  compact?: boolean;
}

/** Reusable ResourceDetectors list (mimics decompile Alone/MultiRes/CollectionAdapter dialogs for source/quality choice) */
export function ResourceDetectors({ detectors, subjectId, compact }: Props) {
  if (!detectors?.length) return null;
  return (
    <div className={compact ? 'text-xs' : ''}>
      <div className="flex items-center gap-2 mb-2 text-text-muted">
        <Download size={14} /> Sources ({detectors.length})
        {subjectId && <Link href={`/downloads?prefill=${subjectId}`} className="text-accent hover:underline text-xs">open downloads</Link>}
      </div>
      <div className="grid gap-1.5">
        {detectors.slice(0, compact ? 3 : 6).map((d, i) => (
          <div key={i} className="text-[11px] p-1.5 rounded bg-bg-tertiary/60 border border-border-subtle flex justify-between">
            <span>{d.source || 'Source'} {d.type === 1 ? '(Collection)' : d.resolutionList && d.resolutionList.length > 1 ? '(Multi-Res)' : ''}</span>
            {d.resolutionList && <span className="text-text-muted">{d.resolutionList.length} res</span>}
            {d.signCookie && <span className="text-accent">cookie</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResourceDetectors;
