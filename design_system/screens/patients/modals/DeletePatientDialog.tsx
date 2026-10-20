import { useEffect, useState } from 'react';
import type { Patient } from '@ds/mocks/types';
import { ConfirmDialog } from '@ds/components';

export interface DeletePatientDialogProps {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (patient: Patient) => void;
}

export function DeletePatientDialog({ patient, open, onClose, onConfirm }: DeletePatientDialogProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setLoading(false);
  }, [open]);

  if (!patient) return null;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      tone="danger"
      loading={loading}
      title="Excluir paciente?"
      description={`O cadastro de ${patient.name} será removido desta demonstração, junto com os agendamentos futuros. Registros clínicos e financeiros seriam mantidos conforme a legislação. Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir paciente"
      onConfirm={() => {
        setLoading(true);
        window.setTimeout(() => onConfirm(patient), 500);
      }}
    />
  );
}
