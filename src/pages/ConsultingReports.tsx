import { useEffect, useMemo, useState } from "react";
import { FilePlus2, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { ConsultingReportRow, generateConsultingReport, listConsultingReports } from "@/lib/consulting-reports";

const monthStart = () => { const value = new Date(); value.setDate(1); return value.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

export default function ConsultingReports() {
  const { clients, projects } = useData(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [reports, setReports] = useState<ConsultingReportRow[]>([]); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(Boolean(params.get("clientId"))); const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState(params.get("clientId") || ""); const [start, setStart] = useState(monthStart()); const [end, setEnd] = useState(today()); const [projectIds, setProjectIds] = useState<string[]>([]);
  const availableProjects = useMemo(() => projects.filter((project) => project.clientId === clientId), [clientId, projects]);
  useEffect(() => { listConsultingReports().then(setReports).catch((error) => toast.error((error as Error).message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { setProjectIds([]); }, [clientId]);
  const generate = async () => { if (!clientId || !start || !end || end < start) { toast.error("Selecione cliente e período válidos."); return; } setSaving(true); try { const id = await generateConsultingReport(clientId, start, end, projectIds); toast.success("Rascunho gerado para revisão."); navigate(`/relatorios/consultoria/${id}`); } catch (error) { toast.error((error as Error).message); setSaving(false); } };
  const clientName = (id: string) => { const client = clients.find((item) => item.id === id); return client?.nomeFantasia || client?.razaoSocial || client?.name || "Cliente"; };
  return <div className="space-y-6"><header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold">Relatórios de Consultoria</h1><p className="text-muted-foreground">Gere rascunhos a partir do histórico operacional e revise antes de finalizar.</p></div><Button onClick={() => setOpen(true)}><FilePlus2 className="mr-2 h-4 w-4" />Gerar relatório</Button></header>
    {loading ? <p className="text-muted-foreground">Carregando histórico…</p> : reports.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum relatório gerado.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reports.map((report) => <button key={report.id} type="button" className="text-left" onClick={() => navigate(`/relatorios/consultoria/${report.id}`)}><Card className="h-full transition-colors hover:border-primary/50"><CardHeader><div className="flex items-start justify-between gap-2"><CardTitle className="text-base">{report.title}</CardTitle><Badge variant={report.status === "finalized" ? "default" : "secondary"}>{report.status === "finalized" ? "Finalizado" : "Rascunho"}</Badge></div></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>{clientName(report.client_id)}</p><p>{new Date(report.period_start + "T12:00:00").toLocaleDateString("pt-BR")} a {new Date(report.period_end + "T12:00:00").toLocaleDateString("pt-BR")}</p><p>Versão {report.version_number}</p></CardContent></Card></button>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Gerar relatório</DialogTitle><DialogDescription>O conteúdo será salvo como rascunho e deverá ser revisado.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Cliente</Label><Select value={clientId} onValueChange={setClientId}><SelectTrigger aria-label="Cliente do relatório"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial || client.name}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="report-start">Início</Label><Input id="report-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></div><div><Label htmlFor="report-end">Fim</Label><Input id="report-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></div></div>{clientId ? <fieldset className="space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">Projetos (vazio inclui todos)</legend>{availableProjects.map((project) => <label key={project.id} className="flex items-center gap-2 text-sm"><Checkbox checked={projectIds.includes(project.id)} onCheckedChange={(checked) => setProjectIds((current) => checked ? [...current, project.id] : current.filter((id) => id !== project.id))} />{project.name}</label>)}</fieldset> : null}</div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => void generate()} disabled={saving}><FileText className="mr-2 h-4 w-4" />{saving ? "Gerando…" : "Gerar rascunho"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
