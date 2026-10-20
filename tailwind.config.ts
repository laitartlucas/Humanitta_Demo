import type { Config } from 'tailwindcss';

/**
 * Humanittá Gestão — Tailwind preset (tokens do BRAND_SPEC §3–5).
 * Fonte de verdade espelhada em design_system/foundations/tokens.{css,json,ts}.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}', './design_system/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        ivory: '#FAF8F4',
        white: '#FFFFFF',
        graphite: {
          50: '#F5F3EF',
          100: '#ECE9E3',
          200: '#DFDBD3',
          300: '#C7C2B9',
          400: '#9E998F',
          500: '#77736B',
          600: '#5B5852',
          700: '#43413C',
          800: '#2E2C29',
          900: '#1E1D1B',
        },
        gold: {
          50: '#FBF6EC',
          100: '#F5E9D0',
          200: '#EBD4A6',
          300: '#DDB872',
          400: '#CC9B47',
          500: '#B5832F',
          600: '#8F6425',
          700: '#6F4D1D',
          800: '#4E3615',
        },
        success: { DEFAULT: '#2E7351', bg: '#E6F2EB' },
        warning: { DEFAULT: '#9A5F0E', bg: '#FBF0DA' },
        danger: { DEFAULT: '#A93B30', bg: '#FAE7E4', hover: '#8E3128' },
        info: { DEFAULT: '#2D5F88', bg: '#E5EEF6' },
        ai: { DEFAULT: '#2F6F68', bg: '#E3F0EE' },
        violet: { DEFAULT: '#5B4E8C', bg: '#EEEBF6' },
        spec: {
          odontologia: '#B5832F',
          fonoaudiologia: '#3E7CA8',
          estetica: '#B0607A',
          psicologia: '#6E62A6',
          quiropraxia: '#3F8A72',
          podologia: '#8A7A3F',
          fisioterapia: '#C0703A',
          nutricao: '#5E8A3A',
        },
        sidebar: {
          bg: '#1E1D1B',
          text: '#E9E5DD',
          muted: '#D6D1C7',
          icon: '#B9B3A8',
          strong: '#F3EFE8',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        brand: ['"Josefin Sans"', 'Manrope', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['48px', { lineHeight: '52px', fontWeight: '600' }],
        'display-lg': ['36px', { lineHeight: '40px', fontWeight: '600' }],
        'display-md': ['28px', { lineHeight: '34px', fontWeight: '600' }],
        kpi: ['34px', { lineHeight: '1', fontWeight: '600' }],
        overline: ['12px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '28px', fontWeight: '700' }],
        h4: ['16px', { lineHeight: '24px', fontWeight: '700' }],
        body: ['14px', { lineHeight: '22px' }],
        'body-sm': ['13px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '600' }],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(30,29,27,.06)',
        md: '0 6px 20px rgba(30,29,27,.07)',
        lg: '0 18px 50px rgba(30,29,27,.14)',
        focus: '0 0 0 3px rgba(181,131,47,.35)',
        'focus-danger': '0 0 0 3px rgba(169,59,48,.25)',
      },
      maxWidth: {
        content: '1440px',
      },
      width: {
        sidebar: '264px',
        'sidebar-collapsed': '76px',
      },
      height: {
        header: '72px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'drawer-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'drawer-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        'fade-in': 'fade-in 160ms ease-out',
        'pop-in': 'pop-in 200ms cubic-bezier(.2,.8,.2,1)',
        'sheet-up': 'sheet-up 240ms cubic-bezier(.2,.8,.2,1)',
        'drawer-in': 'drawer-in 240ms cubic-bezier(.2,.8,.2,1)',
        'drawer-in-left': 'drawer-in-left 240ms cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};

export default config;
