/**
 * Biblioteca de relatórios exportáveis (CSV). Cada definição monta a tabela a partir dos MESMOS
 * seletores dos indicadores, com os filtros ativos e o escopo do perfil.
 * Nunca exporta conteúdo clínico, telefone, e-mail, CPF ou texto de mensagens.
 */
import { selectAttendances, selectConversations, selectPatients } from '@core';
import type { AccessContext, AttendanceStatus, Database, ID } from '@core';
import { CHANNEL_NAMES, SPECIALTY_NAMES, STATUS_NAMES } from '@ds/mocks/clinical';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '@ds/mocks/business';
import { csvDecimal, csvPercent, type CsvTable } from './csv';
import { buildReport, compare, selectReportAccess, selectReportAppointments, selectReportEntries, type ReportAccess, type ReportFilters } from './metrics';
import { describeRange, formatKeyBR, inRange } from './period';

export type ReportCategory = 'Atendimento' | 'Financeiro' | 'Pacientes' | 'Comunicação';

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  /** Permissão exigida (derivada da matriz por `selectReportAccess`). */
  requires: keyof Omit<ReportAccess, 'ownScope'>;
  build: (s: Database, ctx: AccessContext, f: ReportFilters) => CsvTable;
}

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  aguardando: 'Aguardando',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
};

const time = (iso?: string) => (iso ? iso.slice(11, 16) : '');
const dateOf = (iso?: string) => (iso ? formatKeyBR(iso.slice(0, 10)) : '');
const fileSuffix = (f: ReportFilters) => `${f.range.from}_a_${f.range.to}`;
const nameOf = (s: Database) => (id?: ID) => (id ? s.professionals.find((p) => p.id === id)?.name ?? '' : '');

function fmtDelta(v: number | null): string {
  return v === null ? 'sem base' : `${csvDecimal(v)}%`;
}

export const REPORT_LIBRARY: ReportDefinition[] = [
  {
    id: 'resumo',
    title: 'Resumo do período',
    description: 'Indicadores principais do período comparados ao período anterior.',
    category: 'Atendimento',
    requires: 'operational',
    build: (s, ctx, f) => {
      const r = buildReport(s, ctx, f);
      const a = r.appointments;
      const p = r.appointmentsPrevious;
      const rows: (string | number)[][] = [
        ['Agendamentos', a.total, p.total, fmtDelta(compare(a.total, p.total).deltaPct)],
        ['Confirmados', a.confirmed, p.confirmed, ''],
        ['Pendentes de confirmação', a.scheduled, p.scheduled, ''],
        ['Realizados', a.done, p.done, ''],
        ['Cancelados', a.cancelled, p.cancelled, ''],
        ['Faltas', a.noShow, p.noShow, ''],
        ['Taxa de cancelamento', csvPercent(a.cancelRate), csvPercent(p.cancelRate), ''],
        ['Taxa de faltas', csvPercent(a.noShowRate), csvPercent(p.noShowRate), ''],
        ['Atendimentos finalizados', r.attendances.finished, r.attendancesPrevious.finished, ''],
        ['Taxa de conclusão', csvPercent(r.attendances.completionRate), csvPercent(r.attendancesPrevious.completionRate), ''],
        ['Ocupação da agenda', csvPercent(r.occupancy.currentRatio), csvPercent(r.occupancy.previousRatio), fmtDelta(r.occupancy.deltaPct)],
      ];
      if (r.finance && r.financePrevious) {
        rows.push(
          ['Receitas recebidas (R$)', csvDecimal(r.finance.revenue), csvDecimal(r.financePrevious.revenue), ''],
          ['Despesas pagas (R$)', csvDecimal(r.finance.expenses), csvDecimal(r.financePrevious.expenses), ''],
          ['Repasses pagos (R$)', csvDecimal(r.finance.payouts), csvDecimal(r.financePrevious.payouts), ''],
          ['Resultado (R$)', csvDecimal(r.finance.result), csvDecimal(r.financePrevious.result), ''],
        );
      }
      return {
        filename: `resumo-${fileSuffix(f)}`,
        headers: ['Indicador', `Período (${describeRange(r.range)})`, `Anterior (${describeRange(r.previous)})`, 'Variação'],
        rows,
      };
    },
  },
  {
    id: 'agendamentos',
    title: 'Agendamentos do período',
    description: 'Lista de consultas com status, profissional, serviço e canal.',
    category: 'Atendimento',
    requires: 'operational',
    build: (s, ctx, f) => {
      const withPrice = selectReportAccess(s, ctx).financial;
      const room = (id: ID) => s.rooms.find((r) => r.id === id)?.name ?? '';
      const headers = ['Data', 'Horário', 'Paciente', 'Profissional', 'Especialidade', 'Serviço', 'Sala', 'Status', 'Canal'];
      return {
        filename: `agendamentos-${fileSuffix(f)}`,
        headers: withPrice ? [...headers, 'Valor (R$)'] : headers,
        rows: selectReportAppointments(s, ctx, f).map((a) => {
          const row = [
            dateOf(a.start),
            time(a.start),
            a.patientName,
            a.professionalName,
            SPECIALTY_NAMES[a.specialty],
            a.service,
            room(a.roomId),
            STATUS_NAMES[a.status],
            a.channel ? CHANNEL_NAMES[a.channel] : '',
          ];
          return withPrice ? [...row, csvDecimal(a.price)] : row;
        }),
      };
    },
  },
  {
    id: 'atendimentos',
    title: 'Atendimentos realizados',
    description: 'Ciclo de cada atendimento: check-in, início e fim. Sem conteúdo clínico.',
    category: 'Atendimento',
    requires: 'operational',
    build: (s, ctx, f) => {
      const appts = new Map(selectReportAppointments(s, ctx, f, f.range, false).map((a) => [a.id, a]));
      const rows = selectAttendances(s, ctx)
        .filter((at) => appts.has(at.appointmentId))
        .map((at) => {
          const a = appts.get(at.appointmentId);
          return [
            dateOf(a?.start),
            a?.patientName ?? '',
            nameOf(s)(at.professionalId),
            a?.service ?? '',
            ATTENDANCE_STATUS_LABEL[at.status],
            time(at.checkInAt),
            time(at.startedAt),
            time(at.finishedAt),
          ];
        })
        .sort((x, y) => String(x[0]).localeCompare(String(y[0])));
      return {
        filename: `atendimentos-${fileSuffix(f)}`,
        headers: ['Data', 'Paciente', 'Profissional', 'Serviço', 'Situação', 'Check-in', 'Início', 'Fim'],
        rows,
      };
    },
  },
  {
    id: 'produtividade',
    title: 'Produtividade por profissional',
    description: 'Consultas, realizados, faltas e ocupação da agenda de cada profissional.',
    category: 'Atendimento',
    requires: 'operational',
    build: (s, ctx, f) => {
      const r = buildReport(s, ctx, f);
      const withRevenue = r.access.financial;
      const headers = ['Profissional', 'Especialidade', 'Situação', 'Consultas', 'Realizadas', 'Taxa de faltas', 'Horas agendadas', 'Horas de expediente', 'Ocupação'];
      return {
        filename: `produtividade-${fileSuffix(f)}`,
        headers: withRevenue ? [...headers, 'Receitas recebidas (R$)'] : headers,
        rows: r.professionals.map((p) => {
          const row = [
            p.name,
            SPECIALTY_NAMES[p.specialty],
            p.active ? 'Ativo' : 'Inativo',
            p.appointments,
            p.done,
            csvPercent(p.noShowRate),
            csvDecimal(p.bookedMin / 60),
            csvDecimal(p.availableMin / 60),
            csvPercent(p.occupancy),
          ];
          return withRevenue ? [...row, csvDecimal(p.revenue)] : row;
        }),
      };
    },
  },
  {
    id: 'lancamentos',
    title: 'Lançamentos financeiros',
    description: 'Receitas, despesas e repasses do período com forma de pagamento e situação.',
    category: 'Financeiro',
    requires: 'financial',
    build: (s, ctx, f) => ({
      filename: `lancamentos-${fileSuffix(f)}`,
      headers: ['Data', 'Vencimento', 'Tipo', 'Descrição', 'Categoria', 'Forma de pagamento', 'Situação', 'Valor (R$)', 'Paciente', 'Profissional'],
      rows: selectReportEntries(s, ctx, f)
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => [
          formatKeyBR(e.date),
          e.dueDate ? formatKeyBR(e.dueDate) : '',
          e.type === 'receita' ? 'Receita' : e.type === 'despesa' ? 'Despesa' : 'Repasse',
          e.description,
          e.category,
          e.method ? PAYMENT_METHOD_LABEL[e.method] : '',
          PAYMENT_STATUS_LABEL[e.status],
          csvDecimal(e.amount),
          e.patientName ?? '',
          e.professionalName ?? nameOf(s)(e.professionalId),
        ]),
    }),
  },
  {
    id: 'repasses',
    title: 'Repasses por profissional',
    description: 'Valores pagos e pendentes de repasse no período.',
    category: 'Financeiro',
    requires: 'payouts',
    build: (s, ctx, f) => {
      const r = buildReport(s, ctx, f);
      return {
        filename: `repasses-${fileSuffix(f)}`,
        headers: ['Profissional', 'Pago (R$)', 'Pendente ou atrasado (R$)', 'Total (R$)'],
        rows: (r.finance?.payoutsByProfessional ?? []).map((p) => [p.label, csvDecimal(p.paid), csvDecimal(p.pending), csvDecimal(p.paid + p.pending)]),
      };
    },
  },
  {
    id: 'formas-pagamento',
    title: 'Receitas por forma de pagamento',
    description: 'Distribuição dos recebimentos do período por forma de pagamento.',
    category: 'Financeiro',
    requires: 'financial',
    build: (s, ctx, f) => {
      const fin = buildReport(s, ctx, f).finance;
      const total = fin?.revenue ?? 0;
      return {
        filename: `formas-de-pagamento-${fileSuffix(f)}`,
        headers: ['Forma de pagamento', 'Valor recebido (R$)', 'Participação'],
        rows: (fin?.byMethod ?? []).map((m) => [m.label, csvDecimal(m.value), csvPercent(total ? m.value / total : null)]),
      };
    },
  },
  {
    id: 'pacientes-cadastros',
    title: 'Novos cadastros de pacientes',
    description: 'Pacientes cadastrados no período (somente dados administrativos).',
    category: 'Pacientes',
    requires: 'patients',
    build: (s, ctx, f) => ({
      filename: `novos-pacientes-${fileSuffix(f)}`,
      headers: ['Paciente', 'Cidade', 'Data de cadastro', 'Situação'],
      rows: selectPatients(s, ctx)
        .filter((p) => inRange(p.createdAt, f.range))
        .map((p) => [p.name, p.city, formatKeyBR(p.createdAt.slice(0, 10)), p.status === 'ativo' ? 'Ativo' : 'Inativo']),
    }),
  },
  {
    id: 'conversas',
    title: 'Conversas do WhatsApp',
    description: 'Conversas com atividade no período: modo de atendimento e pendências. Sem conteúdo das mensagens.',
    category: 'Comunicação',
    requires: 'communication',
    build: (s, ctx, f) => ({
      filename: `conversas-${fileSuffix(f)}`,
      headers: ['Contato', 'Última atividade', 'Atendimento', 'Mensagens não lidas', 'Etiquetas'],
      rows: selectConversations(s, ctx)
        .filter((c) => inRange(c.lastAt, f.range))
        .map((c) => [c.contactName, `${dateOf(c.lastAt)} ${time(c.lastAt)}`, c.mode === 'ia' ? 'Assistente IA' : 'Equipe', c.unread, c.tags.join(', ')]),
    }),
  },
];

/** Relatórios disponíveis ao perfil (os demais nem aparecem na biblioteca). */
export function availableReports(access: ReportAccess): ReportDefinition[] {
  return REPORT_LIBRARY.filter((r) => access[r.requires]);
}
