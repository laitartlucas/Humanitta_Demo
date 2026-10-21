import type { FormEvent } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button, Card, Input, Textarea } from '@ds/components';
import type { ClinicInfo } from '@ds/mocks/business';
import { settingsService, useAction, useCan, useClinicSettings } from '@core';
import { useSettingsDraft } from '../draft';
import { ReadOnlyNote } from './shared';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Campos ainda não confirmados pela clínica ficam como "[a confirmar…]" e não são validados. */
const isPlaceholder = (v: string) => v.trim().startsWith('[');

export function validateClinicInfo(d: ClinicInfo): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.name.trim()) e.name = 'Informe o nome da clínica.';
  if (d.email.trim() && !isPlaceholder(d.email) && !EMAIL_RE.test(d.email.trim())) e.email = 'Informe um e-mail válido.';
  if (d.whatsapp.trim() && !isPlaceholder(d.whatsapp) && d.whatsapp.replace(/\D/g, '').length < 10) e.whatsapp = 'Informe DDD e número.';
  if (d.address.state.trim() && !/^[A-Z]{2}$/.test(d.address.state.trim())) e.state = 'Use a sigla com 2 letras (ex.: RS).';
  if (d.address.zip.trim() && !isPlaceholder(d.address.zip) && !/^\d{5}-?\d{3}$/.test(d.address.zip.trim())) e.zip = 'CEP no formato 00000-000.';
  const year = Number(d.foundedYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) e.foundedYear = 'Ano inválido.';
  return e;
}

/** Configurações › Dados da clínica — grava em `clinicSettings.info` via `settingsService.updateClinicSettings`. */
export function ClinicDataSection() {
  const settings = useClinicSettings();
  const canEdit = useCan('configuracoes', 'editar');
  const update = useAction(settingsService.updateClinicSettings);
  const { value: data, setDraft, dirty, save, discard, saving, errors } = useSettingsDraft<ClinicInfo>(
    'clinica',
    settings.info,
    (info) => update.run({ info }),
    { validate: validateClinicInfo, success: 'Dados da clínica atualizados' },
  );

  const set = (patch: Partial<ClinicInfo>) => setDraft((d) => ({ ...d, ...patch }));
  const setAddr = (k: keyof ClinicInfo['address'], v: string) => setDraft((d) => ({ ...d, address: { ...d.address, [k]: v } }));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await save();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {!canEdit && <ReadOnlyNote />}
      <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-6">
        <Card title="Identificação" description="Informações exibidas em documentos, recibos e no Assistente IA.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Nome da clínica" value={data.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} required />
            <Input label="Nome de exibição" value={data.tradeName} onChange={(e) => set({ tradeName: e.target.value })} />
            <Input label="CNPJ" value={data.cnpj} onChange={(e) => set({ cnpj: e.target.value })} hint="Dado a confirmar com a clínica." />
            <Input
              label="Ano de fundação"
              value={String(data.foundedYear)}
              inputMode="numeric"
              maxLength={4}
              error={errors.foundedYear}
              onChange={(e) => set({ foundedYear: Number(e.target.value.replace(/\D/g, '')) || 0 })}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Descrição institucional"
                rows={2}
                value={data.tagline}
                onChange={(e) => set({ tagline: e.target.value })}
                hint="Frase curta usada no login, recibos e respostas do Assistente IA."
              />
            </div>
          </div>
        </Card>
        <Card title="Endereço e contato">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="md:col-span-4">
              <Input label="Logradouro e número" value={data.address.street} onChange={(e) => setAddr('street', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Input label="Bairro" value={data.address.district} onChange={(e) => setAddr('district', e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Input label="Cidade" value={data.address.city} onChange={(e) => setAddr('city', e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Input label="UF" value={data.address.state} maxLength={2} error={errors.state} onChange={(e) => setAddr('state', e.target.value.toUpperCase())} />
            </div>
            <div className="md:col-span-2">
              <Input label="CEP" value={data.address.zip} error={errors.zip} inputMode="numeric" onChange={(e) => setAddr('zip', e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Input label="WhatsApp" type="tel" value={data.whatsapp} error={errors.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Input label="E-mail" type="email" value={data.email} error={errors.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Input label="Instagram" value={data.instagram} onChange={(e) => set({ instagram: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Input label="Site / Linktree" value={data.website} onChange={(e) => set({ website: e.target.value })} />
            </div>
          </div>
        </Card>
        <Card title="Responsável técnica">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Nome" value={data.technicalLead.name} onChange={(e) => set({ technicalLead: { ...data.technicalLead, name: e.target.value } })} />
            <Input label="Título" value={data.technicalLead.title} onChange={(e) => set({ technicalLead: { ...data.technicalLead, title: e.target.value } })} />
            <Input label="Registro profissional" value={data.technicalLead.registry} onChange={(e) => set({ technicalLead: { ...data.technicalLead, registry: e.target.value } })} />
          </div>
        </Card>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" leftIcon={RotateCcw} onClick={discard} disabled={!dirty || saving}>
            Descartar
          </Button>
          <Button type="submit" leftIcon={Save} loading={saving} disabled={!dirty}>
            Salvar dados
          </Button>
        </div>
      )}
    </form>
  );
}
