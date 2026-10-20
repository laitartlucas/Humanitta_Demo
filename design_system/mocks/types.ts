/**
 * Humanittá Gestão — tipos de domínio compartilhados (somente front-end / demonstração).
 * Os agentes de desenvolvimento devem estender estes tipos, não duplicá-los.
 */

export type Specialty =
  | 'odontologia'
  | 'fonoaudiologia'
  | 'estetica'
  | 'psicologia'
  | 'quiropraxia'
  | 'podologia'
  | 'fisioterapia'
  | 'nutricao';

export type AppointmentStatus =
  | 'agendada'
  | 'confirmada'
  | 'em_atendimento'
  | 'concluida'
  | 'cancelada'
  | 'faltou'
  | 'reagendada';

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'convenio' | 'boleto';
export type PaymentStatus = 'pago' | 'pendente' | 'atrasado' | 'estornado';

export interface Room {
  id: string;
  name: string; // "Sala 1"
  specialty?: Specialty;
}

export interface Professional {
  id: string;
  name: string;
  title: string; // "Ortodontista"
  specialty: Specialty;
  registry?: string; // "CRO/RS 15630"
  avatarUrl?: string;
  isDemo: boolean; // true = nome fictício de demonstração
  roomId?: string;
  workingHours: { weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; start: string; end: string }[];
  occupancy: number; // 0..1
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string; // ISO
  phone: string;
  email?: string;
  city: string;
  tags: string[];
  createdAt: string;
  lastVisit?: string;
  nextVisit?: string;
  balance: number; // positivo = valor em aberto (R$)
  status: 'ativo' | 'inativo';
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  specialty: Specialty;
  service: string;
  roomId: string;
  start: string; // ISO datetime
  durationMin: number;
  status: AppointmentStatus;
  price: number;
  notes?: string;
  channel?: 'whatsapp' | 'telefone' | 'presencial' | 'assistente_ia';
}

export interface FinancialEntry {
  id: string;
  type: 'receita' | 'despesa' | 'repasse';
  description: string;
  category: string;
  amount: number;
  date: string;
  dueDate?: string;
  method?: PaymentMethod;
  status: PaymentStatus;
  patientName?: string;
  professionalName?: string;
}

export interface Conversation {
  id: string;
  contactName: string;
  phone: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  mode: 'ia' | 'humano';
  assignedTo?: string;
  tags: string[];
  patientId?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  from: 'paciente' | 'ia' | 'atendente';
  text: string;
  at: string;
  status?: 'enviada' | 'entregue' | 'lida';
}

export interface ActivityEvent {
  id: string;
  who: string;
  what: string;
  at: string;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'ai' | 'neutral' | 'gold';
}
