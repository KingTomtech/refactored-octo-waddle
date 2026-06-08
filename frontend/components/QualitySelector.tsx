'use client';

import { ALL_QUALITIES, type Quality } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  value: Quality;
  onChange: (q: Quality) => void;
  available?: Quality[];
  size?: 'sm' | 'md';
  showBest?: boolean;
}

const LABELS: Record<Quality, string> = {
  '4k':    '4K',
  '1080p': '1080p',
  '720p':  '720p',
  '480p':  '480p',
  '360p':  '360p',
  'best':  'Best',
  'worst': 'Worst',
};

export function QualitySelector({ value, onChange, available, size = 'md', showBest = true }: Props) {
  const options: Quality[] = showBest
    ? ['best', ...ALL_QUALITIES.filter((q) => !available || available.includes(q))]
    : ALL_QUALITIES.filter((q) => !available || available.includes(q));

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', size === 'sm' && 'gap-1')}>
      {options.map((q) => {
        const active = q === value;
        return (
          <button
            key={q}
            onClick={() => onChange(q)}
            className={cn(
              'rounded-full font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active
                ? 'bg-accent text-white'
                : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white',
            )}
            aria-pressed={active}
          >
            {LABELS[q]}
          </button>
        );
      })}
    </div>
  );
}
