import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ListChecks, Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, DataTable, EmptyState, IconButton, Input, Modal, SearchInput, Select, SpecialtyTag, Switch, useToast } from '@ds/components';
import { formatCurrency } from '@ds/mocks/business';
import type { Specialty } from '@ds/mocks/types';
import { settingsService, useAction, useCan, useServices, useSpecialties, type ServiceRecord } from '@core';
import { ReadOnlyNote } from './shared';

function formatPrice(p: number | null): string {
  return p === null ? 'R$ [definir]' : formatCurrency(p);
}

interface ServiceForm {
  id?: string;
  name: string;
  specialty: Specialty;
  duration: string;
  price: number | null;
  active: boolean;
}

const EMPTY_FORM: ServiceForm = { name: '', specialty: 'odontologia', duration: '40', price: null, active: true };

export function validateServiceForm(f: ServiceForm, existing: ServiceRecord[]): Record<string, string> {
  const e: Record<string, string> = {};
  const name = f.name.trim();
  if (!name) e.name = 'Informe o nome do serviço.';
  else if (existing.some((s) => s.id !== f.id && s.specialty === f.specialty && s.name.trim().toLowerCase() === name.toLowerCase()))
    e.name = 'Já existe um serviço com este nome nesta especialidade.';
  const d = Number(f.duration);
  if (!Number.isInteger(d) || d < 10 || d > 240) e.duration = 'Duração entre 10 e 240 minutos.';
  return e;
}

/** Configurações › Serviços — lista, busca, cadastro, edição e ativação via `upsertService`. */
export function ServicesSection() {
  const { toast } = useToast();
  const services = useServices();
  const specialties = useSpecialties();
  const canEdit = useCan('configuracoes', 'editar');
  const upsert = useAction(settingsService.upsertService);
  const toggle = useAction(settingsService.upsertService, { success: 'Serviço atualizado' });

  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [form, setForm] = useState<ServiceForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const specialtyOptions = specialties.map((s) => ({ value: s.id, label: s.active ? s.name : `${s.name} (inativa)` }));
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services
      .filter((s) => (!q || s.name.toLowerCase().includes(q)) && (!specialtyFilter || s.specialty === specialtyFilter))
      .sort((a, b) => a.specialty.localeCompare(b.specialty) || a.name.localeCompare(b.name, 'pt-BR'));
  }, [services, query, specialtyFilter]);

  function openNew() {
    setErrors({});
    setForm({ ...EMPTY_FORM, specialty: (specialtyFilter as Specialty) || EMPTY_FORM.specialty });
  }
  function openEdit(s: ServiceRecord) {
    setErrors({});
    setForm({ id: s.id, name: s.name, specialty: s.specialty, duration: String(s.durationMin), price: s.price, active: s.active });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const errs = validateServiceForm(form, services);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const saved = await upsert.run({
      id: form.id,
      name: form.name.trim(),
      specialty: form.specialty,
      durationMin: Number(form.duration),
      price: form.price,
      active: form.active,
    });
    if (saved) {
      setForm(null);
      toast({
        tone: 'success',
        title: form.id ? 'Serviço atualizado' : 'Serviço adicionado',
        description: saved.price === null ? 'Defina o preço quando a clínica confirmar.' : saved.name,
      });
    } else if (upsert.error?.fields) setErrors(upsert.error.fields);
  }

  return (
    <div className="flex flex-col gap-4">
      {!canEdit && <ReadOnlyNote />}
      <Card
        title="Serviços e procedimentos"
        description="Preços oficiais ainda não definidos — exibidos como R$ [definir]."
        padding="none"
        action={
          canEdit ? (
            <Button size="sm" leftIcon={Plus} onClick={openNew}>
              Novo serviço
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-end md:px-6">
          <SearchInput
            aria-label="Buscar serviço"
            placeholder="Buscar serviço"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:flex-1"
          />
          <div className="sm:w-60">
            <Select
              label="Especialidade"
              controlSize="sm"
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              options={[{ value: '', label: 'Todas' }, ...specialtyOptions]}
            />
          </div>
        </div>
        <DataTable<ServiceRecord>
          caption="Serviços cadastrados"
          rowKey={(r) => r.id}
          rows={rows}
          empty={<EmptyState compact icon={ListChecks} title="Nenhum serviço encontrado" description="Ajuste a busca ou cadastre um novo serviço." />}
          columns={[
            { key: 'name', header: 'Serviço', render: (r) => <span className="font-semibold text-graphite-900">{r.name}</span> },
            { key: 'specialty', header: 'Especialidade', hideBelow: 'md', render: (r) => <SpecialtyTag specialty={r.specialty} variant="dot" /> },
            { key: 'duration', header: 'Duração', align: 'right', hideBelow: 'md', render: (r) => <span className="tabular-nums">{r.durationMin} min</span> },
            {
              key: 'price',
              header: 'Preço',
              align: 'right',
              render: (r) =>
                r.price === null ? (
                  <Badge tone="warning" size="sm">
                    {formatPrice(r.price)}
                  </Badge>
                ) : (
                  <span className="tabular-nums">{formatPrice(r.price)}</span>
                ),
            },
            {
              key: 'active',
              header: 'Ativo',
              align: 'right',
              render: (r) => (
                <Switch
                  checked={r.active}
                  disabled={!canEdit || toggle.loading}
                  label={r.active ? 'Ativo' : 'Inativo'}
                  onChange={(v) => void toggle.run({ ...r, active: v })}
                />
              ),
            },
            ...(canEdit
              ? [
                  {
                    key: 'edit',
                    header: 'Editar',
                    srOnlyHeader: true,
                    align: 'right' as const,
                    render: (r: ServiceRecord) => <IconButton icon={Pencil} size="sm" label={`Editar ${r.name}`} onClick={() => openEdit(r)} />,
                  },
                ]
              : []),
          ]}
        />
      </Card>
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar serviço' : 'Novo serviço'}
        size="sm"
        dismissible={!upsert.loading}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={upsert.loading}>
              Cancelar
            </Button>
            <Button type="submit" form="service-form" loading={upsert.loading}>
              {form?.id ? 'Salvar' : 'Adicionar'}
            </Button>
          </>
        }
      >
        {form && (
          <form id="service-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Input label="Nome do serviço" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
            <Select
              label="Especialidade"
              options={specialtyOptions}
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value as Specialty })}
              hint="Associa o serviço à especialidade na agenda e no Assistente IA."
            />
            <Input
              label="Duração (min)"
              type="number"
              min={10}
              max={240}
              step={5}
              value={form.duration}
              error={errors.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
            <Input label="Preço" value={formatPrice(form.price)} disabled hint="Preços oficiais são definidos pela clínica." />
            <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={form.active ? 'Serviço ativo' : 'Serviço inativo'} />
          </form>
        )}
      </Modal>
    </div>
  );
}
