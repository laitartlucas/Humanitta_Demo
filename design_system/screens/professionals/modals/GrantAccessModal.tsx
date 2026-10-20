import { useEffect, useState, type FormEvent } from 'react';
import type { Professional } from '@core';
import { useAction } from '@core';
import { Button, Input, Modal } from '@ds/components';
import { grantPortalAccess } from '../professionalActions';

export interface GrantAccessModalProps {
  professional: Professional | null;
  open: boolean;
  onClose: () => void;
}

/** Cria o usuário individual do Portal (perfil Profissional de saúde, vinculado ao `professionalId`). */
export function GrantAccessModal({ professional, open, onClose }: GrantAccessModalProps) {
  const grant = useAction(grantPortalAccess, { success: 'Acesso ao Portal liberado' });
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setEmail('');
      setError(undefined);
      grant.clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clearError muda a cada render
  }, [open]);

  if (!professional) return null;

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!professional) return;
    if (!email.trim()) {
      setError('Informe o e-mail de acesso.');
      return;
    }
    setError(undefined);
    const user = await grant.run(professional.id, email);
    if (user) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      dismissible={!grant.loading}
      title="Liberar acesso ao Portal"
      description={`${professional.name} passa a entrar com o próprio usuário e vê somente a própria agenda, pacientes e atendimentos.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={grant.loading}>
            Cancelar
          </Button>
          <Button type="submit" form="grant-access-form" loading={grant.loading}>
            Liberar acesso
          </Button>
        </>
      }
    >
      <form id="grant-access-form" onSubmit={handleSubmit} noValidate>
        <Input
          id="grant-access-email"
          label="E-mail de acesso"
          type="email"
          placeholder="nome@humanitta.demo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? grant.error?.fields?.accessEmail}
          hint="Fictício · perfil de acesso fixo: Profissional de saúde"
          autoComplete="off"
          required
        />
      </form>
    </Modal>
  );
}
