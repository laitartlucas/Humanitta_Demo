import { useEffect, useState, type FormEvent } from 'react';
import type { Professional } from '@core';
import { useAction, useCan } from '@core';
import { Button, Checkbox, Input, Modal } from '@ds/components';
import { createProfessional } from '../professionalActions';
import {
  EMPTY_PROFESSIONAL_FORM,
  ProfessionalFormFields,
  validateProfessionalForm,
  type ProfessionalFormErrors,
  type ProfessionalFormValues,
} from './ProfessionalFormFields';

export interface NewProfessionalModalProps {
  open: boolean;
  onClose: () => void;
  /** Chamado com o cadastro gravado pelo core (o modal já mostra o toast de sucesso). */
  onCreate?: (professional: Professional) => void;
}

/** Cadastro de profissional + (opcional) usuário individual do Portal com `professionalId` vinculado. */
export function NewProfessionalModal({ open, onClose, onCreate }: NewProfessionalModalProps) {
  const canManageUsers = useCan('usuarios_permissoes', 'editar');
  const create = useAction(createProfessional, { success: 'Profissional cadastrado' });
  const [values, setValues] = useState<ProfessionalFormValues>(EMPTY_PROFESSIONAL_FORM);
  const [withAccess, setWithAccess] = useState(true);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<ProfessionalFormErrors>({});

  useEffect(() => {
    if (open) {
      setValues(EMPTY_PROFESSIONAL_FORM);
      setWithAccess(canManageUsers);
      setEmail('');
      setErrors({});
      create.clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clearError muda a cada render
  }, [open, canManageUsers]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const next = validateProfessionalForm(values);
    if (withAccess && !email.trim()) next.accessEmail = 'Informe o e-mail de acesso ou desmarque a opção.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const created = await create.run({ ...values, accessEmail: withAccess ? email : undefined });
    if (!created) return; // toast já exibido; campos do serviço aparecem via create.error.fields
    onCreate?.(created);
    onClose();
  }

  // Erros de validação do serviço (ex.: e-mail já usado) chegam em create.error.fields.
  const fieldErrors: ProfessionalFormErrors = { ...create.error?.fields, ...errors };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      dismissible={!create.loading}
      title="Novo profissional"
      description="Cadastro de demonstração. Os horários padrão (seg–sex, 08:00–17:00) podem ser ajustados no perfil."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.loading}>
            Cancelar
          </Button>
          <Button type="submit" form="new-professional-form" loading={create.loading}>
            Cadastrar profissional
          </Button>
        </>
      }
    >
      <form id="new-professional-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <ProfessionalFormFields idPrefix="npf" values={values} errors={fieldErrors} onChange={setValues} disabled={create.loading} />
        <fieldset className="flex flex-col gap-3 rounded-md border border-graphite-200 p-4" disabled={create.loading}>
          <legend className="px-1 text-body-sm font-bold text-graphite-900">Acesso ao Portal do Profissional</legend>
          <Checkbox
            label="Criar usuário individual para o Portal"
            description={
              canManageUsers
                ? 'O profissional passa a aparecer no login de demonstração e vê só a própria agenda.'
                : 'Seu perfil não gerencia usuários. A administração pode liberar o acesso depois.'
            }
            checked={withAccess}
            disabled={!canManageUsers}
            onChange={(e) => setWithAccess(e.target.checked)}
          />
          {withAccess && (
            <Input
              id="npf-access-email"
              label="E-mail de acesso"
              type="email"
              placeholder="nome@humanitta.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.accessEmail}
              hint="Fictício · perfil de acesso: Profissional de saúde (fixo)"
              autoComplete="off"
              required
            />
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
