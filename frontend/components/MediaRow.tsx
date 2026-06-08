'use client';

import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
}

export function MediaRow({ title, href, children, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: 'smooth' });
  }

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="font-display text-2xl sm:text-3xl tracking-wide">
          {href ? <a href={href} className="hover:text-accent transition-colors">{title} ›</a> : title}
        </h2>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="scroll-row flex gap-3 overflow-x-auto px-4 sm:px-6 md:px-6 max-w-[100vw]">
        <div className="md:hidden w-1" aria-hidden="true" />
        {children}
        <div className="md:hidden w-1" aria-hidden="true" />
      </div>
    </section>
  );
}
