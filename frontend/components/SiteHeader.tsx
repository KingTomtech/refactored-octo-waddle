'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { Swords, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function SiteHeader() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/browse?type=movie', label: 'Movies' },
    { href: '/browse?type=tv', label: 'Series' },
    { href: '/search', label: 'Search' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-lg border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Swords size={26} className="text-accent" />
          <span className="font-display text-2xl tracking-wider">
            DP<span className="text-accent-yellow">TV</span>
          </span>
          <span className="hidden md:block text-[9px] text-text-muted tracking-widest uppercase mt-1.5">
            Maximum Effort Streaming
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors border-b-2',
                pathname === item.href
                  ? 'text-white border-accent'
                  : 'text-text-secondary hover:text-white border-transparent',
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-md hover:bg-white/10 transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border-subtle bg-bg-primary/95 backdrop-blur-lg"
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'text-white bg-accent/20 border-l-2 border-accent'
                      : 'text-text-secondary hover:text-white hover:bg-white/5',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}