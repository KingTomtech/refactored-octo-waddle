'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { Clapperboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/browse?type=movie', label: 'Movies' },
    { href: '/browse?type=tv', label: 'TV' },
    { href: '/search', label: 'Search' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-lg border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Clapperboard size={26} className="text-accent" />
          <span className="font-display text-2xl tracking-wider">MOVIEBOX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname === item.href ? 'text-white bg-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto w-full md:w-auto md:max-w-md">
          {pathname === '/search' ? (
            <SearchBar />
          ) : (
            <div onClick={() => setSearchOpen(true)} className="cursor-pointer">
              {searchOpen ? (
                <SearchBar />
              ) : (
                <Link
                  href="/search"
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-text-secondary text-sm transition-colors"
                >
                  <span>Search…</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
