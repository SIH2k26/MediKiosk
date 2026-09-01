import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0A0F14',
          raised: '#11161D',
          sunken: '#0D1218',
          rule: '#1D242D',
          ruleStrong: '#2A333E',
        },
        ink: {
          primary: '#F2F5F7',
          secondary: '#AEB9C4',
          tertiary: '#8894A3',
          muted: '#5C6B7A',
        },
        accent: {
          DEFAULT: '#14C9A5',
          hover: '#0FAE8E',
          wash: '#0F2620',
          text: '#3FE0BE',
        },
        signal: {
          critical: '#E24C5C',
          warning: '#D89A3F',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(5,8,12,0.4), 0 0 0 1px rgba(255,255,255,0.02)',
        raised: '0 4px 12px rgba(5,8,12,0.5)',
        modal: '0 16px 40px rgba(5,8,12,0.6)',
      },
      borderRadius: {
        md: '6px',
        lg: '8px',
      }
    }
  },
  plugins: [],
};
export default config;
