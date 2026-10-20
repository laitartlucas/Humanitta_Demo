import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info, Send } from 'lucide-react';
import { Button, Checkbox, Input, Modal, SegmentedControl, Select, Textarea, useToast } from '@ds/components';
import { WEEKDAY_NAMES, formatTime, parseDate, toDateKey, toLocalIso } from '@ds/mocks/clinical';
import type { BlockRequest, BlockRequestKind, PortalAppointment, Weekday } from '@ds/mocks/portal';
import {
  PORTAL_NOW,
  PORTAL_PROFESSIONAL_ID,
  PORTAL_TODAY,
  findMyConflicts,
  getMyAppointments,
  getMyAvailability,
  getMyBlocks,
  timeToMinutes,
} from '@ds/mocks/portal';
import { isWaiting, weekdayDate } from '../../shared/portalUtils';

export interface RequestBlockModalProps {
  open: boolean;
  onClose: () => void;
  /** Recebe a solicitação criada (status 'enviada'). O modal já exibe o toast. */
  onSubmit: (request: BlockRequest) => void;
  professionalId?: string;
  /** Tipo inicial (padrão 'bloqueio'). */
  initialKind?: BlockRequestKind;
  /** Data inicial AAAA-MM-DD (padrão: hoje da demo). */
  initialDate?: string;
  initialStart?: string;
  initialEnd?: string;
  /** Consultas consideradas na detecção de conflito (padrão: getMyAppointments). */
  appointments?: PortalAppointment[];
  /** Solicitações existentes (para evitar bloqueio duplicado). */
  existingRequests?: BlockRequest[];
}

const BLOCK_REASONS = ['Compromisso pessoal', 'Curso / evento', 'Consulta médica', 'Férias', 'Outro'];
const AVAILABILITY_REASONS = ['Ampliar horário', 'Reduzir horário', 'Deixar de atender neste dia', 'Outro'];
const WEEKDAY_OPTIONS: Weekday[] = [1, 2, 3, 4, 5, 6];

interface Errors {
  date?: string;
  time?: string;
  reason?: string;
  ack?: string;
}

/**
 * Solicitação de bloqueio de horário ou de alteração de disponibilidade.
 * O profissional SOLICITA; a administração aprova (o servidor valida a permissão 'solicitar').
 */
export function RequestBlockModal({
  open,
  onClose,
  onSubmit,
  professionalId = PORTAL_PROFESSIONAL_ID,
  initialKind = 'bloqueio',
  initialDate,
  initialStart,
  initialEnd,
  appointments,
  existingRequests,
}: RequestBlockModalProps) {
  const { toast } = useToast();
  const todayKey = toDateKey(PORTAL_TODAY);
  const [kind, setKind] = useState<BlockRequestKind>(initialKind);
  const [date, setDate] = useState(initialDate ?? todayKey);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState(initialStart ?? '14:00');
  const [end, setEnd] = useState(initialEnd ?? '16:00');
  const [weekday, setWeekday] = useState<Weekday>(6);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setDate(initialDate ?? todayKey);
    setAllDay(false);
    setStart(initialStart ?? (initialKind === 'disponibilidade' ? '08:00' : '14:00'));
    setEnd(initialEnd ?? (initialKind === 'disponibilidade' ? '12:00' : '16:00'));
    setWeekday(6);
    setReason('');
    setNote('');
    setAck(false);
    setErrors({});
    setSending(false);
  }, [open, initialKind, initialDate, initialStart, initialEnd, todayKey]);

  const myAppointments = useMemo(() => appointments ?? getMyAppointments(professionalId), [appointments, professionalId]);
  const availability = useMemo(() => getMyAvailability(professionalId), [professionalId]);

  const effStart = allDay ? '00:00' : start;
  const effEnd = allDay ? '23:59' : end;
  const timeValid = Boolean(start && end) && (allDay || timeToMinutes(end) > timeToMinutes(start));

  /** Bloqueio: consultas no período. Disponibilidade: consultas futuras fora do novo horário. */
  const conflicts = useMemo<PortalAppointment[]>(() => {
    if (!timeValid || !date) return [];
    if (kind === 'bloqueio') return findMyConflicts(professionalId, date, effStart, effEnd, myAppointments);
    return myAppointments.filter((a) => {
      const d = new Date(a.start);
      if (d.getDay() !== weekday || toDateKey(d) < date || !isWaiting(a.status)) return false;
      const s = d.getHours() * 60 + d.getMinutes();
      return s < timeToMinutes(start) || s + a.durationMin > timeToMinutes(end);
    });
  }, [kind, date, effStart, effEnd, start, end, weekday, timeValid, myAppointments, professionalId]);

  const overlapping = useMemo(() => {
    if (kind !== 'bloqueio' || !timeValid) return undefined;
    return getMyBlocks(professionalId, existingRequests).find(
      (b) => b.date === date && timeToMinutes(b.start) < timeToMinutes(effEnd) && timeToMinutes(b.end) > timeToMinutes(effStart),
    );
  }, [kind, timeValid, professionalId, existingRequests, date, effStart, effEnd]);

  const outsideHours = useMemo(() => {
    if (kind !== 'bloqueio' || !date) return false;
    const day = availability.find((d) => d.weekday === parseDate(date).getDay());
    return !day?.enabled;
  }, [kind, date, availability]);

  const currentDay = availability.find((d) => d.weekday === weekday);

  function validate(): Errors {
    const e: Errors = {};
    if (!date) e.date = 'Informe a data.';
    else if (date < todayKey) e.date = 'Escolha hoje ou uma data futura.';
    else if (outsideHours) e.date = 'Você não atende neste dia — não há o que bloquear.';
    if (!timeValid) e.time = 'O término precisa ser depois do início.';
    else if (overlapping) e.time = `Já existe um bloqueio ${overlapping.status === 'aprovada' ? 'aprovado' : 'pendente'} neste período (${overlapping.start}–${overlapping.end}).`;
    if (!reason) e.reason = 'Selecione o motivo.';
    if (conflicts.length > 0 && !ack) e.ack = 'Confirme que está ciente das consultas afetadas.';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSending(true);
    const request: BlockRequest = {
      id: `req-${Date.now()}`,
      professionalId,
      kind,
      date,
      start: allDay ? '08:00' : start,
      end: allDay ? '18:00' : end,
      allDay: kind === 'bloqueio' ? allDay : undefined,
      weekday: kind === 'disponibilidade' ? weekday : undefined,
      reason,
      note: note.trim() || undefined,
      status: 'enviada',
      createdAt: toLocalIso(PORTAL_NOW),
    };
    window.setTimeout(() => {
      onSubmit(request);
      toast({
        tone: 'warning',
        title: 'Solicitação enviada — aguardando aprovação',
        description:
          kind === 'bloqueio'
            ? `${weekdayDate(date)} · ${allDay ? 'dia inteiro' : `${start}–${end}`}. Você será avisada quando a administração responder.`
            : `${WEEKDAY_NAMES[weekday]}s ${start}–${end}. A grade só muda após a aprovação.`,
      });
      setSending(false);
      onClose();
    }, 450);
  }

  const reasons = kind === 'bloqueio' ? BLOCK_REASONS : AVAILABILITY_REASONS;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={kind === 'bloqueio' ? 'Solicitar bloqueio de horário' : 'Solicitar alteração de disponibilidade'}
      description="A administração da clínica analisa e aprova. Até lá, nada muda na agenda da recepção."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button leftIcon={Send} loading={sending} onClick={handleSubmit}>
            Enviar solicitação
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          handleSubmit();
        }}
      >
        <SegmentedControl
          ariaLabel="Tipo de solicitação"
          value={kind}
          onChange={(v) => {
            setKind(v as BlockRequestKind);
            setReason('');
            setErrors({});
          }}
          options={[
            { value: 'bloqueio', label: 'Bloqueio de horário' },
            { value: 'disponibilidade', label: 'Alterar disponibilidade' },
          ]}
          className="self-start"
        />

        {kind === 'bloqueio' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Data"
              type="date"
              required
              min={todayKey}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={errors.date}
              wrapperClassName="sm:col-span-2"
            />
            <Checkbox
              label="Dia inteiro"
              description="Bloqueia todo o expediente desta data."
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="sm:col-span-2"
            />
            {!allDay && (
              <>
                <Input label="Início" type="time" step={1800} required value={start} onChange={(e) => setStart(e.target.value)} error={errors.time} />
                <Input label="Término" type="time" step={1800} required value={end} onChange={(e) => setEnd(e.target.value)} />
              </>
            )}
            {allDay && errors.time && <p className="text-body-sm text-danger sm:col-span-2">{errors.time}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Dia da semana"
              value={String(weekday)}
              onChange={(e) => setWeekday(Number(e.target.value) as Weekday)}
              options={WEEKDAY_OPTIONS.map((w) => ({ value: String(w), label: WEEKDAY_NAMES[w] }))}
              hint={
                currentDay?.enabled
                  ? `Hoje: ${currentDay.start}–${currentDay.end}${currentDay.breakStart ? ` (intervalo ${currentDay.breakStart}–${currentDay.breakEnd})` : ''}`
                  : 'Hoje: sem atendimento'
              }
            />
            <Input label="Válido a partir de" type="date" required min={todayKey} value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
            <Input label="Novo início" type="time" step={1800} required value={start} onChange={(e) => setStart(e.target.value)} error={errors.time} />
            <Input label="Novo término" type="time" step={1800} required value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Motivo"
            required
            placeholder="Selecione"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={reasons.map((r) => ({ value: r, label: r }))}
            error={errors.reason}
          />
          <Textarea
            label="Observação para a administração (opcional)"
            rows={3}
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: sugestão para remarcar os pacientes afetados."
            hint={`${note.length}/280 · não inclua dados clínicos.`}
          />
        </div>

        {conflicts.length > 0 ? (
          <div role="status" className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning-bg p-4">
            <p className="flex items-start gap-2 text-body-sm font-bold text-warning">
              <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
              {conflicts.length === 1 ? '1 consulta será afetada' : `${conflicts.length} consultas serão afetadas`}
            </p>
            <ul className="flex flex-col gap-1 text-body-sm text-graphite-800">
              {conflicts.slice(0, 5).map((a) => (
                <li key={a.id} className="tabular-nums">
                  {weekdayDate(a.start)} · {formatTime(a.start)} — {a.patientName} ({a.service})
                </li>
              ))}
              {conflicts.length > 5 && <li>e mais {conflicts.length - 5}…</li>}
            </ul>
            <Checkbox
              label="Estou ciente: a recepção vai remarcar estes pacientes após a aprovação."
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              error={errors.ack}
            />
          </div>
        ) : (
          timeValid &&
          date && (
            <p role="status" className="flex items-start gap-2 rounded-md bg-success-bg px-4 py-3 text-body-sm text-success">
              <Info size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
              Nenhuma consulta sua neste período.
            </p>
          )
        )}

        <p className="flex items-start gap-2 text-caption text-graphite-500">
          <Info size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
          Enquanto a solicitação estiver em análise, o período aparece na sua agenda como “Bloqueio pendente”.
        </p>
      </form>
    </Modal>
  );
}
