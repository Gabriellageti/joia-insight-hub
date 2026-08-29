import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { commercialStages, commercialStageLabels, defaultStageProbability, type CommercialStage } from "@/lib/commercial/commercial";
import { createCommercialLead, updateCommercialLead, type CommercialLead } from "@/integrations/supabase/commercial";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; lead: CommercialLead | null; workspaceId: string; userId: string; employees: Array<{ userId?: string; name: string }>; onSaved: () => Promise<void> };

export function CommercialLeadDialog({ open, onOpenChange, lead, workspaceId, userId, employees, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company: "", name: "", phone: "", email: "", source: "", service: "", value: 0, probability: 10, stage: "new_lead" as CommercialStage, responsible_user_id: userId, expected_close_date: "", next_action: "", next_action_date: "", notes: "", lost_reason: "" });

  useEffect(() => {
    if (!open) return;
    setForm(lead ? {
      company: lead.company || "", name: lead.name, phone: lead.phone || "", email: lead.email || "", source: lead.source || "", service: lead.service || "",
      value: Number(lead.value || 0), probability: lead.probability, stage: lead.stage, responsible_user_id: lead.responsible_user_id || userId,
      expected_close_date: lead.expected_close_date || "", next_action: lead.next_action || "", next_action_date: lead.next_action_date || "", notes: lead.notes || "", lost_reason: lead.lost_reason || "",
    } : { company: "", name: "", phone: "", email: "", source: "", service: "", value: 0, probability: 10, stage: "new_lead", responsible_user_id: userId, expected_close_date: "", next_action: "", next_action_date: "", notes: "", lost_reason: "" });
  }, [lead, open, userId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.company.trim() || !form.name.trim()) return toast.error("Empresa e contato são obrigatórios.");
    if (form.stage === "lost" && !form.lost_reason.trim()) return toast.error("Informe o motivo da perda.");
    setSaving(true);
    try {
      const payload = { ...form, company: form.company.trim(), name: form.name.trim(), email: form.email || null, phone: form.phone || null, source: form.source || null, service: form.service || null, expected_close_date: form.expected_close_date || null, next_action: form.next_action || null, next_action_date: form.next_action_date || null, notes: form.notes || null, lost_reason: form.stage === "lost" ? form.lost_reason : null };
      if (lead) await updateCommercialLead(lead.id, payload);
      else await createCommercialLead({ ...payload, workspace_id: workspaceId, created_by: userId, status: form.stage });
      await onSaved();
      toast.success(lead ? "Oportunidade atualizada." : "Oportunidade criada.");
      onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{lead ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle><DialogDescription>Dados comerciais, responsável, etapa e próxima ação.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Empresa" id="commercial-company"><Input id="commercial-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
      <Field label="Contato" id="commercial-contact"><Input id="commercial-contact" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Telefone" id="commercial-phone"><Input id="commercial-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="E-mail" id="commercial-email"><Input id="commercial-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Origem" id="commercial-source"><Input id="commercial-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Indicação, site, evento…" /></Field>
      <Field label="Serviço" id="commercial-service"><Input id="commercial-service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} /></Field>
      <Field label="Valor estimado" id="commercial-value"><Input id="commercial-value" type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></Field>
      <Field label="Probabilidade (%)" id="commercial-probability"><Input id="commercial-probability" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} /></Field>
      <div className="space-y-2"><Label>Etapa</Label><Select value={form.stage} onValueChange={(stage: CommercialStage) => setForm({ ...form, stage, probability: defaultStageProbability[stage] })}><SelectTrigger aria-label="Etapa comercial"><SelectValue /></SelectTrigger><SelectContent>{commercialStages.map((stage) => <SelectItem key={stage} value={stage}>{commercialStageLabels[stage]}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Responsável</Label><Select value={form.responsible_user_id} onValueChange={(responsible_user_id) => setForm({ ...form, responsible_user_id })}><SelectTrigger aria-label="Responsável comercial"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{employees.filter((employee) => employee.userId).map((employee) => <SelectItem key={employee.userId} value={employee.userId!}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
      <Field label="Previsão de fechamento" id="commercial-close-date"><Input id="commercial-close-date" type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} /></Field>
      <Field label="Data do próximo contato" id="commercial-next-date"><Input id="commercial-next-date" type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} /></Field>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="commercial-next-action">Próxima ação</Label><Input id="commercial-next-action" value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} /></div>
      {form.stage === "lost" && <div className="space-y-2 sm:col-span-2"><Label htmlFor="commercial-lost-reason">Motivo da perda</Label><Input id="commercial-lost-reason" value={form.lost_reason} onChange={(e) => setForm({ ...form, lost_reason: e.target.value })} /></div>}
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="commercial-notes">Observações</Label><Textarea id="commercial-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
    </div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>; }
