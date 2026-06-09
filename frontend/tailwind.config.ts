import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary':   '#070710',
        'bg-secondary': '#0f0f1a',
        'bg-tertiary':  '#161625',
        'bg-elevated':  '#1d1d30',
        'accent':       '#e50914',
        'accent-hover': '#f40612',
        'accent-yellow':      '#ffc107',
        'accent-yellow-hover': '#ffca28',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0b0',
        'text-muted':   '#606070',
        'border-subtle': 'rgba(255,255,255,0.08)',
        'rating-good':  '#21d07a',
        'rating-mid':   '#d2a53a',
        'rating-bad':   '#e7534a',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        sans:    ['var(--font-dm-sans)', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(to top, #070710 0%, rgba(7,7,16,0.6) 40%, rgba(7,7,16,0.2) 100%)',
        'card-gradient': 'linear-gradient(to top, rgba(7,7,16,0.95) 0%, rgba(7,7,16,0) 60%)',
        'vignette-red':  'radial-gradient(ellipse at center, transparent 50%, rgba(229,9,20,0.12) 100%)',
      },
      boxShadow: {
        'glow-red':    '0 0 20px rgba(229,9,20,0.4)',
        'glow-red-lg': '0 0 40px rgba(229,9,20,0.3)',
      },
      keyframes: {
        progressFill: {
          '0%':   { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        'progress-fill': 'progressFill var(--slide-duration, 6s) linear forwards',
      },
    },
  },
  plugins: [],
};

export default config;