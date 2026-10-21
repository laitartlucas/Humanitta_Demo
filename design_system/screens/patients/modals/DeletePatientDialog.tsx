import { useAction, type ID } from '@core';
import { ConfirmDialog } from '@ds/components';
import { deactivatePatient, reactivatePatient, removePatient } from '../data/patientData';

/**
 * - `deactivate`: exclusão lógica (padrão) — o histórico é preservado.
 * - `reactivate`: volta o cadastro para ativo.
 * - `delete`: exclusão definitiva, só para cadastro sem nenhum agendamento (o serviço revalida).
 */
export type PatientStatusAction = 'deactivate' | 'reactivate' | 'delete';

export interface DeletePatientDialogProps {
  patient: { id: ID; name: string } | null;
  action: PatientStatusAction;
  open: boolean;
  onClose: () => void;
  onDone?: (action: PatientStatusAction, patientId: ID) => void;
}

const COPY: Record<PatientStatusAction, { title: string; confirm: string; success: string; text: (name: string) => string }> = {
  deactivate: {
    title: 'Desativar paciente?',
    confirm: 'Desativar cadastro',
    success: 'Cadastro desativado',
    text: (n) =>
      `O cadastro de ${n} ficará inativo e deixará de aparecer nos filtros de ativos. Agendamentos, atendimentos e lançamentos são mantidos, e você pode reativar quando quiser.`,
  },
  reactivate: {
    title: 'Reativar paciente?',
    confirm: 'Reativar cadastro',
    success: 'Cadastro reativado',
    text: (n) => `${n} volta a aparecer como paciente ativo e pode ser selecionado(a) em novos agendamentos.`,
  },
  delete: {
    title: 'Excluir paciente?',
    confirm: 'Excluir paciente',
    success: 'Paciente excluído',
    text: (n) =>
      `O cadastro de ${n} não tem nenhum agendamento e será removido desta demonstração. Esta ação não pode ser desfeita.`,
  },
};

export function DeletePatientDialog({ patient, action, open, onClose, onDone }: DeletePatientDialogProps) {
  const copy = COPY[action];
  const deactivate = useAction(deactivatePatient, { success: COPY.deactivate.success });
  const reactivate = useAction(reactivatePatient, { success: COPY.reactivate.success });
  const remove = useAction(removePatient, { success: COPY.delete.success });
  const current = action === 'delete' ? remove : action === 'reactivate' ? reactivate : deactivate;

  if (!patient) return null;

  async function confirm() {
    if (!patient) return;
    if (await current.run(patient.id)) onDone?.(action, patient.id);
    else onClose();
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      tone={action === 'reactivate' ? 'primary' : 'danger'}
      loading={current.loading}
      title={copy.title}
      description={copy.text(patient.name)}
      confirmLabel={copy.confirm}
      onConfirm={confirm}
    />
  );
}
