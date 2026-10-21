/**
 * Ações do Portal compostas a partir dos serviços do core (nenhuma escrita direta no banco).
 * Assinatura de serviço `(ctx, ...args)` para uso com `useAction`.
 */
import { attendanceService, logActivity, type AccessContext, type Attendance, type ID } from '@core';
import { weekdayDate } from './portalUtils';

export interface FinishWithReturnInput {
  /** Texto do registro clínico (gravado só para o profissional responsável). */
  summary?: string;
  /** Nome do paciente, para o aviso à recepção. */
  patientName: string;
  /** Retorno sugerido (AAAA-MM-DD). A recepção confirma com o paciente. */
  suggestedDate?: string;
  /** Há observação para a recepção? O CONTEÚDO não vai para o feed (pode conter dado sensível). */
  hasNoteToReception?: boolean;
}

/**
 * Finaliza o atendimento (`attendanceService.finishAttendance`, que já valida o profissional
 * responsável e grava o prontuário) e avisa a recepção do retorno sugerido pelo feed de atividades.
 */
export function finishAttendanceWithReturn(ctx: AccessContext, appointmentId: ID, input: FinishWithReturnInput): Attendance {
  const at = attendanceService.finishAttendance(ctx, appointmentId, input.summary);
  if (input.suggestedDate) {
    logActivity(
      ctx,
      `sugeriu retorno de ${input.patientName} por volta de ${weekdayDate(input.suggestedDate)}${input.hasNoteToReception ? ' (com observação)' : ''}.`,
      'info',
    );
  }
  return at;
}
