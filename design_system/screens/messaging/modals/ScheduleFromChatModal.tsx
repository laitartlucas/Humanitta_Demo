import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarX2, Link2 } from 'lucide-react';
import { Button, EmptyState, Modal, Select } from '@ds/components';
import { cn } from '@ds/foundations/cn';
import type { Professional, Specialty } from '@ds/mocks/types';
import type { ServiceRecord, SpecialtyRecord } from '@core';
import { findAvailableSlots, type SlotOption } from '@modules/messaging/availability';
import type { ScheduleFromConversationInput } from '@modules/messaging/service';

export interface ScheduleFromChatModalProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  /** Conversa vinculada a um paciente cadastrado. */
  linked: boolean;
  onLink: () => void;
  professionals: Professional[];
  specialties: SpecialtyRecord[];
  services: ServiceRecord[];
  /** Especialidade sugerida (ex.: da próxima consulta ou das etiquetas). */
  initialSpecialty?: Specialty;
  loading?: boolean;
  /** Cria o agendamento pelo serviço compartilhado; devolve true em caso de sucesso. */
  onConfirm: (input: ScheduleFromConversationInput) => Promise<boolean>;
}

/** Agendamento a partir da conversa: horários livres reais da agenda compartilhada. */
export function ScheduleFromChatModal({
  open,
  onClose,
  contactName,
  linked,
  onLink,
  professionals,
  specialties,
  services,
  initialSpecialty,
  loading = false,
  onConfirm,
}: ScheduleFromChatModalProps) {
  const active = specialties.filter((s) => s.active);
  const [specialty, setSpecialty] = useState<Specialty>(initialSpecialty ?? active[0]?.id ?? 'odontologia');
  const [professionalId, setProfessionalId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [slot, setSlot] = useState<SlotOption | null>(null);

  useEffect(() => {
    if (!open) return;
    setSpecialty(initialSpecialty ?? active[0]?.id ?? 'odontologia');
    setProfessionalId('');
    setSlot(null);
  }, [open]);

  const specServices = services.filter((s) => s.active && s.specialty === specialty);
  const service = specServices.find((s) => s.id === serviceId) ?? specServices[0];
  const durationMin = service?.durationMin ?? specialties.find((s) => s.id === specialty)?.defaultDurationMin ?? 50;
  const specPros = professionals.filter((p) => p.specialty === specialty);

  const slots = useMemo(
    () => (open ? findAvailableSlots(professionals, { specialty, professionalId: professionalId || undefined, durationMin, limit: 6 }) : []),
    [open, professionals, specialty, professionalId, durationMin],
  );

  const confirm = async () => {
    if (!slot) return;
    const ok = await onConfirm({
      professionalId: slot.professionalId,
      start: slot.start,
      durationMin,
      service: service?.name ?? 'Consulta',
      serviceId: service?.id,
    });
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agendar consulta"
      description={`Para ${contactName}. Horários livres da agenda da clínica.`}
      footer={
        linked ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button leftIcon={CalendarCheck} onClick={confirm} disabled={!slot} loading={loading}>
              Confirmar agendamento
            </Button>
          </>
        ) : undefined
      }
    >
      {!linked ? (
        <EmptyState
          icon={Link2}
          title="Contato sem cadastro"
          description="Vincule a conversa a um paciente cadastrado para agendar. Assim a consulta fica na ficha certa, sem cadastro duplicado."
          action={
            <Button leftIcon={Link2} onClick={onLink}>
              Vincular a paciente
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Especialidade"
              value={specialty}
              onChange={(e) => {
                setSpecialty(e.target.value as Specialty);
                setProfessionalId('');
                setServiceId('');
                setSlot(null);
              }}
              options={active.map((s) => ({ value: s.id, label: s.name }))}
            />
            <Select
              label="Profissional"
              value={professionalId}
              onChange={(e) => {
                setProfessionalId(e.target.value);
                setSlot(null);
              }}
              options={[{ value: '', label: 'Qualquer profissional' }, ...specPros.map((p) => ({ value: p.id, label: p.name }))]}
            />
            <Select
              label="Serviço"
              value={service?.id ?? ''}
              onChange={(e) => {
                setServiceId(e.target.value);
                setSlot(null);
              }}
              options={specServices.length ? specServices.map((s) => ({ value: s.id, label: `${s.name} · ${s.durationMin} min` })) : [{ value: '', label: 'Consulta' }]}
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-graphite-800">Horários livres</legend>
            {slots.length === 0 ? (
              <EmptyState compact icon={CalendarX2} title="Sem horários livres" description="Nenhum horário livre nos próximos 7 dias para este filtro." />
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {slots.map((s) => {
                  const selected = slot?.start === s.start && slot.professionalId === s.professionalId;
                  return (
                    <li key={`${s.professionalId}-${s.start}`}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSlot(s)}
                        className={cn(
                          'flex w-full flex-col rounded-sm border px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:shadow-focus',
                          selected
                            ? 'border-gold-600 bg-gold-50 text-graphite-900'
                            : 'border-graphite-200 bg-white text-graphite-800 hover:border-gold-400 hover:bg-gold-50',
                        )}
                      >
                        <span className="font-bold tabular-nums">{s.label.split(' · ').slice(0, 2).join(' · ')}</span>
                        <span className="text-[12px] text-graphite-600">{s.professionalName}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
          <p className="rounded-sm bg-info-bg p-3 text-[12px] text-info">
            O agendamento é criado na agenda compartilhada (canal WhatsApp) com as mesmas regras de conflito da Agenda. Nenhuma
            mensagem é enviada ao paciente — envie a confirmação pelo chat, se desejar.
          </p>
        </div>
      )}
    </Modal>
  );
}
