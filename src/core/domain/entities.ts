/**
 * Humanittá Gestão — modelo de dados ÚNICO compartilhado pelos 8 agentes.
 *
 * Regras (ver docs/DATA_MODELS.md):
 * - Os tipos originais de `@ds/mocks/types` continuam sendo a base; aqui eles são re-exportados
 *   e estendidos. Para evoluir, ACRESCENTE campos opcionais — nunca renomeie nem remova.
 * - IDs são strings estáveis com prefixo por entidade (`pac-`, `prof-`, `ag-`, `u-`, …).
 * - Relacionamentos sempre por ID (`patientId`, `professionalId`, …). Nomes desnormalizados
 *   (ex.: `Appointment.patientName`) existem para compatibilidade com as telas e são mantidos
 *   pelos serviços — nunca edite um sem o outro.
 * - Somente o Integrador (Agente 0) altera este arquivo.
 */
import type { AccessLevel, Feature, Role } from '@ds/access';
import type {
  ActivityEvent,
  Appointment,
  AppointmentStatus,
  ChatMessage,
  Conversation,
  FinancialEntry,
  PaymentMethod,
  PaymentStatus,
  Patient,
  Professional,
  Room,
  Specialty,
} from '@ds/mocks/types';
import type {
  AiAssistantConfig,
  ClinicHours,
  ClinicInfo,
  IntegrationSetting,
  NotificationSetting,
  VisualIdentitySetting,
} from '@ds/mocks/business';
import type { BlockRequest, BlockRequestKind, BlockRequestStatus, PortalAlert, Weekday } from '@ds/mocks/portal';

export type {
  ActivityEvent,
  AiAssistantConfig,
  Appointment,
  AppointmentStatus,
  BlockRequest,
  BlockRequestKind,
  BlockRequestStatus,
  ChatMessage,
  ClinicHours,
  ClinicInfo,
  Conversation,
  IntegrationSetting,
  NotificationSetting,
  PaymentMethod,
  PaymentStatus,
  PortalAlert,
  Professional,
  Specialty,
  VisualIdentitySetting,
  Weekday,
};

/** Identificador estável de entidade. */
export type ID = string;

/* ------------------------------------------------------------------ */
/* Cadastros                                                            */
/* ------------------------------------------------------------------ */

/** Paciente (cadastro completo — visível só a perfis com `pacientes_cadastro` ≥ ver). */
export interface PatientRecord extends Patient {
  /** Observação administrativa da recepção (aparece no portal do profissional). */
  adminNote?: string;
  /** Alertas de atendimento (não clínicos). */
  alerts?: PortalAlert[];
  /** Tratamento em curso por profissional: `{ [professionalId]: descrição }`. */
  carePlans?: Record<ID, string>;
}

/** Especialidade como entidade de configuração (o `id` é o próprio código `Specialty`). */
export interface SpecialtyRecord {
  id: Specialty;
  name: string;
  /** Cor de marcação (vem de SPECIALTY_HEX; não usar fora dos componentes do DS). */
  colorHex: string;
  defaultDurationMin: number;
  active: boolean;
}

/** Serviço / procedimento oferecido. `price: null` = preço ainda não definido pela clínica. */
export interface ServiceRecord {
  id: ID;
  name: string;
  specialty: Specialty;
  durationMin: number;
  price: number | null;
  active: boolean;
}

export interface RoomRecord extends Room {
  label: string;
  active: boolean;
  note?: string;
}

/** Usuário do sistema. Perfil profissional SEMPRE tem `professionalId`. */
export interface UserRecord {
  id: ID;
  name: string;
  email: string;
  role: Role;
  /** Rótulo exibido no shell (ex.: "Recepcionista", "Ortodontista"). */
  title: string;
  initials: string;
  status: 'ativo' | 'convidado' | 'inativo';
  /** Vínculo com o cadastro de profissional (obrigatório quando role = 'profissional'). */
  professionalId?: ID;
  lastAccess?: string;
  isDemo: boolean;
}

/* ------------------------------------------------------------------ */
/* Operação                                                             */
/* ------------------------------------------------------------------ */

export type { Patient };

/** Agendamento. `serviceId` é opcional enquanto as telas usam o nome do serviço. */
export interface AppointmentRecord extends Appointment {
  serviceId?: ID;
  createdAt?: string;
  updatedAt?: string;
  cancelReason?: string;
  /** Id do agendamento original quando este é um reagendamento. */
  rescheduledFrom?: ID;
}

export type AttendanceStatus = 'aguardando' | 'em_andamento' | 'finalizado' | 'faltou' | 'cancelado';

/**
 * Atendimento: o ciclo operacional de um agendamento (check-in → início → fim).
 * Um por agendamento (`id = at-<appointmentId>`). Não contém dado clínico.
 */
export interface Attendance {
  id: ID;
  appointmentId: ID;
  patientId: ID;
  professionalId: ID;
  status: AttendanceStatus;
  checkInAt?: string;
  startedAt?: string;
  finishedAt?: string;
  /** Resumo administrativo, sem conteúdo clínico. */
  note?: string;
}

/**
 * Registro clínico (prontuário). Tabela separada, visível SOMENTE ao profissional responsável.
 * Administrador/recepção/financeiro nunca leem (limite fixo de LGPD).
 */
export interface ClinicalRecord {
  id: ID;
  attendanceId: ID;
  appointmentId: ID;
  patientId: ID;
  professionalId: ID;
  summary: string;
  createdAt: string;
  updatedAt?: string;
}

/** Lançamento financeiro com vínculos por ID (os nomes ficam por compatibilidade). */
export interface FinancialEntryRecord extends FinancialEntry {
  patientId?: ID;
  professionalId?: ID;
  appointmentId?: ID;
  paidAt?: string;
}

/** Conversa do WhatsApp. `patientId` aponta para `PatientRecord.id` (prefixo `pac-`). */
export type ConversationRecord = Conversation;
export type MessageRecord = ChatMessage;

/** Solicitação de bloqueio de horário / alteração de disponibilidade. */
export type BlockRequestRecord = BlockRequest;

/* ------------------------------------------------------------------ */
/* Configurações                                                        */
/* ------------------------------------------------------------------ */

export type AiConfig = AiAssistantConfig;

export interface ClinicSettings {
  info: ClinicInfo;
  hours: ClinicHours[];
  notifications: NotificationSetting[];
  integrations: IntegrationSetting[];
  visualIdentity: VisualIdentitySetting;
  /**
   * Ajustes da matriz feitos em Configurações › Permissões, por cima de `PERMISSIONS` (@ds/access).
   * Os limites fixos de LGPD são reaplicados pelo `core/access` mesmo que alguém os altere aqui.
   */
  permissionOverrides: Partial<Record<Role, Partial<Record<Feature, AccessLevel>>>>;
  /** Perfil que aprova solicitações de bloqueio (proposta: admin). */
  blockApproverRole: Role;
}

/* ------------------------------------------------------------------ */
/* Banco demonstrativo                                                  */
/* ------------------------------------------------------------------ */

/** Estado completo persistido. Uma única fonte de verdade para todos os módulos. */
export interface Database {
  schemaVersion: number;
  patients: PatientRecord[];
  professionals: Professional[];
  users: UserRecord[];
  specialties: SpecialtyRecord[];
  services: ServiceRecord[];
  rooms: RoomRecord[];
  appointments: AppointmentRecord[];
  attendances: Attendance[];
  clinicalRecords: ClinicalRecord[];
  financialEntries: FinancialEntryRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  blockRequests: BlockRequestRecord[];
  activity: ActivityEvent[];
  aiConfig: AiConfig;
  clinicSettings: ClinicSettings;
}

/** Coleções (listas com `id`) do banco. */
export type CollectionKey = {
  [K in keyof Database]: Database[K] extends ReadonlyArray<{ id: string }> ? K : never;
}[keyof Database];

/** Tipo do item de uma coleção. */
export type EntityOf<K extends CollectionKey> = Database[K] extends ReadonlyArray<infer T> ? T : never;

/** Documentos únicos (configurações). */
export type SingletonKey = 'aiConfig' | 'clinicSettings';
