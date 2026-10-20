/**
 * Humanittá Gestão — design tokens tipados.
 * Espelho de tokens.css (variáveis --hm-*), tokens.json e tailwind.config.ts.
 */
import type { AppointmentStatus, Specialty } from '../mocks/types';

export const tokens = {
  color: {
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
    state: {
      success: { fg: '#2E7351', bg: '#E6F2EB' },
      warning: { fg: '#9A5F0E', bg: '#FBF0DA' },
      danger: { fg: '#A93B30', bg: '#FAE7E4' },
      info: { fg: '#2D5F88', bg: '#E5EEF6' },
      ai: { fg: '#2F6F68', bg: '#E3F0EE' },
      violet: { fg: '#5B4E8C', bg: '#EEEBF6' },
    },
    sidebar: {
      bg: '#1E1D1B',
      text: '#E9E5DD',
      muted: '#D6D1C7',
      icon: '#B9B3A8',
      strong: '#F3EFE8',
      activeBg: 'rgba(221,184,114,.12)',
      activeText: '#F5E9D0',
    },
    overlay: 'rgba(30,29,27,.45)',
  },
  gradient: {
    brand: 'linear-gradient(135deg, #DDB872 0%, #B5832F 55%, #7A5220 100%)',
  },
  font: {
    display: "'Cormorant Garamond', Georgia, serif",
    sans: 'Manrope, system-ui, sans-serif',
    brand: "'Josefin Sans', Manrope, sans-serif",
  },
  fontSize: {
    displayXl: { size: '48px', lineHeight: '52px' },
    displayLg: { size: '36px', lineHeight: '40px' },
    displayMd: { size: '28px', lineHeight: '34px' },
    h3: { size: '20px', lineHeight: '28px' },
    h4: { size: '16px', lineHeight: '24px' },
    body: { size: '14px', lineHeight: '22px' },
    bodySm: { size: '13px', lineHeight: '20px' },
    caption: { size: '12px', lineHeight: '16px' },
    kpi: { size: '34px', lineHeight: '1' },
  },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px' },
  radius: { xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '999px' },
  shadow: {
    sm: '0 1px 2px rgba(30,29,27,.06)',
    md: '0 6px 20px rgba(30,29,27,.07)',
    lg: '0 18px 50px rgba(30,29,27,.14)',
    focus: '0 0 0 3px rgba(181,131,47,.35)',
  },
  breakpoint: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
  layout: {
    sidebar: 264,
    sidebarCollapsed: 76,
    header: 72,
    contentMax: 1440,
    modal: { sm: 440, md: 640, lg: 880 },
    drawer: 480,
  },
} as const;

export type Tokens = typeof tokens;

/** Cor de marcador por especialidade (agenda, gráficos, tags). */
export const SPECIALTY_COLORS: Record<Specialty, string> = {
  odontologia: '#B5832F',
  fonoaudiologia: '#3E7CA8',
  estetica: '#B0607A',
  psicologia: '#6E62A6',
  quiropraxia: '#3F8A72',
  podologia: '#8A7A3F',
  fisioterapia: '#C0703A',
  nutricao: '#5E8A3A',
};

/** Cores de status de consulta: texto (fg) sobre fundo (bg). */
export const STATUS_COLORS: Record<AppointmentStatus, { fg: string; bg: string }> = {
  agendada: { fg: '#2D5F88', bg: '#E5EEF6' },
  confirmada: { fg: '#2E7351', bg: '#E6F2EB' },
  em_atendimento: { fg: '#8F6425', bg: '#FBF6EC' },
  concluida: { fg: '#5B5852', bg: '#ECE9E3' },
  cancelada: { fg: '#A93B30', bg: '#FAE7E4' },
  faltou: { fg: '#9A5F0E', bg: '#FBF0DA' },
  reagendada: { fg: '#5B4E8C', bg: '#EEEBF6' },
};
