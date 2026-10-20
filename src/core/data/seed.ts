/**
 * Semente do banco demonstrativo — monta UM conjunto coerente a partir dos mocks do design.
 *
 * Os mocks da Etapa 1 foram escritos tela a tela e têm pequenas divergências. Aqui elas são
 * resolvidas UMA vez (decisões documentadas em docs/DATA_MODELS.md §6):
 * - consultas extras da Dra. Lauren (portal) entram na agenda da clínica, com preço demonstrativo;
 * - o "agora" é único (clock.ts: 19/10/2026 10:24), então ag-103 já está concluída;
 * - lançamentos financeiros e conversas ganham `patientId`/`professionalId` reais (`pac-`, `prof-`);
 * - usuários: um por perfil administrativo + um por profissional (cada um com `professionalId`);
 * - v2 (integração): histórico determinístico set–out/2026 + fechamentos nov/25–ago/26 (history.ts),
 *   reagendamento ag-004 → ag-404 encadeado e mensagem m-0802 sem menção a prontuário.
 *
 * Todos os dados são FICTÍCIOS, exceto o nome/registro da Dra. Lauren Bertocchi (informação pública).
 */
import type { Role } from '@ds/access';
import {
  activityEvents,
  appointments as clinicAppointments,
  ALL_SPECIALTIES,
  initials,
  patients as clinicPatients,
  professionals as clinicProfessionals,
  SPECIALTY_HEX,
  SPECIALTY_NAMES,
} from '@ds/mocks/clinical';
import {
  chatMessages,
  clinicHours,
  clinicInfo,
  conversations as rawConversations,
  defaultAiConfig,
  financialEntries as rawEntries,
  integrations,
  notificationSettings,
  rooms as roomSettings,
  services as serviceSettings,
  specialtySettings,
  visualIdentity,
} from '@ds/mocks/business';
import {
  MY_BLOCK_REQUESTS,
  PORTAL_ADMIN_NOTES,
  PORTAL_ALERTS,
  PORTAL_EXTRA_APPOINTMENTS,
  PORTAL_STATUS_OVERRIDES,
  PORTAL_SUMMARY_BY_SERVICE,
  PORTAL_TREATMENTS,
} from '@ds/mocks/portal';
import type {
  AppointmentRecord,
  Attendance,
  AttendanceStatus,
  ClinicalRecord,
  ConversationRecord,
  Database,
  FinancialEntryRecord,
  PatientRecord,
  SpecialtyRecord,
  UserRecord,
} from '../domain';
import { buildHistory } from './history';

/** Incrementar sempre que o formato do `Database` mudar (força nova semente no navegador). */
export const SCHEMA_VERSION = 2;

/** Preço demonstrativo das consultas extras do portal (que nasceram sem valor). */
const DEMO_PRICE_BY_SERVICE: Record<string, number> = {
  'Manutenção ortodôntica': 380,
  'Avaliação ortodôntica': 220,
  'Limpeza/profilaxia': 200,
  'Consulta de retorno': 0,
  Clareamento: 480,
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function buildPatients(): PatientRecord[] {
  return clinicPatients.map((p) => ({
    ...clone(p),
    adminNote: PORTAL_ADMIN_NOTES[p.id],
    alerts: PORTAL_ALERTS[p.id] ? clone(PORTAL_ALERTS[p.id]) : undefined,
    carePlans: PORTAL_TREATMENTS[p.id] ? { 'prof-lauren': PORTAL_TREATMENTS[p.id] } : undefined,
  }));
}

function buildAppointments(): AppointmentRecord[] {
  const clinic: AppointmentRecord[] = clinicAppointments.map((a) => ({
    ...clone(a),
    status: PORTAL_STATUS_OVERRIDES[a.id] ?? a.status,
  }));
  const extra: AppointmentRecord[] = PORTAL_EXTRA_APPOINTMENTS.map((a) => ({
    ...clone(a),
    price: DEMO_PRICE_BY_SERVICE[a.service] ?? 0,
  }));
  // ag-004 foi substituído por ag-404 (reagendamento): o novo nasce "agendada" e aponta para o original.
  const fixed = clinic.map((a) => (a.id === 'ag-404' ? { ...a, status: 'agendada' as const, rescheduledFrom: 'ag-004' } : a));
  return [...fixed, ...extra].sort((a, b) => a.start.localeCompare(b.start));
}

const ATTENDANCE_BY_STATUS: Partial<Record<AppointmentRecord['status'], AttendanceStatus>> = {
  concluida: 'finalizado',
  em_atendimento: 'em_andamento',
  faltou: 'faltou',
};

function addMinutesIso(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/** Um atendimento por consulta já iniciada/encerrada. */
function buildAttendances(appts: AppointmentRecord[]): Attendance[] {
  return appts.flatMap((a): Attendance[] => {
    const status = ATTENDANCE_BY_STATUS[a.status];
    if (!status) return [];
    return [
      {
        id: `at-${a.id}`,
        appointmentId: a.id,
        patientId: a.patientId,
        professionalId: a.professionalId,
        status,
        checkInAt: status === 'faltou' ? undefined : addMinutesIso(a.start, -10),
        startedAt: status === 'faltou' ? undefined : a.start,
        finishedAt: status === 'finalizado' ? addMinutesIso(a.start, a.durationMin) : undefined,
      },
    ];
  });
}

/** Prontuário demonstrativo: só para atendimentos finalizados. */
function buildClinicalRecords(attendances: Attendance[], appts: AppointmentRecord[]): ClinicalRecord[] {
  const byId = new Map(appts.map((a) => [a.id, a]));
  return attendances
    .filter((at) => at.status === 'finalizado')
    .map((at) => {
      const a = byId.get(at.appointmentId);
      return {
        id: `cr-${at.appointmentId}`,
        attendanceId: at.id,
        appointmentId: at.appointmentId,
        patientId: at.patientId,
        professionalId: at.professionalId,
        summary: (a && PORTAL_SUMMARY_BY_SERVICE[a.service]) ?? 'Resumo demonstrativo — conteúdo fictício.',
        createdAt: at.finishedAt ?? at.startedAt ?? a?.start ?? '',
      };
    });
}

function buildUsers(): UserRecord[] {
  const admins: UserRecord[] = [
    { id: 'u-admin', name: 'Camila S.', email: 'administracao@humanitta.demo', role: 'admin', title: 'Administradora', initials: 'CS', status: 'ativo', lastAccess: '2026-10-19T10:15:00', isDemo: true },
    { id: 'u-recepcao', name: 'Juliana P.', email: 'recepcao@humanitta.demo', role: 'recepcao', title: 'Recepcionista', initials: 'JP', status: 'ativo', lastAccess: '2026-10-19T07:52:00', isDemo: true },
    { id: 'u-financeiro', name: 'Marcelo T.', email: 'financeiro@humanitta.demo', role: 'financeiro', title: 'Financeiro', initials: 'MT', status: 'ativo', lastAccess: '2026-10-17T14:30:00', isDemo: true },
  ];
  const pros: UserRecord[] = clinicProfessionals.map((p) => ({
    id: `u-${p.id}`,
    name: p.name,
    email: `${p.id.replace('prof-', '')}@humanitta.demo`,
    role: 'profissional' as Role,
    title: p.title.split(' · ')[0],
    initials: initials(p.name),
    status: 'ativo' as const,
    professionalId: p.id,
    isDemo: p.isDemo,
  }));
  return [...admins, ...pros];
}

function buildSpecialties(): SpecialtyRecord[] {
  return ALL_SPECIALTIES.map((id) => {
    const s = specialtySettings.find((x) => x.specialty === id);
    return { id, name: SPECIALTY_NAMES[id], colorHex: SPECIALTY_HEX[id], defaultDurationMin: s?.defaultDurationMin ?? 40, active: s?.active ?? true };
  });
}

function buildFinancialEntries(patients: PatientRecord[]): FinancialEntryRecord[] {
  const patientByName = new Map(patients.map((p) => [p.name, p.id]));
  const profByName = new Map(clinicProfessionals.map((p) => [p.name, p.id]));
  return rawEntries.map((e) => ({
    ...clone(e),
    patientId: e.patientName ? patientByName.get(e.patientName) : undefined,
    professionalId: e.professionalName ? profByName.get(e.professionalName) : undefined,
    paidAt: e.status === 'pago' ? e.date : undefined,
  }));
}

/** Conversas: corrige `p-01` → `pac-01` e alinha o telefone ao cadastro do paciente. */
function buildConversations(patients: PatientRecord[]): ConversationRecord[] {
  const byName = new Map(patients.map((p) => [p.name, p]));
  return rawConversations.map((c) => {
    const p = byName.get(c.contactName);
    return { ...clone(c), patientId: p?.id, phone: p?.phone ?? c.phone };
  });
}

/** Mensagens da semente. m-0802 deixa de citar o prontuário (texto administrativo; CR 07 §9). */
function buildMessages() {
  return clone(chatMessages).map((m) =>
    m.id === 'm-0802' ? { ...m, text: 'Recebido, Beatriz! Nossa equipe vai encaminhar o documento à profissional responsável.' } : m,
  );
}

export interface SeedOptions {
  /** Inclui o histórico demonstrativo nov/25–out/26 (padrão true). `false` = semente base da Etapa 1 (testes de regra). */
  history?: boolean;
}

export function createSeed(options: SeedOptions = {}): Database {
  const patients = buildPatients();
  const professionals = clone(clinicProfessionals);
  const base = buildAppointments();
  const history = options.history === false ? { appointments: [], financialEntries: [] } : buildHistory(professionals, patients, base);
  const appointments = [...history.appointments, ...base].sort((a, b) => a.start.localeCompare(b.start));
  const attendances = buildAttendances(appointments);
  return {
    schemaVersion: SCHEMA_VERSION,
    patients,
    professionals,
    users: buildUsers(),
    specialties: buildSpecialties(),
    services: clone(serviceSettings),
    rooms: clone(roomSettings),
    appointments,
    attendances,
    clinicalRecords: buildClinicalRecords(attendances, appointments),
    financialEntries: [...buildFinancialEntries(patients), ...history.financialEntries],
    conversations: buildConversations(patients),
    messages: buildMessages(),
    blockRequests: clone(MY_BLOCK_REQUESTS),
    activity: clone(activityEvents),
    aiConfig: clone(defaultAiConfig),
    clinicSettings: {
      info: clone(clinicInfo),
      hours: clone(clinicHours),
      notifications: clone(notificationSettings),
      integrations: clone(integrations),
      visualIdentity: clone(visualIdentity),
      permissionOverrides: {},
      blockApproverRole: 'admin',
    },
  };
}

/** Usuário de demonstração padrão por perfil (seletor do login). */
export const DEFAULT_DEMO_USER_BY_ROLE: Record<Role, string> = {
  admin: 'u-admin',
  recepcao: 'u-recepcao',
  profissional: 'u-prof-lauren',
  financeiro: 'u-financeiro',
};

