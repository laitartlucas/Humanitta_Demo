import { useState } from 'react';
import type { FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button, Card, Input, useToast } from '@ds/components';
import { clinicInfo } from '@ds/mocks/business';
import type { ClinicInfo } from '@ds/mocks/business';

export function ClinicDataSection() {
  const { toast } = useToast();
  const [data, setData] = useState<ClinicInfo>(clinicInfo);
  const [saving, setSaving] = useState(false);

  const setAddr = (k: keyof ClinicInfo['address'], v: string) => setData((d) => ({ ...d, address: { ...d.address, [k]: v } }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast({ tone: 'success', title: 'Dados da clínica atualizados', description: 'Alteração salva apenas nesta demonstração.' });
    }, 500);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card title="Identificação" description="Informações exibidas em documentos, recibos e no Assistente IA.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Nome da clínica" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} required />
          <Input label="Nome de exibição" value={data.tradeName} onChange={(e) => setData({ ...data, tradeName: e.target.value })} />
          <Input label="CNPJ" value={data.cnpj} onChange={(e) => setData({ ...data, cnpj: e.target.value })} hint="Dado a confirmar com a clínica." />
          <Input label="Ano de fundação" value={String(data.foundedYear)} inputMode="numeric" onChange={(e) => setData({ ...data, foundedYear: Number(e.target.value) || data.foundedYear })} />
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
            <Input label="UF" value={data.address.state} maxLength={2} onChange={(e) => setAddr('state', e.target.value.toUpperCase())} />
          </div>
          <div className="md:col-span-2">
            <Input label="CEP" value={data.address.zip} onChange={(e) => setAddr('zip', e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Input label="WhatsApp" type="tel" value={data.whatsapp} onChange={(e) => setData({ ...data, whatsapp: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Input label="E-mail" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Input label="Instagram" value={data.instagram} onChange={(e) => setData({ ...data, instagram: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Input label="Site / Linktree" value={data.website} onChange={(e) => setData({ ...data, website: e.target.value })} />
          </div>
        </div>
      </Card>
      <Card title="Responsável técnica">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Nome" value={data.technicalLead.name} onChange={(e) => setData({ ...data, technicalLead: { ...data.technicalLead, name: e.target.value } })} />
          <Input label="Título" value={data.technicalLead.title} onChange={(e) => setData({ ...data, technicalLead: { ...data.technicalLead, title: e.target.value } })} />
          <Input label="Registro profissional" value={data.technicalLead.registry} onChange={(e) => setData({ ...data, technicalLead: { ...data.technicalLead, registry: e.target.value } })} />
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setData(clinicInfo)}>
          Descartar
        </Button>
        <Button type="submit" leftIcon={Save} loading={saving}>
          Salvar dados
        </Button>
      </div>
    </form>
  );
}
