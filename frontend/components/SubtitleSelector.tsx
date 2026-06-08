'use client';

import { Subtitles, X } from 'lucide-react';
import type { StreamSubtitle } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  subtitles: StreamSubtitle[];
  value: string | null;
  onChange: (lang: string | null) => void;
}

export function SubtitleSelector({ subtitles, value, onChange }: Props) {
  if (!subtitles.length) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm">
        <Subtitles size={16} />
        <span>No subtitles available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-text-secondary text-sm">
        <Subtitles size={16} />
        <span>Subtitles:</span>
      </div>
      <button
        onClick={() => onChange(null)}
        className={cn(
          'px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1',
          value === null ? 'bg-accent text-white' : 'bg-white/10 text-text-secondary hover:bg-white/20',
        )}
      >
        Off
      </button>
      {subtitles.map((s) => (
        <button
          key={s.lang}
          onClick={() => onChange(s.lang)}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors',
            value === s.lang ? 'bg-accent text-white' : 'bg-white/10 text-text-secondary hover:bg-white/20',
          )}
        >
          {s.label || s.lang}
        </button>
      ))}
      {value && (
        <button
          onClick={() => onChange(null)}
          className="ml-1 text-text-muted hover:text-white"
          aria-label="Clear subtitle"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
