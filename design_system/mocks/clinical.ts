/**
 * Humanittá Gestão — dados clínico-administrativos DEMONSTRATIVOS.
 * Todos os pacientes, valores e históricos são fictícios. Apenas a Dra. Lauren Bertocchi
 * é profissional real (informação pública); os demais profissionais são nomes de demonstração.
 */
import type {
  ActivityEvent,
  Appointment,
  AppointmentStatus,
  Patient,
  Professional,
  Room,
  Specialty,
} from './types';

/* ------------------------------------------------------------------ */
/* Referências de tempo da demonstração                                */
/* ------------------------------------------------------------------ */

/** "Hoje" na demonstração: segunda-feira, 19/10/2026. */
export const DEMO_TODAY = new Date(2026, 9, 19);
/** "Agora" na demonstração (usado para fila/atendimentos). */
export const DEMO_NOW = new Date(2026, 9, 19, 9, 10);
/** Semana demonstrativa: segunda 19 a sábado 24/10/2026. */
export const DEMO_WEEK: Date[] = [19, 20, 21, 22, 23, 24].map((d) => new Date(2026, 9, d));

/* ------------------------------------------------------------------ */
/* Rótulos                                                              */
/* ------------------------------------------------------------------ */

export const SPECIALTY_NAMES: Record<Specialty, string> = {
  odontologia: 'Odontologia',
  fonoaudiologia: 'Fonoaudiologia',
  estetica: 'Estética Avançada',
  psicologia: 'Psicologia',
  quiropraxia: 'Quiropraxia',
  podologia: 'Podologia',
  fisioterapia: 'Fisioterapia',
  nutricao: 'Nutrição',
};

export const SPECIALTY_HEX: Record<Specialty, string> = {
  odontologia: '#B5832F',
  fonoaudiologia: '#3E7CA8',
  estetica: '#B0607A',
  psicologia: '#6E62A6',
  quiropraxia: '#3F8A72',
  podologia: '#8A7A3F',
  fisioterapia: '#C0703A',
  nutricao: '#5E8A3A',
};

export const STATUS_NAMES: Record<AppointmentStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  em_atendimento: 'Em atendimento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  faltou: 'Faltou',
  reagendada: 'Reagendada',
};

export const CHANNEL_NAMES: Record<NonNullable<Appointment['channel']>, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  presencial: 'Presencial',
  assistente_ia: 'Assistente IA',
};

export const ALL_SPECIALTIES: Specialty[] = [
  'odontologia',
  'fonoaudiologia',
  'estetica',
  'psicologia',
  'quiropraxia',
  'podologia',
  'fisioterapia',
  'nutricao',
];

/* ------------------------------------------------------------------ */
/* Salas                                                                */
/* ------------------------------------------------------------------ */

export const rooms: Room[] = [
  { id: 'sala-1', name: 'Sala 1', specialty: 'odontologia' },
  { id: 'sala-2', name: 'Sala 2', specialty: 'fonoaudiologia' },
  { id: 'sala-3', name: 'Sala 3', specialty: 'podologia' }, // Podologia / Quiropraxia
  { id: 'sala-4', name: 'Sala 4', specialty: 'fonoaudiologia' },
  { id: 'sala-5', name: 'Sala 5', specialty: 'estetica' },
  { id: 'sala-6', name: 'Sala 6', specialty: 'psicologia' },
  { id: 'sala-7', name: 'Sala 7' }, // a definir
];

/** Descrição de uso de cada sala (placa da recepção). */
export const ROOM_USAGE: Record<string, string> = {
  'sala-1': 'Odontologia',
  'sala-2': 'Fonoaudiologia',
  'sala-3': 'Podologia / Quiropraxia',
  'sala-4': 'Fonoaudiologia',
  'sala-5': 'Estética Avançada',
  'sala-6': 'Psicologia',
  'sala-7': 'A definir',
};

/* ------------------------------------------------------------------ */
/* Profissionais                                                        */
/* ------------------------------------------------------------------ */

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const hours = (days: Weekday[], start: string, end: string): Professional['workingHours'] =>
  days.map((weekday) => ({ weekday, start, end }));

export const professionals: Professional[] = [
  {
    id: 'prof-lauren',
    name: 'Dra. Lauren Bertocchi',
    title: 'Ortodontista · Clínica Geral · Responsável Técnica',
    specialty: 'odontologia',
    registry: 'CRO/RS 15630',
    isDemo: false,
    roomId: 'sala-1',
    workingHours: [...hours([1, 2, 3, 4, 5], '08:00', '18:00'), ...hours([6], '08:00', '12:00')],
    occupancy: 0.91,
  },
  {
    id: 'prof-helena',
    name: 'Dra. Helena Marchetti',
    title: 'Fonoaudióloga',
    specialty: 'fonoaudiologia',
    registry: 'CRFa (demo)',
    isDemo: true,
    roomId: 'sala-2',
    workingHours: hours([1, 2, 3, 4, 5], '08:00', '17:00'),
    occupancy: 0.84,
  },
  {
    id: 'prof-rafael',
    name: 'Dr. Rafael Zanella',
    title: 'Quiropraxista',
    specialty: 'quiropraxia',
    isDemo: true,
    roomId: 'sala-3',
    workingHours: hours([1, 3, 5], '09:00', '18:00'),
    occupancy: 0.72,
  },
  {
    id: 'prof-bianca',
    name: 'Dra. Bianca Toniolo',
    title: 'Esteticista — Estética Avançada',
    specialty: 'estetica',
    isDemo: true,
    roomId: 'sala-5',
    workingHours: [...hours([1, 2, 3, 4, 5], '09:00', '19:00'), ...hours([6], '08:00', '12:00')],
    occupancy: 0.88,
  },
  {
    id: 'prof-marina',
    name: 'Dra. Marina Lazzari',
    title: 'Psicóloga Clínica',
    specialty: 'psicologia',
    registry: 'CRP (demo)',
    isDemo: true,
    roomId: 'sala-6',
    workingHours: hours([1, 2, 3, 4], '10:00', '19:00'),
    occupancy: 0.79,
  },
  {
    id: 'prof-gustavo',
    name: 'Dr. Gustavo Pagnussat',
    title: 'Fisioterapeuta',
    specialty: 'fisioterapia',
    registry: 'CREFITO (demo)',
    isDemo: true,
    roomId: 'sala-7',
    workingHours: hours([1, 2, 3, 4, 5], '07:30', '16:30'),
    occupancy: 0.66,
  },
  {
    id: 'prof-julia',
    name: 'Dra. Júlia Dalmolin',
    title: 'Nutricionista',
    specialty: 'nutricao',
    registry: 'CRN (demo)',
    isDemo: true,
    roomId: 'sala-4',
    workingHours: hours([1, 4], '13:00', '19:00'),
    occupancy: 0.58,
  },
  {
    id: 'prof-ana',
    name: 'Ana Paula Schmitt',
    title: 'Podóloga',
    specialty: 'podologia',
    isDemo: true,
    roomId: 'sala-3',
    workingHours: hours([1, 2, 4], '08:00', '17:00'),
    occupancy: 0.63,
  },
];

/* ------------------------------------------------------------------ */
/* Pacientes (fictícios)                                                */
/* ------------------------------------------------------------------ */

export const patients: Patient[] = [
  { id: 'pac-01', name: 'Carla Menegatti', birthDate: '1988-03-14', phone: '(54) 99100-0101', email: 'carla.menegatti@exemplo.com', city: 'Ronda Alta', tags: ['Ortodontia', 'WhatsApp'], createdAt: '2024-02-10', lastVisit: '2026-10-19', nextVisit: '2026-11-16', balance: 0, status: 'ativo' },
  { id: 'pac-02', name: 'João Pedro Basso', birthDate: '2016-07-02', phone: '(54) 99100-0102', email: 'familia.basso@exemplo.com', city: 'Sarandi', tags: ['Infantil', 'Plano mensal'], createdAt: '2025-05-21', lastVisit: '2026-10-12', nextVisit: '2026-10-19', balance: 180, status: 'ativo' },
  { id: 'pac-03', name: 'Luíza Bortolini', birthDate: '1979-11-23', phone: '(54) 99100-0103', city: 'Ronda Alta', tags: ['Coluna'], createdAt: '2025-09-03', lastVisit: '2026-10-05', nextVisit: '2026-10-19', balance: 0, status: 'ativo' },
  { id: 'pac-04', name: 'Eduardo Rech', birthDate: '1993-01-30', phone: '(54) 99100-0104', email: 'eduardo.rech@exemplo.com', city: 'Rondinha', tags: ['Psicoterapia semanal'], createdAt: '2026-03-11', lastVisit: '2026-10-12', nextVisit: '2026-10-19', balance: 0, status: 'ativo' },
  { id: 'pac-05', name: 'Sofia Cavalheiro', birthDate: '1997-06-08', phone: '(54) 99100-0105', email: 'sofia.cavalheiro@exemplo.com', city: 'Três Palmeiras', tags: ['Estética', 'Pacote'], createdAt: '2025-12-02', lastVisit: '2026-09-28', nextVisit: '2026-10-19', balance: 420, status: 'ativo' },
  { id: 'pac-06', name: 'Marcos Webber', birthDate: '1961-09-17', phone: '(54) 99100-0106', city: 'Ronda Alta', tags: ['Podologia', '60+'], createdAt: '2023-08-19', lastVisit: '2026-09-21', nextVisit: '2026-10-19', balance: 0, status: 'ativo' },
  { id: 'pac-07', name: 'Patrícia Golin', birthDate: '1985-04-25', phone: '(54) 99100-0107', email: 'patricia.golin@exemplo.com', city: 'Constantina', tags: ['Fonoaudiologia'], createdAt: '2024-10-07', lastVisit: '2026-10-19', nextVisit: '2026-10-26', balance: 0, status: 'ativo' },
  { id: 'pac-08', name: 'Renato Spanholi', birthDate: '1974-12-03', phone: '(54) 99100-0108', city: 'Engenho Velho', tags: ['Reagendamentos'], createdAt: '2025-01-15', lastVisit: '2026-09-30', nextVisit: '2026-10-22', balance: 250, status: 'ativo' },
  { id: 'pac-09', name: 'Beatriz Fiorentin', birthDate: '2001-02-19', phone: '(54) 99100-0109', email: 'beatriz.fiorentin@exemplo.com', city: 'Ronda Alta', tags: ['Novo cadastro'], createdAt: '2026-10-19', nextVisit: '2026-10-19', balance: 0, status: 'ativo' },
  { id: 'pac-10', name: 'Tiago Zortéa', birthDate: '1990-08-11', phone: '(54) 99100-0110', city: 'Sarandi', tags: ['Fisioterapia'], createdAt: '2025-06-30', lastVisit: '2026-10-09', balance: 160, status: 'ativo' },
  { id: 'pac-11', name: 'Fernanda Lise', birthDate: '1982-05-27', phone: '(54) 99100-0111', email: 'fernanda.lise@exemplo.com', city: 'Pontão', tags: ['Nutrição', 'Plano trimestral'], createdAt: '2026-01-20', lastVisit: '2026-09-21', nextVisit: '2026-10-19', balance: 0, status: 'ativo' },
  { id: 'pac-12', name: 'Paulo Brum', birthDate: '1958-10-05', phone: '(54) 99100-0112', city: 'Ronda Alta', tags: ['60+'], createdAt: '2022-04-04', lastVisit: '2026-10-19', balance: 0, status: 'inativo' },
];

/* ------------------------------------------------------------------ */
/* Agendamentos — semana 19 a 24/10/2026 (+ alguns anteriores)          */
/* ------------------------------------------------------------------ */

type Channel = NonNullable<Appointment['channel']>;

function ap(
  id: string,
  day: number,
  time: string,
  patientId: string,
  professionalId: string,
  service: string,
  durationMin: number,
  status: AppointmentStatus,
  price: number,
  channel: Channel = 'whatsapp',
  notes?: string,
): Appointment {
  const pat = patients.find((p) => p.id === patientId);
  const prof = professionals.find((p) => p.id === professionalId);
  if (!pat || !prof) throw new Error(`Mock inválido: ${id}`);
  const [h, m] = time.split(':');
  return {
    id,
    patientId,
    patientName: pat.name,
    professionalId,
    professionalName: prof.name,
    specialty: prof.specialty,
    service,
    roomId: prof.roomId ?? 'sala-7',
    start: `2026-10-${String(day).padStart(2, '0')}T${h.padStart(2, '0')}:${m}:00`,
    durationMin,
    status,
    price,
    channel,
    notes,
  };
}

export const appointments: Appointment[] = [
  // Anteriores (histórico)
  ap('ag-001', 12, '09:30', 'pac-02', 'prof-helena', 'Terapia fonoaudiológica', 45, 'concluida', 180, 'whatsapp'),
  ap('ag-002', 12, '10:30', 'pac-04', 'prof-marina', 'Psicoterapia individual', 60, 'concluida', 200, 'telefone'),
  ap('ag-003', 14, '15:00', 'pac-10', 'prof-gustavo', 'Sessão de fisioterapia', 50, 'faltou', 160, 'whatsapp'),
  ap('ag-004', 16, '11:00', 'pac-08', 'prof-lauren', 'Avaliação clínica geral', 40, 'reagendada', 250, 'telefone', 'Paciente pediu para remarcar.'),

  // Segunda, 19/10 (hoje)
  ap('ag-101', 19, '08:00', 'pac-12', 'prof-lauren', 'Avaliação ortodôntica', 40, 'concluida', 220, 'presencial'),
  ap('ag-102', 19, '08:15', 'pac-07', 'prof-helena', 'Terapia fonoaudiológica', 45, 'concluida', 180, 'whatsapp'),
  ap('ag-103', 19, '09:00', 'pac-01', 'prof-lauren', 'Manutenção ortodôntica', 50, 'em_atendimento', 380, 'whatsapp'),
  ap('ag-104', 19, '09:30', 'pac-02', 'prof-helena', 'Terapia fonoaudiológica', 45, 'confirmada', 180, 'assistente_ia'),
  ap('ag-105', 19, '10:00', 'pac-03', 'prof-rafael', 'Ajuste quiropráxico', 30, 'confirmada', 150, 'whatsapp'),
  ap('ag-106', 19, '10:30', 'pac-04', 'prof-marina', 'Psicoterapia individual', 60, 'agendada', 200, 'telefone'),
  ap('ag-107', 19, '11:00', 'pac-05', 'prof-bianca', 'Limpeza de pele profunda', 90, 'agendada', 420, 'assistente_ia'),
  ap('ag-108', 19, '11:15', 'pac-06', 'prof-ana', 'Atendimento podológico', 40, 'confirmada', 140, 'presencial'),
  ap('ag-109', 19, '14:00', 'pac-10', 'prof-gustavo', 'Sessão de fisioterapia', 50, 'cancelada', 160, 'whatsapp', 'Cancelado pelo paciente via WhatsApp.'),
  ap('ag-110', 19, '14:30', 'pac-11', 'prof-julia', 'Consulta nutricional', 60, 'confirmada', 230, 'whatsapp'),
  ap('ag-111', 19, '15:00', 'pac-09', 'prof-lauren', 'Avaliação clínica geral', 40, 'agendada', 250, 'assistente_ia'),
  ap('ag-112', 19, '16:00', 'pac-08', 'prof-marina', 'Psicoterapia individual', 50, 'agendada', 200, 'telefone'),

  // Terça, 20/10
  ap('ag-201', 20, '08:30', 'pac-06', 'prof-lauren', 'Restauração em resina', 60, 'confirmada', 320, 'telefone'),
  ap('ag-202', 20, '09:00', 'pac-07', 'prof-helena', 'Avaliação de voz', 50, 'agendada', 200, 'whatsapp'),
  ap('ag-203', 20, '10:00', 'pac-05', 'prof-bianca', 'Microagulhamento', 60, 'confirmada', 450, 'assistente_ia'),
  ap('ag-204', 20, '13:30', 'pac-10', 'prof-gustavo', 'Sessão de fisioterapia', 50, 'agendada', 160, 'whatsapp'),
  ap('ag-205', 20, '15:00', 'pac-03', 'prof-ana', 'Atendimento podológico', 40, 'agendada', 140, 'presencial'),
  ap('ag-206', 20, '17:00', 'pac-04', 'prof-marina', 'Psicoterapia individual', 60, 'confirmada', 200, 'telefone'),

  // Quarta, 21/10
  ap('ag-301', 21, '08:00', 'pac-01', 'prof-lauren', 'Clareamento — sessão 1', 60, 'agendada', 480, 'whatsapp'),
  ap('ag-302', 21, '09:30', 'pac-02', 'prof-helena', 'Terapia fonoaudiológica', 45, 'agendada', 180, 'assistente_ia'),
  ap('ag-303', 21, '10:00', 'pac-11', 'prof-rafael', 'Ajuste quiropráxico', 30, 'confirmada', 150, 'whatsapp'),
  ap('ag-304', 21, '14:00', 'pac-09', 'prof-bianca', 'Avaliação estética', 40, 'agendada', 0, 'assistente_ia', 'Avaliação cortesia (demonstração).'),
  ap('ag-305', 21, '15:30', 'pac-12', 'prof-gustavo', 'Sessão de fisioterapia', 50, 'agendada', 160, 'telefone'),
  ap('ag-306', 21, '16:30', 'pac-04', 'prof-marina', 'Psicoterapia individual', 60, 'agendada', 200, 'telefone'),

  // Quinta, 22/10
  ap('ag-401', 22, '08:30', 'pac-03', 'prof-lauren', 'Avaliação ortodôntica', 40, 'agendada', 220, 'whatsapp'),
  ap('ag-402', 22, '10:00', 'pac-06', 'prof-ana', 'Atendimento podológico', 40, 'confirmada', 140, 'presencial'),
  ap('ag-403', 22, '14:00', 'pac-11', 'prof-julia', 'Retorno nutricional', 40, 'agendada', 150, 'whatsapp'),
  ap('ag-404', 22, '15:00', 'pac-08', 'prof-lauren', 'Avaliação clínica geral', 40, 'reagendada', 250, 'telefone', 'Reagendado de 16/10.'),
  ap('ag-405', 22, '16:00', 'pac-07', 'prof-helena', 'Terapia fonoaudiológica', 45, 'agendada', 180, 'whatsapp'),

  // Sexta, 23/10
  ap('ag-501', 23, '09:00', 'pac-05', 'prof-bianca', 'Peeling químico', 60, 'agendada', 390, 'assistente_ia'),
  ap('ag-502', 23, '10:00', 'pac-10', 'prof-rafael', 'Ajuste quiropráxico', 30, 'agendada', 150, 'whatsapp'),
  ap('ag-503', 23, '11:00', 'pac-01', 'prof-lauren', 'Manutenção ortodôntica', 50, 'agendada', 380, 'whatsapp'),
  ap('ag-504', 23, '14:00', 'pac-12', 'prof-gustavo', 'Sessão de fisioterapia', 50, 'agendada', 160, 'telefone'),
  ap('ag-505', 23, '15:30', 'pac-02', 'prof-helena', 'Terapia fonoaudiológica', 45, 'agendada', 180, 'assistente_ia'),

  // Sábado, 24/10
  ap('ag-601', 24, '08:30', 'pac-09', 'prof-lauren', 'Profilaxia (limpeza)', 50, 'agendada', 200, 'assistente_ia'),
  ap('ag-602', 24, '10:00', 'pac-11', 'prof-bianca', 'Drenagem linfática', 60, 'agendada', 180, 'whatsapp'),
];

/* ------------------------------------------------------------------ */
/* Atividades recentes                                                   */
/* ------------------------------------------------------------------ */

export const activityEvents: ActivityEvent[] = [
  { id: 'ev-1', who: 'Assistente IA', what: 'confirmou a consulta de João Pedro Basso via WhatsApp.', at: '2026-10-19T09:06:00', tone: 'ai' },
  { id: 'ev-2', who: 'Camila S.', what: 'registrou pagamento de R$ 380,00 (Pix) — Carla Menegatti.', at: '2026-10-19T08:58:00', tone: 'success' },
  { id: 'ev-3', who: 'Dra. Helena Marchetti', what: 'finalizou atendimento de Patrícia Golin.', at: '2026-10-19T08:32:00', tone: 'neutral' },
  { id: 'ev-4', who: 'Recepção', what: 'reagendou Renato Spanholi para 22/10, 15:00.', at: '2026-10-19T08:10:00', tone: 'info' },
  { id: 'ev-5', who: 'Sistema', what: 'cadastrou nova paciente: Beatriz Fiorentin.', at: '2026-10-19T07:10:00', tone: 'gold' },
  { id: 'ev-6', who: 'Tiago Zortéa', what: 'cancelou a consulta de 14:00 pelo WhatsApp.', at: '2026-10-19T06:10:00', tone: 'danger' },
];

/* ------------------------------------------------------------------ */
/* Indicadores (dashboard)                                               */
/* ------------------------------------------------------------------ */

export const monthlyRevenue: { month: string; value: number }[] = [
  { month: 'mai', value: 36200 },
  { month: 'jun', value: 38900 },
  { month: 'jul', value: 41500 },
  { month: 'ago', value: 40100 },
  { month: 'set', value: 43500 },
  { month: 'out', value: 48920 },
];

export const yearlyRevenue: { month: string; value: number }[] = [
  { month: 'nov', value: 31800 },
  { month: 'dez', value: 29400 },
  { month: 'jan', value: 30100 },
  { month: 'fev', value: 33200 },
  { month: 'mar', value: 34900 },
  { month: 'abr', value: 35600 },
  ...monthlyRevenue,
];

export const consultationsBySpecialty: { specialty: Specialty; count: number }[] = [
  { specialty: 'odontologia', count: 124 },
  { specialty: 'fonoaudiologia', count: 71 },
  { specialty: 'estetica', count: 58 },
  { specialty: 'psicologia', count: 52 },
  { specialty: 'fisioterapia', count: 41 },
  { specialty: 'quiropraxia', count: 29 },
  { specialty: 'podologia', count: 22 },
  { specialty: 'nutricao', count: 15 },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof value === 'string' ? parseDate(value) : value;
  return d.toLocaleDateString('pt-BR', opts);
}

export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Converte "AAAA-MM-DD" (sem hora) para data local, evitando deslocamento de fuso. */
export function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toLocalIso(d: Date): string {
  return `${toDateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addMinutes(iso: string, minutes: number): Date {
  return new Date(new Date(iso).getTime() + minutes * 60000);
}

export function initials(name: string): string {
  return name
    .replace(/^(Dra?\.)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ageFrom(birthDate: string, ref: Date = DEMO_TODAY): number {
  const b = parseDate(birthDate);
  let age = ref.getFullYear() - b.getFullYear();
  if (ref.getMonth() < b.getMonth() || (ref.getMonth() === b.getMonth() && ref.getDate() < b.getDate())) age -= 1;
  return age;
}

export function relativeTime(iso: string, now: Date = DEMO_NOW): string {
  const diffMin = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

export function getPatientById(id: string): Patient | undefined {
  return patients.find((p) => p.id === id);
}

export function getProfessionalById(id: string): Professional | undefined {
  return professionals.find((p) => p.id === id);
}

export function getRoomById(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}

export function getRoomName(id: string): string {
  return getRoomById(id)?.name ?? '—';
}

export function getAppointmentsByDate(date: Date, list: Appointment[] = appointments): Appointment[] {
  return list
    .filter((a) => isSameDay(new Date(a.start), date))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function getAppointmentsByPatient(patientId: string, list: Appointment[] = appointments): Appointment[] {
  return list.filter((a) => a.patientId === patientId).sort((a, b) => b.start.localeCompare(a.start));
}

export function getAppointmentsByProfessional(professionalId: string, list: Appointment[] = appointments): Appointment[] {
  return list.filter((a) => a.professionalId === professionalId).sort((a, b) => a.start.localeCompare(b.start));
}

export function getTodayAppointments(list: Appointment[] = appointments): Appointment[] {
  return getAppointmentsByDate(DEMO_TODAY, list);
}

/** Lista de serviços por especialidade (para formulários de demonstração). */
export const SERVICES_BY_SPECIALTY: Record<Specialty, string[]> = {
  odontologia: ['Avaliação clínica geral', 'Avaliação ortodôntica', 'Manutenção ortodôntica', 'Profilaxia (limpeza)', 'Restauração em resina', 'Clareamento — sessão 1'],
  fonoaudiologia: ['Terapia fonoaudiológica', 'Avaliação de voz', 'Avaliação de linguagem'],
  estetica: ['Avaliação estética', 'Limpeza de pele profunda', 'Microagulhamento', 'Peeling químico', 'Drenagem linfática'],
  psicologia: ['Psicoterapia individual', 'Avaliação psicológica'],
  quiropraxia: ['Ajuste quiropráxico', 'Avaliação postural'],
  podologia: ['Atendimento podológico', 'Tratamento de unha encravada'],
  fisioterapia: ['Sessão de fisioterapia', 'Avaliação fisioterapêutica'],
  nutricao: ['Consulta nutricional', 'Retorno nutricional'],
};

export const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
