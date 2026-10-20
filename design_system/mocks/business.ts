/**
 * Humanittá Gestão — mocks de negócio (financeiro, mensagens, assistente IA, relatórios, configurações).
 * DEMONSTRAÇÃO COMERCIAL: todos os valores, conversas, métricas e usuários são fictícios.
 */
import type {
  ChatMessage,
  Conversation,
  FinancialEntry,
  PaymentMethod,
  PaymentStatus,
  Room,
  Specialty,
} from './types';

/* ------------------------------------------------------------------ */
/* Utilidades de formatação                                             */
/* ------------------------------------------------------------------ */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_COMPACT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return BRL.format(value);
}

export function formatCurrencyCompact(value: number): string {
  return BRL_COMPACT.format(value);
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatTimeBR(iso: string): string {
  return iso.slice(11, 16);
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  convenio: 'Convênio',
  boleto: 'Boleto',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
  estornado: 'Estornado',
};

export const DEMO_TODAY = '2026-10-19';

/* ------------------------------------------------------------------ */
/* Financeiro                                                           */
/* ------------------------------------------------------------------ */

export const FINANCE_CATEGORIES = {
  receita: ['Consulta', 'Procedimento', 'Pacote de sessões', 'Avaliação', 'Convênio'],
  despesa: ['Aluguel', 'Energia elétrica', 'Água', 'Internet e telefonia', 'Materiais clínicos', 'Limpeza', 'Marketing', 'Contabilidade', 'Software', 'Manutenção'],
  repasse: ['Repasse profissional'],
} as const;

export const financialEntries: FinancialEntry[] = [
  // Receitas — outubro/2026
  { id: 'fe-001', type: 'receita', description: 'Manutenção ortodôntica', category: 'Procedimento', amount: 280, date: '2026-10-19', method: 'pix', status: 'pago', patientName: 'Carla Menegatti', professionalName: 'Dra. Lauren Bertocchi' },
  { id: 'fe-002', type: 'receita', description: 'Sessão de fonoterapia', category: 'Consulta', amount: 190, date: '2026-10-19', method: 'cartao_debito', status: 'pago', patientName: 'João Pedro Basso', professionalName: 'Dra. Helena Marchetti' },
  { id: 'fe-003', type: 'receita', description: 'Pacote 10 sessões de fisioterapia', category: 'Pacote de sessões', amount: 1450, date: '2026-10-18', dueDate: '2026-10-25', method: 'cartao_credito', status: 'pendente', patientName: 'Eduardo Rech', professionalName: 'Dr. Gustavo Pagnussat' },
  { id: 'fe-004', type: 'receita', description: 'Consulta de psicologia', category: 'Consulta', amount: 220, date: '2026-10-17', method: 'pix', status: 'pago', patientName: 'Sofia Cavalheiro', professionalName: 'Dra. Marina Lazzari' },
  { id: 'fe-005', type: 'receita', description: 'Ajuste quiroprático', category: 'Procedimento', amount: 180, date: '2026-10-16', method: 'dinheiro', status: 'pago', patientName: 'Marcos Webber', professionalName: 'Dr. Rafael Zanella' },
  { id: 'fe-006', type: 'receita', description: 'Protocolo facial — estética avançada', category: 'Procedimento', amount: 690, date: '2026-10-15', dueDate: '2026-10-15', method: 'boleto', status: 'atrasado', patientName: 'Patrícia Golin', professionalName: 'Dra. Bianca Toniolo' },
  { id: 'fe-007', type: 'receita', description: 'Plano alimentar e retorno', category: 'Consulta', amount: 260, date: '2026-10-14', method: 'pix', status: 'pago', patientName: 'Beatriz Fiorentin', professionalName: 'Dra. Júlia Dalmolin' },
  { id: 'fe-008', type: 'receita', description: 'Tratamento de unha encravada', category: 'Procedimento', amount: 150, date: '2026-10-14', method: 'cartao_debito', status: 'pago', patientName: 'Renato Spanholi', professionalName: 'Ana Paula Schmitt' },
  { id: 'fe-009', type: 'receita', description: 'Avaliação odontológica (convênio)', category: 'Convênio', amount: 120, date: '2026-10-13', dueDate: '2026-11-10', method: 'convenio', status: 'pendente', patientName: 'Tiago Zortéa', professionalName: 'Dra. Lauren Bertocchi' },
  { id: 'fe-010', type: 'receita', description: 'Restauração em resina', category: 'Procedimento', amount: 340, date: '2026-10-10', method: 'cartao_credito', status: 'estornado', patientName: 'Fernanda Lise', professionalName: 'Dra. Lauren Bertocchi' },
  { id: 'fe-011', type: 'receita', description: 'Avaliação fonoaudiológica infantil', category: 'Avaliação', amount: 240, date: '2026-10-09', dueDate: '2026-10-12', method: 'boleto', status: 'atrasado', patientName: 'Paulo Brum', professionalName: 'Dra. Helena Marchetti' },
  { id: 'fe-012', type: 'receita', description: 'Pacote 4 sessões de psicoterapia', category: 'Pacote de sessões', amount: 820, date: '2026-10-08', method: 'pix', status: 'pago', patientName: 'Luíza Bortolini', professionalName: 'Dra. Marina Lazzari' },
  { id: 'fe-013', type: 'receita', description: 'Sessão de fisioterapia', category: 'Consulta', amount: 160, date: '2026-10-07', dueDate: '2026-10-22', method: 'cartao_credito', status: 'pendente', patientName: 'Marcos Webber', professionalName: 'Dr. Gustavo Pagnussat' },
  { id: 'fe-014', type: 'receita', description: 'Limpeza de pele profunda', category: 'Procedimento', amount: 230, date: '2026-10-05', method: 'pix', status: 'pago', patientName: 'Carla Menegatti', professionalName: 'Dra. Bianca Toniolo' },
  // Despesas
  { id: 'fe-101', type: 'despesa', description: 'Aluguel do imóvel — outubro', category: 'Aluguel', amount: 4800, date: '2026-10-05', dueDate: '2026-10-05', method: 'boleto', status: 'pago' },
  { id: 'fe-102', type: 'despesa', description: 'Conta de energia elétrica', category: 'Energia elétrica', amount: 812.4, date: '2026-10-12', dueDate: '2026-10-20', method: 'boleto', status: 'pendente' },
  { id: 'fe-103', type: 'despesa', description: 'Materiais odontológicos', category: 'Materiais clínicos', amount: 1936.9, date: '2026-10-08', dueDate: '2026-10-08', method: 'pix', status: 'pago' },
  { id: 'fe-104', type: 'despesa', description: 'Internet fibra e telefonia', category: 'Internet e telefonia', amount: 289.9, date: '2026-10-10', dueDate: '2026-10-15', method: 'boleto', status: 'atrasado' },
  { id: 'fe-105', type: 'despesa', description: 'Serviço de limpeza', category: 'Limpeza', amount: 1200, date: '2026-10-15', dueDate: '2026-10-30', method: 'pix', status: 'pendente' },
  { id: 'fe-106', type: 'despesa', description: 'Honorários contábeis', category: 'Contabilidade', amount: 950, date: '2026-10-10', dueDate: '2026-10-10', method: 'pix', status: 'pago' },
  { id: 'fe-107', type: 'despesa', description: 'Assinatura do sistema de gestão', category: 'Software', amount: 349, date: '2026-10-01', dueDate: '2026-10-01', method: 'cartao_credito', status: 'pago' },
  { id: 'fe-108', type: 'despesa', description: 'Impulsionamento Instagram', category: 'Marketing', amount: 600, date: '2026-10-03', method: 'cartao_credito', status: 'pago' },
  { id: 'fe-109', type: 'despesa', description: 'Manutenção da autoclave', category: 'Manutenção', amount: 480, date: '2026-10-21', dueDate: '2026-10-28', method: 'pix', status: 'pendente' },
  // Repasses
  { id: 'fe-201', type: 'repasse', description: 'Repasse quinzenal — Fonoaudiologia', category: 'Repasse profissional', amount: 2140, date: '2026-10-15', dueDate: '2026-10-15', method: 'pix', status: 'pago', professionalName: 'Dra. Helena Marchetti' },
  { id: 'fe-202', type: 'repasse', description: 'Repasse quinzenal — Quiropraxia', category: 'Repasse profissional', amount: 1580, date: '2026-10-15', dueDate: '2026-10-15', method: 'pix', status: 'pago', professionalName: 'Dr. Rafael Zanella' },
  { id: 'fe-203', type: 'repasse', description: 'Repasse quinzenal — Estética Avançada', category: 'Repasse profissional', amount: 2960, date: '2026-10-15', dueDate: '2026-10-20', method: 'pix', status: 'pendente', professionalName: 'Dra. Bianca Toniolo' },
  { id: 'fe-204', type: 'repasse', description: 'Repasse quinzenal — Psicologia', category: 'Repasse profissional', amount: 1870, date: '2026-10-15', dueDate: '2026-10-20', method: 'pix', status: 'pendente', professionalName: 'Dra. Marina Lazzari' },
  { id: 'fe-205', type: 'repasse', description: 'Repasse quinzenal — Fisioterapia', category: 'Repasse profissional', amount: 2310, date: '2026-10-15', dueDate: '2026-10-16', method: 'pix', status: 'atrasado', professionalName: 'Dr. Gustavo Pagnussat' },
  { id: 'fe-206', type: 'repasse', description: 'Repasse quinzenal — Nutrição', category: 'Repasse profissional', amount: 1190, date: '2026-10-15', dueDate: '2026-10-15', method: 'pix', status: 'pago', professionalName: 'Dra. Júlia Dalmolin' },
  { id: 'fe-207', type: 'repasse', description: 'Repasse quinzenal — Podologia', category: 'Repasse profissional', amount: 860, date: '2026-10-15', dueDate: '2026-10-30', method: 'pix', status: 'pendente', professionalName: 'Ana Paula Schmitt' },
];

export interface FinanceSummary {
  revenue: number;
  expenses: number;
  balance: number;
  receivable: number;
  overdue: number;
  payouts: number;
  /** Variação percentual vs. mês anterior (fictícia). */
  deltas: { revenue: number; expenses: number; balance: number; receivable: number };
}

export const financeSummary: FinanceSummary = {
  revenue: 48920,
  expenses: 21480.6,
  balance: 27439.4,
  receivable: 6340,
  overdue: 1219.9,
  payouts: 12910,
  deltas: { revenue: 8.4, expenses: 3.1, balance: 12.9, receivable: -4.2 },
};

export interface MonthlyPoint {
  month: string; // rótulo curto "nov/25"
  revenue: number;
  expenses: number;
}

export const monthlyCashFlow: MonthlyPoint[] = [
  { month: 'nov/25', revenue: 38200, expenses: 19100 },
  { month: 'dez/25', revenue: 35400, expenses: 20250 },
  { month: 'jan/26', revenue: 31800, expenses: 18900 },
  { month: 'fev/26', revenue: 36900, expenses: 19300 },
  { month: 'mar/26', revenue: 40150, expenses: 19950 },
  { month: 'abr/26', revenue: 41700, expenses: 20400 },
  { month: 'mai/26', revenue: 43200, expenses: 20800 },
  { month: 'jun/26', revenue: 42100, expenses: 21100 },
  { month: 'jul/26', revenue: 44800, expenses: 20700 },
  { month: 'ago/26', revenue: 46350, expenses: 21300 },
  { month: 'set/26', revenue: 45130, expenses: 20830 },
  { month: 'out/26', revenue: 48920, expenses: 21480 },
];

export interface SpecialtyRevenue {
  specialty: Specialty;
  value: number;
}

export const revenueBySpecialty: SpecialtyRevenue[] = [
  { specialty: 'odontologia', value: 14680 },
  { specialty: 'estetica', value: 8920 },
  { specialty: 'fisioterapia', value: 6740 },
  { specialty: 'fonoaudiologia', value: 5410 },
  { specialty: 'psicologia', value: 5160 },
  { specialty: 'quiropraxia', value: 3380 },
  { specialty: 'nutricao', value: 2690 },
  { specialty: 'podologia', value: 1940 },
];

export interface PaymentMethodShare {
  method: PaymentMethod;
  value: number;
}

export const revenueByPaymentMethod: PaymentMethodShare[] = [
  { method: 'pix', value: 21530 },
  { method: 'cartao_credito', value: 12480 },
  { method: 'cartao_debito', value: 7260 },
  { method: 'convenio', value: 3890 },
  { method: 'dinheiro', value: 2240 },
  { method: 'boleto', value: 1520 },
];

export const PAYMENT_METHOD_COLOR: Record<PaymentMethod, string> = {
  pix: '#B5832F',
  cartao_credito: '#3E7CA8',
  cartao_debito: '#6E62A6',
  convenio: '#3F8A72',
  dinheiro: '#8A7A3F',
  boleto: '#9E998F',
};

/* ------------------------------------------------------------------ */
/* WhatsApp (simulado)                                                  */
/* ------------------------------------------------------------------ */

export const conversations: Conversation[] = [
  { id: 'cv-01', contactName: 'Carla Menegatti', phone: '(54) 99811-2034', lastMessage: 'Perfeito, então fica quinta às 14h30?', lastAt: '2026-10-19T10:42:00', unread: 2, mode: 'ia', tags: ['Agendamento', 'Odontologia'], patientId: 'p-01' },
  { id: 'cv-02', contactName: 'João Pedro Basso', phone: '(54) 99627-4410', lastMessage: 'Vou transferir você para a recepção.', lastAt: '2026-10-19T10:31:00', unread: 1, mode: 'humano', assignedTo: 'Camila S.', tags: ['Fonoaudiologia', 'Infantil'], patientId: 'p-02' },
  { id: 'cv-03', contactName: 'Luíza Bortolini', phone: '(54) 99155-7821', lastMessage: 'Confirmo minha consulta de amanhã, obrigada!', lastAt: '2026-10-19T09:58:00', unread: 0, mode: 'ia', tags: ['Confirmação', 'Psicologia'], patientId: 'p-03' },
  { id: 'cv-04', contactName: 'Eduardo Rech', phone: '(54) 99340-1187', lastMessage: 'Consigo parcelar o pacote de fisioterapia?', lastAt: '2026-10-19T09:20:00', unread: 1, mode: 'humano', assignedTo: 'Camila S.', tags: ['Financeiro', 'Fisioterapia'], patientId: 'p-04' },
  { id: 'cv-05', contactName: 'Sofia Cavalheiro', phone: '(54) 99902-6635', lastMessage: 'Qual o endereço da clínica?', lastAt: '2026-10-19T08:47:00', unread: 0, mode: 'ia', tags: ['Dúvida'], patientId: 'p-05' },
  { id: 'cv-06', contactName: '(54) 99718-4402', phone: '(54) 99718-4402', lastMessage: 'Vocês atendem quiropraxia aos sábados?', lastAt: '2026-10-18T18:12:00', unread: 0, mode: 'ia', tags: ['Novo contato', 'Quiropraxia'] },
  { id: 'cv-07', contactName: 'Patrícia Golin', phone: '(54) 99264-9073', lastMessage: 'Preciso reagendar a estética de sexta.', lastAt: '2026-10-18T16:05:00', unread: 0, mode: 'humano', assignedTo: 'Recepção Humanittá', tags: ['Reagendamento', 'Estética'], patientId: 'p-07' },
  { id: 'cv-08', contactName: 'Beatriz Fiorentin', phone: '(54) 99431-5528', lastMessage: 'Enviei o exame de sangue por aqui.', lastAt: '2026-10-18T11:30:00', unread: 0, mode: 'ia', tags: ['Nutrição', 'Documento'], patientId: 'p-09' },
  { id: 'cv-09', contactName: 'Tiago Zortéa', phone: '(54) 99586-3317', lastMessage: 'Obrigado pelo atendimento!', lastAt: '2026-10-17T17:44:00', unread: 0, mode: 'ia', tags: ['Pós-consulta'], patientId: 'p-10' },
];

export const chatMessages: ChatMessage[] = [
  // cv-01 — agendamento via IA
  { id: 'm-0101', conversationId: 'cv-01', from: 'paciente', text: 'Oi! Gostaria de marcar a manutenção do aparelho.', at: '2026-10-19T10:35:00' },
  { id: 'm-0102', conversationId: 'cv-01', from: 'ia', text: 'Olá, Carla! Que bom falar com você. Para a manutenção ortodôntica com a Dra. Lauren Bertocchi, tenho estes horários: terça (20/10) às 9h00, quarta (21/10) às 16h00 ou quinta (22/10) às 14h30. Qual prefere?', at: '2026-10-19T10:35:20', status: 'lida' },
  { id: 'm-0103', conversationId: 'cv-01', from: 'paciente', text: 'Quinta seria ótimo.', at: '2026-10-19T10:41:00' },
  { id: 'm-0104', conversationId: 'cv-01', from: 'paciente', text: 'Perfeito, então fica quinta às 14h30?', at: '2026-10-19T10:42:00' },
  // cv-02 — transferido para humano
  { id: 'm-0201', conversationId: 'cv-02', from: 'paciente', text: 'Bom dia. Meu filho tem 5 anos e a escola sugeriu avaliação de fala.', at: '2026-10-19T10:20:00' },
  { id: 'm-0202', conversationId: 'cv-02', from: 'ia', text: 'Bom dia! A Humanittá oferece avaliação fonoaudiológica infantil com a Dra. Helena Marchetti. Para entender melhor o caso, vou transferir você para a recepção.', at: '2026-10-19T10:20:30', status: 'lida' },
  { id: 'm-0203', conversationId: 'cv-02', from: 'atendente', text: 'Olá, João Pedro! Aqui é a Camila, da recepção. Podemos agendar a avaliação para segunda à tarde. Pode ser?', at: '2026-10-19T10:28:00', status: 'entregue' },
  { id: 'm-0204', conversationId: 'cv-02', from: 'paciente', text: 'Pode sim. Precisa levar algum documento?', at: '2026-10-19T10:31:00' },
  // cv-03
  { id: 'm-0301', conversationId: 'cv-03', from: 'ia', text: 'Olá, Luíza! Lembrete: sua consulta de psicologia com a Dra. Marina Lazzari é amanhã (20/10) às 15h00. Responda 1 para confirmar ou 2 para reagendar.', at: '2026-10-19T09:00:00', status: 'lida' },
  { id: 'm-0302', conversationId: 'cv-03', from: 'paciente', text: '1', at: '2026-10-19T09:57:00' },
  { id: 'm-0303', conversationId: 'cv-03', from: 'paciente', text: 'Confirmo minha consulta de amanhã, obrigada!', at: '2026-10-19T09:58:00' },
  { id: 'm-0304', conversationId: 'cv-03', from: 'ia', text: 'Consulta confirmada! Até amanhã, Luíza.', at: '2026-10-19T09:58:10', status: 'lida' },
  // cv-04
  { id: 'm-0401', conversationId: 'cv-04', from: 'paciente', text: 'Olá, fiz a avaliação com o Dr. Gustavo e ele indicou 10 sessões.', at: '2026-10-19T09:15:00' },
  { id: 'm-0402', conversationId: 'cv-04', from: 'ia', text: 'Olá, Eduardo! Questões de valores e condições de pagamento são tratadas pela nossa equipe. Vou transferir você para a recepção.', at: '2026-10-19T09:15:20', status: 'lida' },
  { id: 'm-0403', conversationId: 'cv-04', from: 'paciente', text: 'Consigo parcelar o pacote de fisioterapia?', at: '2026-10-19T09:20:00' },
  // cv-05
  { id: 'm-0501', conversationId: 'cv-05', from: 'paciente', text: 'Qual o endereço da clínica?', at: '2026-10-19T08:47:00' },
  { id: 'm-0502', conversationId: 'cv-05', from: 'ia', text: 'Estamos na R. Rio Branco, 185 – Centro, Ronda Alta/RS. Posso ajudar com mais alguma coisa?', at: '2026-10-19T08:47:15', status: 'lida' },
  // cv-06
  { id: 'm-0601', conversationId: 'cv-06', from: 'paciente', text: 'Vocês atendem quiropraxia aos sábados?', at: '2026-10-18T18:12:00' },
  { id: 'm-0602', conversationId: 'cv-06', from: 'ia', text: 'Olá! Atendemos quiropraxia com o Dr. Rafael Zanella. Os horários de sábado estão [a confirmar com a clínica]. Quer que eu verifique os próximos horários disponíveis durante a semana?', at: '2026-10-18T18:12:20', status: 'entregue' },
  // cv-07
  { id: 'm-0701', conversationId: 'cv-07', from: 'paciente', text: 'Preciso reagendar a estética de sexta.', at: '2026-10-18T16:05:00' },
  { id: 'm-0702', conversationId: 'cv-07', from: 'atendente', text: 'Claro, Patrícia! Tenho terça às 10h ou quarta às 17h com a Dra. Bianca. Qual fica melhor?', at: '2026-10-18T16:12:00', status: 'lida' },
  // cv-08
  { id: 'm-0801', conversationId: 'cv-08', from: 'paciente', text: 'Enviei o exame de sangue por aqui.', at: '2026-10-18T11:30:00' },
  { id: 'm-0802', conversationId: 'cv-08', from: 'ia', text: 'Recebido, Beatriz! Encaminhei o arquivo para a Dra. Júlia Dalmolin anexar ao seu prontuário.', at: '2026-10-18T11:30:20', status: 'lida' },
  // cv-09
  { id: 'm-0901', conversationId: 'cv-09', from: 'ia', text: 'Olá, Tiago! Como você se sentiu após a consulta de ontem? Sua opinião ajuda a Humanittá a cuidar cada vez melhor.', at: '2026-10-17T17:30:00', status: 'lida' },
  { id: 'm-0902', conversationId: 'cv-09', from: 'paciente', text: 'Obrigado pelo atendimento!', at: '2026-10-17T17:44:00' },
];

export interface ConversationPatientInfo {
  conversationId: string;
  nextAppointment?: string; // texto livre
  lastVisit?: string;
  specialties: Specialty[];
  balance: number;
  notes?: string;
}

export const conversationPatientInfo: ConversationPatientInfo[] = [
  { conversationId: 'cv-01', nextAppointment: 'Qui, 22/10 · 14h30 · Dra. Lauren Bertocchi', lastVisit: '18/09/2026', specialties: ['odontologia', 'estetica'], balance: 0, notes: 'Prefere horários à tarde.' },
  { conversationId: 'cv-02', lastVisit: undefined, specialties: ['fonoaudiologia'], balance: 0, notes: 'Responsável pelo paciente infantil.' },
  { conversationId: 'cv-03', nextAppointment: 'Ter, 20/10 · 15h00 · Dra. Marina Lazzari', lastVisit: '13/10/2026', specialties: ['psicologia'], balance: 0 },
  { conversationId: 'cv-04', nextAppointment: 'Qua, 21/10 · 08h00 · Dr. Gustavo Pagnussat', lastVisit: '18/10/2026', specialties: ['fisioterapia'], balance: 1450 },
  { conversationId: 'cv-05', lastVisit: '02/08/2026', specialties: ['nutricao'], balance: 0 },
  { conversationId: 'cv-06', specialties: ['quiropraxia'], balance: 0, notes: 'Contato novo — ainda sem cadastro.' },
  { conversationId: 'cv-07', nextAppointment: 'A reagendar', lastVisit: '25/09/2026', specialties: ['estetica'], balance: 690 },
  { conversationId: 'cv-08', nextAppointment: 'Seg, 26/10 · 10h00 · Dra. Júlia Dalmolin', lastVisit: '14/10/2026', specialties: ['nutricao'], balance: 0 },
  { conversationId: 'cv-09', lastVisit: '16/10/2026', specialties: ['odontologia'], balance: 120 },
];

export const TRANSFER_TARGETS: { id: string; label: string; description: string }[] = [
  { id: 'recepcao', label: 'Recepção', description: 'Camila S. e equipe da recepção' },
  { id: 'financeiro', label: 'Financeiro', description: 'Valores, parcelamentos e cobranças' },
  { id: 'odontologia', label: 'Equipe de Odontologia', description: 'Dra. Lauren Bertocchi' },
  { id: 'clinico', label: 'Coordenação clínica', description: 'Dúvidas clínicas e encaminhamentos' },
];

export const QUICK_REPLIES: string[] = [
  'Olá! Como posso ajudar?',
  'Vou verificar os horários disponíveis e já retorno.',
  'Sua consulta está confirmada. Até breve!',
  'Estamos na R. Rio Branco, 185 – Centro, Ronda Alta/RS.',
];

/* ------------------------------------------------------------------ */
/* Assistente IA                                                        */
/* ------------------------------------------------------------------ */

export type AiTone = 'acolhedor' | 'formal' | 'objetivo';

export interface AiFaq {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  enabled: boolean;
}

export interface AiBusinessHours {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  open: boolean;
  start: string;
  end: string;
}

export interface AiTransferRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface AiAssistantConfig {
  enabled: boolean;
  name: string;
  greeting: string;
  signature: string;
  tone: AiTone;
  useEmojis: boolean;
  capabilities: { id: string; label: string; description: string; enabled: boolean }[];
  forbiddenTopics: string[];
  faqs: AiFaq[];
  hours: AiBusinessHours[];
  outOfHoursMessage: string;
  transferRules: AiTransferRule[];
  transferMessage: string;
  transferTarget: string;
}

export const defaultAiConfig: AiAssistantConfig = {
  enabled: true,
  name: 'Assistente Humanittá',
  greeting:
    'Olá! Eu sou o Assistente Humanittá, da Humanittá Saúde Integral. Posso ajudar com agendamentos, confirmações e informações sobre a clínica. Como posso ajudar você hoje?',
  signature: 'Humanittá Saúde Integral',
  tone: 'acolhedor',
  useEmojis: false,
  capabilities: [
    { id: 'agendar', label: 'Agendar consultas', description: 'Oferece horários livres da agenda e reserva o horário escolhido.', enabled: true },
    { id: 'confirmar', label: 'Confirmar presença', description: 'Envia lembretes 24h antes e registra a confirmação.', enabled: true },
    { id: 'reagendar', label: 'Reagendar e cancelar', description: 'Permite remarcar dentro das regras da clínica.', enabled: true },
    { id: 'faq', label: 'Responder dúvidas frequentes', description: 'Usa a base de conhecimento cadastrada.', enabled: true },
    { id: 'documentos', label: 'Receber documentos', description: 'Anexa exames e arquivos ao cadastro do paciente.', enabled: false },
  ],
  forbiddenTopics: ['Diagnósticos', 'Prescrição de medicamentos', 'Valores não cadastrados'],
  faqs: [
    { id: 'faq-1', question: 'Qual o endereço da clínica?', answer: 'Estamos na R. Rio Branco, 185 – Centro, Ronda Alta – RS, 99670-000.', keywords: ['endereço', 'endereco', 'onde', 'localização', 'localizacao', 'fica'], enabled: true },
    { id: 'faq-2', question: 'Quais especialidades vocês atendem?', answer: 'A Humanittá é uma clínica multiprofissional com Odontologia, Fonoaudiologia, Estética Avançada, Psicologia, Quiropraxia, Podologia, Fisioterapia e Nutrição.', keywords: ['especialidade', 'especialidades', 'atendem', 'serviços', 'servicos', 'tratamentos'], enabled: true },
    { id: 'faq-3', question: 'Quais as formas de pagamento?', answer: 'Formas de pagamento: [a confirmar com a clínica]. Nossa recepção pode detalhar as condições.', keywords: ['pagamento', 'pagar', 'pix', 'cartão', 'cartao', 'parcelar', 'parcela'], enabled: true },
    { id: 'faq-4', question: 'Qual o telefone/WhatsApp?', answer: 'Nosso WhatsApp é (54) 99292-0770.', keywords: ['telefone', 'whatsapp', 'contato', 'número', 'numero'], enabled: true },
    { id: 'faq-5', question: 'Quem é a responsável técnica?', answer: 'A responsável técnica é a Dra. Lauren Bertocchi — Ortodontista e Clínica Geral (CRO/RS 15630).', keywords: ['responsável', 'responsavel', 'técnica', 'tecnica', 'dentista'], enabled: true },
    { id: 'faq-6', question: 'Atendem convênios?', answer: 'Convênios aceitos: [a confirmar com a clínica].', keywords: ['convênio', 'convenio', 'plano', 'unimed'], enabled: false },
  ],
  hours: [
    { weekday: 1, label: 'Segunda-feira', open: true, start: '08:00', end: '18:00' },
    { weekday: 2, label: 'Terça-feira', open: true, start: '08:00', end: '18:00' },
    { weekday: 3, label: 'Quarta-feira', open: true, start: '08:00', end: '18:00' },
    { weekday: 4, label: 'Quinta-feira', open: true, start: '08:00', end: '18:00' },
    { weekday: 5, label: 'Sexta-feira', open: true, start: '08:00', end: '18:00' },
    { weekday: 6, label: 'Sábado', open: false, start: '08:00', end: '12:00' },
    { weekday: 0, label: 'Domingo', open: false, start: '08:00', end: '12:00' },
  ],
  outOfHoursMessage:
    'Recebemos sua mensagem! Nosso horário de atendimento humano é de segunda a sexta, das 8h às 18h. O Assistente Humanittá segue disponível para agendamentos e dúvidas.',
  transferRules: [
    { id: 'pedido', label: 'Paciente pede para falar com uma pessoa', description: 'Palavras como "atendente", "humano", "recepção".', enabled: true },
    { id: 'financeiro', label: 'Assuntos financeiros', description: 'Valores, parcelamentos, cobranças e reembolsos.', enabled: true },
    { id: 'clinico', label: 'Dúvidas clínicas', description: 'Sintomas, dor, urgência ou orientações de tratamento.', enabled: true },
    { id: 'insatisfacao', label: 'Insatisfação ou reclamação', description: 'Detecta tom negativo ou reclamação explícita.', enabled: true },
    { id: 'falhas', label: 'Após 2 respostas não compreendidas', description: 'Evita que o paciente fique sem resposta.', enabled: false },
  ],
  transferMessage: 'Vou transferir você para nossa equipe. Em instantes alguém da recepção continua o atendimento.',
  transferTarget: 'recepcao',
};

export const AI_SAMPLE_PROMPTS: string[] = [
  'Quero marcar uma consulta de fisioterapia',
  'Qual o endereço de vocês?',
  'Quais formas de pagamento aceitam?',
  'Preciso falar com uma atendente',
  'Estou com muita dor no dente',
];

export interface AiAssistantStats {
  conversationsToday: number;
  resolvedByAi: number; // 0..1
  appointmentsBooked: number;
  avgResponseSec: number;
}

export const aiAssistantStats: AiAssistantStats = {
  conversationsToday: 37,
  resolvedByAi: 0.78,
  appointmentsBooked: 14,
  avgResponseSec: 4,
};

/* ------------------------------------------------------------------ */
/* Relatórios                                                           */
/* ------------------------------------------------------------------ */

export const reportMonths: string[] = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Consultas por mês — 2026 (até outubro) vs. 2025. */
export const monthlyAppointments: { current: number[]; previous: number[] } = {
  current: [268, 291, 334, 352, 371, 360, 389, 402, 396, 418],
  previous: [241, 255, 298, 310, 322, 318, 335, 344, 351, 362, 340, 296],
};

export const reportKpis: { id: string; label: string; current: number; previous: number; format: 'int' | 'currency' | 'percent' }[] = [
  { id: 'consultas', label: 'Consultas realizadas', current: 418, previous: 396, format: 'int' },
  { id: 'faturamento', label: 'Faturamento', current: 48920, previous: 45130, format: 'currency' },
  { id: 'ocupacao', label: 'Taxa de ocupação', current: 0.82, previous: 0.79, format: 'percent' },
  { id: 'noshow', label: 'Faltas (no-show)', current: 0.054, previous: 0.067, format: 'percent' },
];

export const appointmentsBySpecialty: { specialty: Specialty; value: number }[] = [
  { specialty: 'odontologia', value: 112 },
  { specialty: 'fonoaudiologia', value: 68 },
  { specialty: 'fisioterapia', value: 61 },
  { specialty: 'psicologia', value: 54 },
  { specialty: 'estetica', value: 47 },
  { specialty: 'quiropraxia', value: 33 },
  { specialty: 'nutricao', value: 26 },
  { specialty: 'podologia', value: 17 },
];

export const HEATMAP_DAYS: string[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const HEATMAP_HOURS: string[] = ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h'];

/** Matriz [dia][hora] com nº médio de consultas (fictício). */
export const peakHeatmap: number[][] = [
  [6, 8, 9, 7, 2, 3, 7, 8, 9, 6],
  [5, 7, 8, 8, 3, 4, 8, 9, 8, 7],
  [7, 9, 9, 8, 2, 3, 6, 7, 8, 8],
  [6, 8, 7, 7, 3, 4, 9, 9, 9, 7],
  [5, 6, 7, 6, 2, 2, 5, 6, 5, 4],
  [3, 4, 4, 3, 0, 0, 0, 0, 0, 0],
];

export interface ProfessionalProductivity {
  id: string;
  name: string;
  specialty: Specialty;
  isDemo: boolean;
  appointments: number;
  revenue: number;
  occupancy: number; // 0..1
  noShowRate: number; // 0..1
  rating: number; // 0..5
}

export const professionalProductivity: ProfessionalProductivity[] = [
  { id: 'pr-01', name: 'Dra. Lauren Bertocchi', specialty: 'odontologia', isDemo: false, appointments: 112, revenue: 14680, occupancy: 0.91, noShowRate: 0.04, rating: 4.9 },
  { id: 'pr-02', name: 'Dra. Helena Marchetti', specialty: 'fonoaudiologia', isDemo: true, appointments: 68, revenue: 5410, occupancy: 0.84, noShowRate: 0.05, rating: 4.8 },
  { id: 'pr-03', name: 'Dr. Rafael Zanella', specialty: 'quiropraxia', isDemo: true, appointments: 33, revenue: 3380, occupancy: 0.72, noShowRate: 0.06, rating: 4.7 },
  { id: 'pr-04', name: 'Dra. Bianca Toniolo', specialty: 'estetica', isDemo: true, appointments: 47, revenue: 8920, occupancy: 0.88, noShowRate: 0.03, rating: 4.9 },
  { id: 'pr-05', name: 'Dra. Marina Lazzari', specialty: 'psicologia', isDemo: true, appointments: 54, revenue: 5160, occupancy: 0.86, noShowRate: 0.07, rating: 4.8 },
  { id: 'pr-06', name: 'Dr. Gustavo Pagnussat', specialty: 'fisioterapia', isDemo: true, appointments: 61, revenue: 6740, occupancy: 0.81, noShowRate: 0.05, rating: 4.7 },
  { id: 'pr-07', name: 'Dra. Júlia Dalmolin', specialty: 'nutricao', isDemo: true, appointments: 26, revenue: 2690, occupancy: 0.64, noShowRate: 0.08, rating: 4.6 },
  { id: 'pr-08', name: 'Ana Paula Schmitt', specialty: 'podologia', isDemo: true, appointments: 17, revenue: 1940, occupancy: 0.58, noShowRate: 0.06, rating: 4.8 },
];

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  category: 'Atendimento' | 'Financeiro' | 'Pacientes' | 'Comunicação';
  updatedAt: string;
}

export const reportLibrary: ReportDefinition[] = [
  { id: 'rp-01', title: 'Consultas por período', description: 'Volume de consultas por dia, profissional e especialidade.', category: 'Atendimento', updatedAt: '2026-10-19' },
  { id: 'rp-02', title: 'Faltas e cancelamentos', description: 'Taxa de no-show, cancelamentos e motivos registrados.', category: 'Atendimento', updatedAt: '2026-10-19' },
  { id: 'rp-03', title: 'Fluxo de caixa', description: 'Entradas, saídas e saldo consolidado do período.', category: 'Financeiro', updatedAt: '2026-10-18' },
  { id: 'rp-04', title: 'Repasses a profissionais', description: 'Valores devidos, pagos e pendentes por profissional.', category: 'Financeiro', updatedAt: '2026-10-15' },
  { id: 'rp-05', title: 'Novos pacientes', description: 'Cadastros, origem do contato e primeira consulta.', category: 'Pacientes', updatedAt: '2026-10-17' },
  { id: 'rp-06', title: 'Aniversariantes do mês', description: 'Lista para campanhas de relacionamento.', category: 'Pacientes', updatedAt: '2026-10-01' },
  { id: 'rp-07', title: 'Desempenho do Assistente IA', description: 'Conversas, resoluções automáticas e transferências.', category: 'Comunicação', updatedAt: '2026-10-19' },
  { id: 'rp-08', title: 'Confirmações via WhatsApp', description: 'Lembretes enviados, confirmações e respostas.', category: 'Comunicação', updatedAt: '2026-10-19' },
];

/* ------------------------------------------------------------------ */
/* Configurações                                                        */
/* ------------------------------------------------------------------ */

export interface ClinicInfo {
  name: string;
  tradeName: string;
  tagline: string;
  foundedYear: number;
  cnpj: string;
  address: { street: string; district: string; city: string; state: string; zip: string };
  whatsapp: string;
  email: string;
  instagram: string;
  website: string;
  technicalLead: { name: string; title: string; registry: string };
}

export const clinicInfo: ClinicInfo = {
  name: 'Humanittá Saúde Integral',
  tradeName: 'Humanittá — Clínica Multiprofissional',
  tagline: 'Clínica Multiprofissional',
  foundedYear: 2006,
  cnpj: '[a confirmar com a clínica]',
  address: { street: 'R. Rio Branco, 185', district: 'Centro', city: 'Ronda Alta', state: 'RS', zip: '99670-000' },
  whatsapp: '(54) 99292-0770',
  email: '[a confirmar com a clínica]',
  instagram: '@humanittasaudeintegral',
  website: 'linktr.ee/humanittasaudeintegral',
  technicalLead: { name: 'Dra. Lauren Bertocchi', title: 'Ortodontista, Clínica Geral — Responsável Técnica', registry: 'CRO/RS 15630' },
};

export interface SpecialtySetting {
  specialty: Specialty;
  active: boolean;
  professionals: number;
  defaultDurationMin: number;
}

export const specialtySettings: SpecialtySetting[] = [
  { specialty: 'odontologia', active: true, professionals: 1, defaultDurationMin: 40 },
  { specialty: 'fonoaudiologia', active: true, professionals: 1, defaultDurationMin: 45 },
  { specialty: 'estetica', active: true, professionals: 1, defaultDurationMin: 60 },
  { specialty: 'psicologia', active: true, professionals: 1, defaultDurationMin: 50 },
  { specialty: 'quiropraxia', active: true, professionals: 1, defaultDurationMin: 30 },
  { specialty: 'podologia', active: true, professionals: 1, defaultDurationMin: 40 },
  { specialty: 'fisioterapia', active: true, professionals: 1, defaultDurationMin: 50 },
  { specialty: 'nutricao', active: true, professionals: 1, defaultDurationMin: 45 },
];

export interface RoomSetting extends Room {
  label: string;
  active: boolean;
  note?: string;
}

export const rooms: RoomSetting[] = [
  { id: 'sala-1', name: 'Sala 1', label: 'Odontologia', specialty: 'odontologia', active: true },
  { id: 'sala-2', name: 'Sala 2', label: 'Fonoaudiologia', specialty: 'fonoaudiologia', active: true },
  { id: 'sala-3', name: 'Sala 3', label: 'Podologia / Quiropraxia', specialty: 'podologia', active: true, note: 'Compartilhada com Quiropraxia' },
  { id: 'sala-4', name: 'Sala 4', label: 'Fonoaudiologia', specialty: 'fonoaudiologia', active: true },
  { id: 'sala-5', name: 'Sala 5', label: 'Estética Avançada', specialty: 'estetica', active: true },
  { id: 'sala-6', name: 'Sala 6', label: 'Psicologia', specialty: 'psicologia', active: true },
  { id: 'sala-7', name: 'Sala 7', label: '[a definir]', active: false, note: 'Uso a definir pela clínica' },
];

export interface ServiceSetting {
  id: string;
  name: string;
  specialty: Specialty;
  durationMin: number;
  /** null = preço não definido (nunca inventar preço oficial). Exibir "R$ [definir]". */
  price: number | null;
  active: boolean;
}

export const services: ServiceSetting[] = [
  { id: 'sv-01', name: 'Avaliação odontológica', specialty: 'odontologia', durationMin: 40, price: null, active: true },
  { id: 'sv-02', name: 'Manutenção ortodôntica', specialty: 'odontologia', durationMin: 30, price: null, active: true },
  { id: 'sv-03', name: 'Avaliação fonoaudiológica', specialty: 'fonoaudiologia', durationMin: 60, price: null, active: true },
  { id: 'sv-04', name: 'Sessão de fonoterapia', specialty: 'fonoaudiologia', durationMin: 45, price: null, active: true },
  { id: 'sv-05', name: 'Protocolo facial', specialty: 'estetica', durationMin: 60, price: null, active: true },
  { id: 'sv-06', name: 'Sessão de psicoterapia', specialty: 'psicologia', durationMin: 50, price: null, active: true },
  { id: 'sv-07', name: 'Ajuste quiroprático', specialty: 'quiropraxia', durationMin: 30, price: null, active: true },
  { id: 'sv-08', name: 'Atendimento podológico', specialty: 'podologia', durationMin: 40, price: null, active: true },
  { id: 'sv-09', name: 'Sessão de fisioterapia', specialty: 'fisioterapia', durationMin: 50, price: null, active: true },
  { id: 'sv-10', name: 'Consulta nutricional', specialty: 'nutricao', durationMin: 45, price: null, active: true },
];

export interface ClinicHours {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  open: boolean;
  start: string;
  end: string;
  lunchStart?: string;
  lunchEnd?: string;
}

export const clinicHours: ClinicHours[] = [
  { weekday: 1, label: 'Segunda-feira', open: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:30' },
  { weekday: 2, label: 'Terça-feira', open: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:30' },
  { weekday: 3, label: 'Quarta-feira', open: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:30' },
  { weekday: 4, label: 'Quinta-feira', open: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:30' },
  { weekday: 5, label: 'Sexta-feira', open: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:30' },
  { weekday: 6, label: 'Sábado', open: false, start: '08:00', end: '12:00' },
  { weekday: 0, label: 'Domingo', open: false, start: '08:00', end: '12:00' },
];

export type UserRole = 'administrador' | 'recepcao' | 'profissional' | 'financeiro';

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  administrador: 'Administrador(a)',
  recepcao: 'Recepção',
  profissional: 'Profissional',
  financeiro: 'Financeiro',
};

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ativo' | 'convidado' | 'inativo';
  lastAccess?: string;
  isDemo: boolean;
}

export const appUsers: AppUser[] = [
  { id: 'u-01', name: 'Camila S.', email: 'recepcao@humanitta.demo', role: 'administrador', status: 'ativo', lastAccess: '2026-10-19T10:45:00', isDemo: true },
  { id: 'u-02', name: 'Dra. Lauren Bertocchi', email: 'lauren@humanitta.demo', role: 'administrador', status: 'ativo', lastAccess: '2026-10-19T08:10:00', isDemo: false },
  { id: 'u-03', name: 'Dra. Helena Marchetti', email: 'helena@humanitta.demo', role: 'profissional', status: 'ativo', lastAccess: '2026-10-18T17:20:00', isDemo: true },
  { id: 'u-04', name: 'Dr. Gustavo Pagnussat', email: 'gustavo@humanitta.demo', role: 'profissional', status: 'ativo', lastAccess: '2026-10-19T07:55:00', isDemo: true },
  { id: 'u-05', name: 'Dra. Marina Lazzari', email: 'marina@humanitta.demo', role: 'profissional', status: 'ativo', lastAccess: '2026-10-16T19:02:00', isDemo: true },
  { id: 'u-06', name: 'Rosana T.', email: 'financeiro@humanitta.demo', role: 'financeiro', status: 'ativo', lastAccess: '2026-10-17T14:30:00', isDemo: true },
  { id: 'u-07', name: 'Diego M.', email: 'diego@humanitta.demo', role: 'recepcao', status: 'convidado', isDemo: true },
  { id: 'u-08', name: 'Dra. Júlia Dalmolin', email: 'julia@humanitta.demo', role: 'profissional', status: 'inativo', lastAccess: '2026-09-02T11:00:00', isDemo: true },
];

export type PermissionModule =
  | 'dashboard'
  | 'agenda'
  | 'pacientes'
  | 'prontuario'
  | 'financeiro'
  | 'whatsapp'
  | 'assistente'
  | 'relatorios'
  | 'configuracoes';

export type PermissionLevel = 'nenhum' | 'ver' | 'editar' | 'total';

export const PERMISSION_MODULE_LABEL: Record<PermissionModule, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  prontuario: 'Prontuário / atendimentos',
  financeiro: 'Financeiro',
  whatsapp: 'WhatsApp',
  assistente: 'Assistente IA',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
};

export const PERMISSION_LEVEL_LABEL: Record<PermissionLevel, string> = {
  nenhum: 'Sem acesso',
  ver: 'Visualizar',
  editar: 'Editar',
  total: 'Total',
};

export const permissionMatrix: Record<UserRole, Record<PermissionModule, PermissionLevel>> = {
  administrador: { dashboard: 'total', agenda: 'total', pacientes: 'total', prontuario: 'total', financeiro: 'total', whatsapp: 'total', assistente: 'total', relatorios: 'total', configuracoes: 'total' },
  recepcao: { dashboard: 'ver', agenda: 'editar', pacientes: 'editar', prontuario: 'nenhum', financeiro: 'ver', whatsapp: 'editar', assistente: 'ver', relatorios: 'nenhum', configuracoes: 'nenhum' },
  profissional: { dashboard: 'ver', agenda: 'ver', pacientes: 'ver', prontuario: 'editar', financeiro: 'nenhum', whatsapp: 'nenhum', assistente: 'nenhum', relatorios: 'ver', configuracoes: 'nenhum' },
  financeiro: { dashboard: 'ver', agenda: 'ver', pacientes: 'ver', prontuario: 'nenhum', financeiro: 'total', whatsapp: 'nenhum', assistente: 'nenhum', relatorios: 'editar', configuracoes: 'nenhum' },
};

export interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  channels: { email: boolean; whatsapp: boolean; sistema: boolean };
}

export const notificationSettings: NotificationSetting[] = [
  { id: 'n-lembrete', label: 'Lembrete de consulta ao paciente', description: 'Enviado 24h antes do horário agendado.', channels: { email: false, whatsapp: true, sistema: false } },
  { id: 'n-novo', label: 'Novo agendamento', description: 'Quando um paciente agenda pelo WhatsApp ou Assistente IA.', channels: { email: true, whatsapp: false, sistema: true } },
  { id: 'n-cancel', label: 'Cancelamento ou reagendamento', description: 'Avisa a recepção e o profissional responsável.', channels: { email: true, whatsapp: false, sistema: true } },
  { id: 'n-transfer', label: 'Conversa transferida para humano', description: 'Quando o Assistente IA pede ajuda da equipe.', channels: { email: false, whatsapp: false, sistema: true } },
  { id: 'n-vencido', label: 'Pagamento em atraso', description: 'Resumo diário de lançamentos vencidos.', channels: { email: true, whatsapp: false, sistema: true } },
  { id: 'n-aniversario', label: 'Aniversário do paciente', description: 'Mensagem automática de felicitações.', channels: { email: false, whatsapp: true, sistema: false } },
];

export interface IntegrationSetting {
  id: string;
  name: string;
  description: string;
  status: 'conectado' | 'desconectado' | 'em_breve';
}

export const integrations: IntegrationSetting[] = [
  { id: 'whatsapp', name: 'WhatsApp Business', description: 'Mensagens, lembretes e Assistente IA. (Simulado na demonstração.)', status: 'conectado' },
  { id: 'google', name: 'Google Agenda', description: 'Sincroniza a agenda dos profissionais.', status: 'desconectado' },
  { id: 'nfse', name: 'Emissão de NFS-e', description: 'Notas fiscais de serviço pela prefeitura.', status: 'desconectado' },
  { id: 'pagamentos', name: 'Gateway de pagamentos', description: 'Links de pagamento Pix e cartão.', status: 'em_breve' },
  { id: 'email', name: 'E-mail transacional', description: 'Envio de confirmações e recibos por e-mail.', status: 'conectado' },
  { id: 'instagram', name: 'Instagram Direct', description: 'Centraliza mensagens do @humanittasaudeintegral.', status: 'em_breve' },
];

export interface VisualIdentitySetting {
  primaryColor: string;
  accentColor: string;
  displayFont: string;
  bodyFont: string;
  logoVariant: 'full' | 'mark';
}

export const visualIdentity: VisualIdentitySetting = {
  primaryColor: '#8F6425',
  accentColor: '#B5832F',
  displayFont: 'Cormorant Garamond',
  bodyFont: 'Manrope',
  logoVariant: 'full',
};
