'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useWorkerSearchSuggest } from '@/hooks/useSearch';

export function SearchBar({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial || params.get('q') || '');
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(value, 350);

  const suggest = useWorkerSearchSuggest(debounced, 8);

  useEffect(() => {
    if (debounced.trim().length > 0) {
      router.replace(`/search?q=${encodeURIComponent(debounced.trim())}`);
    } else if (debounced === '' && params.get('q')) {
      router.replace('/search');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  function pickKeyword(k: string) {
    setValue(k);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(k)}`);
  }

  return (
    <div className="relative w-full max-w-xl">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10" />
      <input
        type="search"
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search movies, series, people…"
        className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white/10 border border-white/10 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white/15 transition-colors text-sm"
        aria-label="Search"
      />

      {/* Suggestion dropdown */}
      {open && debounced.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-md bg-bg-secondary/95 backdrop-blur border border-border-subtle shadow-2xl max-h-96 overflow-y-auto">
          {suggest.isLoading && (
            <div className="px-4 py-3 text-sm text-text-muted flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          )}

          {!suggest.isLoading && (suggest.data?.data?.length ?? 0) === 0 && (
            <div className="px-4 py-3 text-sm text-text-muted">No suggestions.</div>
          )}

          {(suggest.data?.data ?? []).map((group, gIdx) => (
            <div key={`g-${gIdx}`} className="py-1">
              {group.keyword && (
                <button
                  type="button"
                  onMouseDown={() => pickKeyword(group.keyword)}
                  className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 text-sm"
                >
                  <Search size={12} className="text-text-muted" />
                  <span>{group.keyword}</span>
                </button>
              )}
              {(group.subjects ?? []).slice(0, 4).map((s) => (
                <button
                  type="button"
                  key={`s-${s.id}`}
                  onMouseDown={() => pickKeyword(s.title)}
                  className="w-full text-left px-4 py-1.5 hover:bg-white/10 flex items-center gap-2 text-sm"
                >
                  <span className="truncate flex-1">{s.title}</span>
                  {s.year !== undefined && <span className="text-xs text-text-muted">{s.year}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
