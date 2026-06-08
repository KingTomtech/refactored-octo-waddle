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
      },
    },
  },
  plugins: [],
};

export default config;
