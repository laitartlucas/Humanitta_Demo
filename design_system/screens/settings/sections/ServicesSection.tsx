import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, DataTable, Input, Modal, Select, SpecialtyTag, SPECIALTY_LABEL, Switch, useToast } from '@ds/components';
import type { Specialty } from '@ds/mocks/types';
import { formatCurrency, services as initialServices } from '@ds/mocks/business';
import type { ServiceSetting } from '@ds/mocks/business';

function formatPrice(p: number | null): string {
  return p === null ? 'R$ [definir]' : formatCurrency(p);
}

const SPECIALTY_OPTIONS = (Object.keys(SPECIALTY_LABEL) as Specialty[]).map((s) => ({ value: s, label: SPECIALTY_LABEL[s] }));

export function ServicesSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<ServiceSetting[]>(initialServices);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<Specialty>('odontologia');
  const [duration, setDuration] = useState('40');
  const [error, setError] = useState<string | undefined>();

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome do serviço.');
      return;
    }
    setItems((l) => [...l, { id: `sv-${Date.now()}`, name: name.trim(), specialty, durationMin: Number(duration) || 30, price: null, active: true }]);
    setOpen(false);
    setName('');
    setError(undefined);
    toast({ tone: 'success', title: 'Serviço adicionado', description: 'Defina o preço quando a clínica confirmar.' });
  };

  return (
    <Card
      title="Serviços e procedimentos"
      description="Preços oficiais ainda não definidos — exibidos como R$ [definir]."
      padding="none"
      action={
        <Button size="sm" leftIcon={Plus} onClick={() => setOpen(true)}>
          Novo serviço
        </Button>
      }
    >
      <DataTable<ServiceSetting>
        caption="Serviços cadastrados"
        rowKey={(r) => r.id}
        rows={items}
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
                label={r.active ? 'Ativo' : 'Inativo'}
                onChange={(v) => setItems((l) => l.map((x) => (x.id === r.id ? { ...x, active: v } : x)))}
              />
            ),
          },
        ]}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo serviço"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="new-service-form">
              Adicionar
            </Button>
          </>
        }
      >
        <form id="new-service-form" onSubmit={add} className="flex flex-col gap-4" noValidate>
          <Input label="Nome do serviço" value={name} onChange={(e) => setName(e.target.value)} error={error} required />
          <Select label="Especialidade" options={SPECIALTY_OPTIONS} value={specialty} onChange={(e) => setSpecialty(e.target.value as Specialty)} />
          <Input label="Duração (min)" type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          <Input label="Preço" value="R$ [definir]" disabled hint="Preços oficiais são definidos pela clínica." />
        </form>
      </Modal>
    </Card>
  );
}
