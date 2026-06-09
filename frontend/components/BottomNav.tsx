'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, Tv, Search, Download, PlaySquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/browse?type=movie', label: 'Movies', icon: Film },
  { href: '/browse?type=tv', label: 'Series', icon: Tv },
  { href: '/shorts', label: 'Shorts', icon: PlaySquare },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/downloads', label: 'Downloads', icon: Download },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-lg border-t border-border-subtle md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href.split('?')[0]) ||
                (tab.href.includes('?') && typeof window !== 'undefined' && window.location.search === tab.href.split('?')[1]?.replace('type', 'type'));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors min-w-[56px]',
                isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}