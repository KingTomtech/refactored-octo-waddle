'use client';

import { useEffect, useState } from 'react';

// Loads a script tag exactly once, returns `ready` when set on window.
const loaded = new Set<string>();

export function useScript(src: string, globalName: string): boolean {
  const [ready, setReady] = useState<boolean>(
    typeof window !== 'undefined' && !!(window as any)[globalName]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any)[globalName]) {
      setReady(true);
      return;
    }
    if (loaded.has(src)) {
      // Script is in the DOM but global not yet attached — wait for load
      const check = () => {
        if ((window as any)[globalName]) setReady(true);
        else setTimeout(check, 50);
      };
      check();
      return;
    }
    loaded.add(src);
    const tag = document.createElement('script');
    tag.src = src;
    tag.async = true;
    tag.onload = () => {
      // Some UMD bundles attach synchronously; some schedule on next tick
      const check = () => {
        if ((window as any)[globalName]) setReady(true);
        else setTimeout(check, 50);
      };
      check();
    };
    tag.onerror = () => {
      console.error('[useScript] failed to load', src);
    };
    document.head.appendChild(tag);
  }, [src, globalName]);

  return ready;
}
