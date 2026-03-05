import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          50:  '#FFF0F5',
          100: '#FFE4F0',
          200: '#FFD6E7',
          300: '#FFB3D1',
          400: '#FF85B3',
          500: '#FF4D8D',
          600: '#E6336F',
          700: '#CC1A54',
        },
        blush: '#FFF8FB',
        mauve: '#9B8B95',
        ink:   '#1A1A2E',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:    '0 2px 16px rgba(255, 77, 141, 0.08)',
        'card-hover': '0 6px 28px rgba(255, 77, 141, 0.16)',
        pink:    '0 4px 20px rgba(255, 77, 141, 0.25)',
        modal:   '0 24px 64px rgba(255, 77, 141, 0.15)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
