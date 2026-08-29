import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, Pencil, Plus, RefreshCw, Target, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommercialLeadDialog } from "@/components/commercial/CommercialLeadDialog";
import { CommercialDetailsDialog } from "@/components/commercial/CommercialDetailsDialog";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { listCommercialData, updateCommercialLead, type CommercialActivity, type CommercialFollowUp, type CommercialLead, type CommercialProposal } from "@/integrations/supabase/commercial";
import { calculateCommercialMetrics, commercialStages, commercialStageLabels, defaultStageProbability, type CommercialStage } from "@/lib/commercial/commercial";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { hasWorkspaceRole } from "@/lib/authorization";
import type { Project } from "@/types";
import { toast } from "sonner";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

export default function Commercial() {
  const { user, activeMembership } = useAuth();
  const { employees } = useData();
  const [data, setData] = useState<{ leads: CommercialLead[]; activities: CommercialActivity[]; proposals: CommercialProposal[]; followUps: CommercialFollowUp[] }>({ leads: [], activities: [], proposals: [], followUps: [] });
  const [loading, setLoading] = useState(true);
  const [leadDialog, setLeadDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [editing, setEditing] = useState<CommercialLead | null>(null);
  const [selected, setSelected] = useState<CommercialLead | null>(null);
  const [projectLead, setProjectLead] = useState<CommercialLead | null>(null);
  const canWrite = hasWorkspaceRole(activeMembership?.role, "manager");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listCommercialData();
      setData(next);
      setSelected((current) => current ? next.leads.find((lead) => lead.id === current.id) || null : null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar o CRM."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => calculateCommercialMetrics(data.leads, data.proposals), [data.leads, data.proposals]);
  const openFollowUps = useMemo(() => data.followUps.filter((item) => !item.completed_at).slice(0, 6), [data.followUps]);
  const employeeName = (id: string | null) => employees.find((employee) => employee.userId === id)?.name || "Sem responsável";

  async function moveLead(lead: CommercialLead, stage: CommercialStage) {
    if (!canWrite || stage === lead.stage) return;
    if (stage === "lost") { setEditing({ ...lead, stage }); setLeadDialog(true); return; }
    try { await updateCommercialLead(lead.id, { stage, probability: defaultStageProbability[stage] }); await load(); toast.success(`Movido para ${commercialStageLabels[stage]}.`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar a etapa."); }
  }

  const projectDraft = projectLead ? ({
    name: projectLead.service ? `${projectLead.service} — ${projectLead.company}` : `Projeto — ${projectLead.company}`,
    clientId: projectLead.converted_client_id!, clientName: projectLead.company || projectLead.name,
    objective: `Entregar ${projectLead.service || "o serviço contratado"} conforme oportunidade comercial ganha.`, scope: projectLead.notes || "",
    phase: "Diagnóstico", projectType: "consulting", responsibleUserId: projectLead.responsible_user_id || undefined,
    responsibleNameLegacy: employeeName(projectLead.responsible_user_id), responsible: employeeName(projectLead.responsible_user_id), startDate: new Date().toISOString().slice(0, 10),
  } as Project) : null;

  return <div className="space-y-6 overflow-x-hidden">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold">Comercial</h1><p className="text-muted-foreground">Pipeline, histórico, propostas, follow-ups e conversões.</p></div><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Atualizar CRM" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>{canWrite && <Button onClick={() => { setEditing(null); setLeadDialog(true); }}><Plus className="mr-2 h-4 w-4" />Nova oportunidade</Button>}</div></header>
    {!canWrite && <Card><CardContent className="py-3 text-sm text-muted-foreground">Você possui acesso de consulta. Gestores do workspace podem alterar o pipeline.</CardContent></Card>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6"><Metric icon={Target} label="Abertas" value={String(metrics.openCount)} /><Metric icon={CircleDollarSign} label="Pipeline" value={money.format(metrics.pipelineValue)} /><Metric icon={CalendarClock} label="Propostas abertas" value={String(metrics.openProposals)} /><Metric icon={Trophy} label="Ganhos" value={String(metrics.won)} /><Metric icon={XCircle} label="Perdidos" value={String(metrics.lost)} /><Metric icon={Target} label="Conversão" value={`${metrics.conversionRate}%`} /></div>
    <Card><CardHeader><CardTitle className="text-base">Pipeline comercial</CardTitle></CardHeader><CardContent className="p-0 sm:px-4 sm:pb-4"><div className="flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:px-0" aria-label="Kanban comercial">{commercialStages.map((stage) => {
      const leads = data.leads.filter((lead) => lead.stage === stage);
      return <section key={stage} className="w-[84vw] max-w-[310px] shrink-0 snap-start rounded-xl bg-muted/45 p-3" aria-labelledby={`stage-${stage}`}><div className="mb-3 flex items-center justify-between"><h2 id={`stage-${stage}`} className="text-sm font-semibold">{commercialStageLabels[stage]}</h2><Badge variant="secondary">{leads.length}</Badge></div><div className="space-y-3">{leads.map((lead) => <Card key={lead.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setSelected(lead); setDetailsDialog(true); }}><CardContent className="space-y-3 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{lead.company || lead.name}</p><p className="truncate text-xs text-muted-foreground">{lead.name}</p></div>{canWrite && <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Editar ${lead.company}`} onClick={(event) => { event.stopPropagation(); setEditing(lead); setLeadDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>}</div><div className="flex items-center justify-between text-xs"><span>{money.format(Number(lead.value || 0))}</span><span>{lead.probability}%</span></div><p className="text-xs text-muted-foreground">{employeeName(lead.responsible_user_id)}</p>{lead.next_action && <div className="rounded-md bg-background p-2 text-xs"><p className="line-clamp-2">{lead.next_action}</p>{lead.next_action_date && <p className="mt-1 text-muted-foreground">{date.format(new Date(`${lead.next_action_date}T12:00:00`))}</p>}</div>}{canWrite && <select className="w-full rounded-md border bg-background px-2 py-1.5 text-xs" aria-label={`Mover ${lead.company} para etapa`} value={stage} onClick={(event) => event.stopPropagation()} onChange={(event) => void moveLead(lead, event.target.value as CommercialStage)}>{commercialStages.map((option) => <option key={option} value={option}>{commercialStageLabels[option]}</option>)}</select>}</CardContent></Card>)}{!leads.length && <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhuma oportunidade</div>}</div></section>;
    })}</div></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Próximos contatos</CardTitle></CardHeader><CardContent className="space-y-2">{openFollowUps.length ? openFollowUps.map((item) => { const lead = data.leads.find((candidate) => candidate.id === item.lead_id); return <button key={item.id} className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50" onClick={() => { if (lead) { setSelected(lead); setDetailsDialog(true); } }}><div className="min-w-0"><p className="truncate text-sm font-medium">{item.action}</p><p className="truncate text-xs text-muted-foreground">{lead?.company} · {employeeName(item.responsible_user_id)}</p></div><Badge variant={new Date(item.due_at) < new Date() ? "destructive" : "outline"}>{date.format(new Date(item.due_at))}</Badge></button>; }) : <p className="text-sm text-muted-foreground">Nenhum follow-up pendente.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Origem dos leads</CardTitle></CardHeader><CardContent className="space-y-2">{metrics.sources.slice(0, 6).map(([source, count]) => <div key={source} className="flex items-center justify-between text-sm"><span>{source}</span><Badge variant="secondary">{count}</Badge></div>)}{!metrics.sources.length && <p className="text-sm text-muted-foreground">Sem dados de origem.</p>}</CardContent></Card></div>
    {user && activeMembership && <CommercialLeadDialog open={leadDialog} onOpenChange={setLeadDialog} lead={editing} workspaceId={activeMembership.workspaceId} userId={user.id} employees={employees} onSaved={load} />}
    {user && <CommercialDetailsDialog open={detailsDialog} onOpenChange={setDetailsDialog} lead={selected} activities={data.activities} proposals={data.proposals} followUps={data.followUps} employees={employees} userId={user.id} canWrite={canWrite} onReload={load} onCreateProject={(lead, clientId) => { setDetailsDialog(false); setProjectLead({ ...lead, converted_client_id: clientId }); }} />}
    <ProjectDialog open={Boolean(projectLead)} onOpenChange={(open) => { if (!open) setProjectLead(null); }} project={projectDraft} onSuccess={async (project) => { if (!projectLead) return; await updateCommercialLead(projectLead.id, { converted_project_id: project.id }); toast.success("Projeto vinculado à oportunidade."); setProjectLead(null); await load(); }} />
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) { return <Card><CardContent className="p-3"><Icon className="mb-2 h-4 w-4 text-primary" /><p className="truncate text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>; }
