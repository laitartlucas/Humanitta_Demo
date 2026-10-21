import { useEffect, useState } from 'react';
import { FilePenLine, Lock, Save, ShieldCheck } from 'lucide-react';
import type { Role } from '@ds/access';
import { ROLE_LABEL } from '@ds/access';
import { Badge, Button, Checkbox, Textarea } from '@ds/components';
import { formatDate, formatTime } from '@ds/mocks/clinical';
import type { ClinicalRecord } from '@core';
import { DEMO_NOTE_FIELDS, DEMO_NOTE_MAX, emptyDemoNote, parseDemoNote, type DemoNote } from '@modules/attendances/clinicalNote';
import type { AttendanceView } from '@modules/attendances/model';

/** Campos do registro demonstrativo (usados no painel e na conclusão do atendimento). */
export function DemoNoteFields({
  idPrefix,
  note,
  onChange,
  confirmed,
  onConfirmedChange,
  errors,
  disabled,
}: {
  idPrefix: string;
  note: DemoNote;
  onChange: (n: DemoNote) => void;
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="sr-only">Registro demonstrativo — conteúdo fictício</legend>
      {DEMO_NOTE_FIELDS.map((f) => (
        <Textarea
          key={f.key}
          id={`${idPrefix}-${f.key}`}
          label={f.label}
          rows={f.rows}
          maxLength={DEMO_NOTE_MAX}
          placeholder={f.placeholder}
          value={note[f.key]}
          error={errors?.[f.key]}
          onChange={(e) => onChange({ ...note, [f.key]: e.target.value })}
        />
      ))}
      <div>
        <Checkbox
          id={`${idPrefix}-ficticio`}
          label="Confirmo que este registro é fictício"
          description="Sem dados reais ou identificáveis de pacientes. Uso exclusivo para demonstração."
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
        />
        {errors?.ficticio && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {errors.ficticio}
          </p>
        )}
      </div>
    </fieldset>
  );
}

const LGPD_NOTE =
  'Dados de saúde são dados pessoais sensíveis (LGPD, Lei 13.709/2018, art. 11). O acesso é restrito ao profissional responsável e cada visualização deve ficar registrada em log de auditoria no produto. Nesta demonstração nenhum dado clínico real é exibido.';

export interface DemoRecordPanelProps {
  view: AttendanceView;
  /** Perfil logado (para o texto de restrição). */
  role: Role;
  /** Profissional responsável com atendimento iniciado ou concluído. */
  canEdit: boolean;
  record?: ClinicalRecord;
  saving?: boolean;
  errors?: Record<string, string>;
  /** Devolve `true` quando salvou. */
  onSave: (note: DemoNote, fictitiousConfirmed: boolean) => Promise<boolean>;
}

/**
 * Registro demonstrativo do atendimento. Para quem não é o profissional responsável, mostra
 * apenas o aviso de acesso restrito — o conteúdo nunca chega a esta tela (o core devolve vazio).
 */
export function DemoRecordPanel({ view, role, canEdit, record, saving, errors, onSave }: DemoRecordPanelProps) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<DemoNote>(() => (record ? parseDemoNote(record.summary) : emptyDemoNote()));
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setNote(record ? parseDemoNote(record.summary) : emptyDemoNote());
    setConfirmed(false);
    setEditing(false);
  }, [record, view.id]);

  if (role !== 'profissional' || !canEdit) {
    const own = role === 'profissional';
    return (
      <section aria-labelledby="att-clinical" aria-describedby="att-clinical-desc att-clinical-lgpd" className="rounded-md border border-graphite-200 bg-graphite-50 p-4">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-white text-gold-600">
            <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h3 id="att-clinical" className="text-sm font-bold text-graphite-900">
              Registro clínico — acesso restrito a profissionais (demonstração)
            </h3>
            <p id="att-clinical-desc" className="text-xs text-graphite-500">
              {own
                ? 'O registro fica disponível após o início do atendimento.'
                : `Visível e editável somente por ${view.professionalName}. Seu perfil (${ROLE_LABEL[role]}) tem acesso apenas administrativo.`}
            </p>
          </div>
        </div>
        <fieldset disabled className="flex flex-col gap-3">
          <legend className="sr-only">Campos clínicos bloqueados para o seu perfil</legend>
          {DEMO_NOTE_FIELDS.slice(0, 3).map((f) => (
            <Textarea key={f.key} id={`att-${view.id}-locked-${f.key}`} label={f.label} rows={2} placeholder="Acesso restrito ao profissional responsável" disabled />
          ))}
        </fieldset>
        <p id="att-clinical-lgpd" className="mt-3 flex items-start gap-2 text-xs text-graphite-600">
          <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0 text-gold-600" />
          <span>{LGPD_NOTE}</span>
        </p>
      </section>
    );
  }

  const showForm = editing || !record;
  const saved = record ? parseDemoNote(record.summary) : null;

  return (
    <section aria-labelledby="att-record" className="rounded-md border border-graphite-200 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="att-record" className="text-sm font-bold text-graphite-900">
            Registro demonstrativo do atendimento
          </h3>
          <p className="text-xs text-graphite-500">
            {view.professionalName}
            {record ? ` · ${formatDate(record.updatedAt ?? record.createdAt, { day: '2-digit', month: '2-digit' })} ${formatTime(record.updatedAt ?? record.createdAt)}` : ' · ainda não registrado'}
          </p>
        </div>
        <Badge tone="gold" size="sm" icon={ShieldCheck}>
          Conteúdo fictício
        </Badge>
      </div>

      {showForm ? (
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onSave(note, confirmed)) setEditing(false);
          }}
        >
          <DemoNoteFields
            idPrefix={`att-${view.id}-rec`}
            note={note}
            onChange={setNote}
            confirmed={confirmed}
            onConfirmedChange={setConfirmed}
            errors={errors}
            disabled={saving}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {record && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Descartar alterações
              </Button>
            )}
            <Button type="submit" variant="secondary" size="sm" leftIcon={Save} loading={saving}>
              Salvar registro
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="flex flex-col gap-3">
            {DEMO_NOTE_FIELDS.filter((f) => saved?.[f.key]).map((f) => (
              <div key={f.key}>
                <dt className="text-xs font-semibold text-graphite-500">{f.label}</dt>
                <dd className="whitespace-pre-line text-sm text-graphite-900">{saved?.[f.key]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" leftIcon={FilePenLine} onClick={() => setEditing(true)}>
              Editar registro
            </Button>
          </div>
        </>
      )}
      <p className="mt-3 flex items-start gap-2 text-xs text-graphite-600">
        <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0 text-gold-600" />
        <span>Texto livre digitado pelo profissional. O sistema não gera diagnósticos, prescrições nem recomendações automáticas.</span>
      </p>
    </section>
  );
}
