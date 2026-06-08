'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export function SearchBar({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial || params.get('q') || '');
  const debounced = useDebounce(value, 350);

  useEffect(() => {
    if (debounced.trim().length > 0) {
      router.replace(`/search?q=${encodeURIComponent(debounced.trim())}`);
    } else if (debounced === '' && params.get('q')) {
      router.replace('/search');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative w-full max-w-xl">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search movies, TV shows, people…"
        className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white/10 border border-white/10 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white/15 transition-colors text-sm"
        aria-label="Search"
      />
    </div>
  );
}
