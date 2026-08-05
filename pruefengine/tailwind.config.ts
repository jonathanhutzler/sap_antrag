import type { Config } from 'tailwindcss';

/**
 * Ein Token-System fuer die gesamte Dachdomain.
 * Variiert wird pro Nische ausschliesslich ueber --accent (siehe app/[niche]/layout.tsx).
 * Farben, Abstaende und Typografie sind fuer alle Nischen identisch.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14140f',
          muted: '#57564d',
          faint: '#8a897e',
        },
        paper: {
          DEFAULT: '#fbfaf6',
          raised: '#ffffff',
          sunken: '#f3f1e9',
        },
        rule: '#e2dfd3',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ink': 'var(--accent-ink)',
        severity: {
          error: '#9a2b1f',
          warn: '#8a5a12',
          info: '#3c5a6e',
        },
      },
      fontFamily: {
        display: [
          'Iowan Old Style',
          'Palatino Linotype',
          'Palatino',
          'Book Antiqua',
          'Georgia',
          'Cambria',
          'serif',
        ],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(2.4rem, 5.2vw, 4rem)', { lineHeight: '1.04', letterSpacing: '-0.022em' }],
        'display-lg': ['clamp(2rem, 3.8vw, 2.9rem)', { lineHeight: '1.1', letterSpacing: '-0.018em' }],
        'display-md': ['clamp(1.5rem, 2.4vw, 1.95rem)', { lineHeight: '1.18', letterSpacing: '-0.012em' }],
      },
      maxWidth: {
        prose: '68ch',
        shell: '76rem',
      },
      borderRadius: {
        card: '4px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(20,20,15,0.05), 0 8px 24px -18px rgba(20,20,15,0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
