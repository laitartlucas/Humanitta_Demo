import { useEffect, useMemo, useState } from 'react';
import { Link2, UserPlus, Users } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, Modal, SearchInput } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { Patient } from '@ds/mocks/types';

export interface LinkPatientModalProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  phone: string;
  patients: Patient[];
  loading?: boolean;
  onLink: (patientId: string) => Promise<boolean>;
  /** Leva ao módulo Pacientes para um cadastro novo (não cria cadastro aqui). */
  onCreatePatient?: () => void;
}

const digits = (s: string) => s.replace(/\D/g, '');

/** Vincula a conversa a um paciente JÁ cadastrado. Sugere quem tem o mesmo telefone. */
export function LinkPatientModal({ open, onClose, contactName, phone, patients, loading = false, onLink, onCreatePatient }: LinkPatientModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(null);
    }
  }, [open]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ph = digits(phone);
    return patients
      .filter((p) => !q || p.name.toLowerCase().includes(q) || digits(p.phone).includes(digits(q) || '__'))
      .map((p) => ({ p, samePhone: ph.length > 0 && digits(p.phone) === ph }))
      .sort((a, b) => Number(b.samePhone) - Number(a.samePhone) || a.p.name.localeCompare(b.p.name))
      .slice(0, 30);
  }, [patients, query, phone]);

  const confirm = async () => {
    if (selected && (await onLink(selected))) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vincular a paciente"
      description={`Conversa com ${contactName} · ${phone}`}
      footer={
        <>
          {onCreatePatient && (
            <Button variant="ghost" leftIcon={UserPlus} onClick={onCreatePatient} className="mr-auto">
              Novo cadastro em Pacientes
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button leftIcon={Link2} onClick={confirm} disabled={!selected} loading={loading}>
            Vincular
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SearchInput aria-label="Buscar paciente" placeholder="Buscar por nome ou telefone" value={query} onChange={(e) => setQuery(e.target.value)} />
        {list.length === 0 ? (
          <EmptyState compact icon={Users} title="Nenhum paciente encontrado" description="Confira a grafia ou faça um novo cadastro no módulo Pacientes." />
        ) : (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto" role="list">
            {list.map(({ p, samePhone }) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={selected === p.id}
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left focus-visible:outline-none focus-visible:shadow-focus',
                    selected === p.id ? 'border-gold-600 bg-gold-50' : 'border-transparent hover:bg-graphite-50',
                  )}
                >
                  <Avatar name={p.name} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold text-graphite-900">{p.name}</span>
                    <span className="text-[12px] text-graphite-500">{p.phone}</span>
                  </span>
                  {samePhone && (
                    <Badge tone="gold" size="sm">
                      Mesmo telefone
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
