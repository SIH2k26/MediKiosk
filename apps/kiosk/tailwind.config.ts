import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-page': 'linear-gradient(160deg, #EEF5FC 0%, #DCEAF8 45%, #CFE1F3 100%)',
        'gradient-btn': 'linear-gradient(135deg, #1B2A55 0%, #101B3D 100%)',
        'gradient-logo': 'radial-gradient(circle at 35% 30%, #2E3A66 0%, #101B3D 70%)',
      },
      colors: {
        paper: {
          DEFAULT: '#EAF3FC', // Card/panel surface, modals
          raised: '#EAF3FC',
          sunken: '#DCEAF8', // Secondary fill
          onNavy: '#DCEAF8', // Text on dark surfaces
        },
        rule: {
          DEFAULT: '#B7CFEA', // Every border everywhere
          strong: '#B7CFEA', 
        },
        dark: {
          DEFAULT: '#101B3D', // Sidebar / top nav / dark blue surfaces
          raised: '#1B2A55', // Active/selected nav item
          rule: '#1B2A55',
        },
        ink: {
          primary: '#101B3D', // Primary text on light
          secondary: '#4A6285', // Secondary text on light
          tertiary: '#4A6285',
          muted: '#4A6285',
          onDark: '#DCEAF8', // Text on dark surfaces
          onDarkMuted: '#8FA8C7', // Muted text on dark surfaces
        },
        accent: {
          DEFAULT: '#101B3D', 
          text: '#DCEAF8', 
          hover: '#1B2A55', 
          wash: '#DCEAF8', 
          deep: '#101B3D',
        },
        signal: {
          critical: '#A8402A', 
          warning: '#B8862E', 
          criticalWash: '#F1DFD6', 
          warningWash: '#F7EBD3', 
          success: '#101B3D', 
          successWash: '#EAF3FC', 
          criticalSecondary: '#8C5445', 
        },
      },
      fontFamily: {
        sans: ['var(--font-cormorant)', 'serif'],
        serif: ['var(--font-bodoni)', 'serif'],
        mono: ['var(--font-cormorant)', 'serif'], // Fallback to cormorant even for mono
      },
      boxShadow: {
        card: '0 1px 3px rgba(16, 27, 61, 0.05), 0 0 0 1px rgba(183, 207, 234, 0.5)',
        raised: '0 4px 12px rgba(16, 27, 61, 0.08)',
        modal: '0 16px 40px rgba(16, 27, 61, 0.12)',
      },
      borderRadius: {
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
export default config;
