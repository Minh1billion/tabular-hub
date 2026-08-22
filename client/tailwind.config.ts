import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: 'var(--cream)',
        'cream-soft': 'var(--cream-soft)',
        white: 'var(--white)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        slate: 'var(--slate)',
        muted: 'var(--muted)',
        'brand-deep': 'var(--brand-deep)',
        brand: 'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
        'brand-tint': 'var(--brand-tint)',
        warn: 'var(--warn)',
        'warn-tint': 'var(--warn-tint)',
      },
      fontFamily: {
        headline: ['"IBM Plex Sans"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        panel: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config
