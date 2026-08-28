import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/contexts/DataContext";
import { listTaskAssignees, type TaskAssignee } from "@/integrations/supabase/tasks";
import type { ProjectDeliverable } from "@/types";
import { toast } from "sonner";

interface Props { projectId: string; deliverables: ProjectDeliverable[] }
const statusLabels = { pending: "Pendente", in_progress: "Em andamento", done: "Concluído" };

export function ProjectDeliverablesList({ projectId, deliverables }: Props) {
  const { addDeliverable, updateDeliverable } = useData();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [responsibleId, setResponsibleId] = useState("none");
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void listTaskAssignees(projectId).then(setAssignees).catch(() => setAssignees([])); }, [projectId]);
  const stats = useMemo(() => {
    const completed = deliverables.filter((item) => item.status === "done").length;
    return { completed, percentage: deliverables.length ? Math.round(completed * 100 / deliverables.length) : 0 };
  }, [deliverables]);
  const createMilestone = async () => {
    if (!title.trim() || !dueDate || responsibleId === "none") { toast.error("Informe título, prazo e responsável do marco."); return; }
    const responsible = assignees.find((item) => item.id === responsibleId);
    setSaving(true);
    try {
      await addDeliverable({ projectId, title: title.trim(), description: description.trim(), dueDate, responsibleUserId: responsibleId, responsibleName: responsible?.full_name || "", itemType: "milestone", status: "pending" });
      setTitle(""); setDescription(""); setDueDate(""); setResponsibleId("none"); setShowForm(false); toast.success("Marco criado.");
    } finally { setSaving(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-base">Entregáveis e marcos</CardTitle><p className="mt-1 text-sm text-muted-foreground">Datas importantes entram também nas próximas entregas da operação.</p></div><div className="flex items-center gap-2">{deliverables.length ? <Badge variant="outline">{stats.completed} de {deliverables.length}</Badge> : null}<Button size="sm" variant="outline" onClick={() => setShowForm((value) => !value)}><CalendarPlus className="mr-2 h-4 w-4" />Novo marco</Button></div></div></CardHeader>
      <CardContent className="space-y-4">
        {showForm ? <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2"><div className="space-y-1 sm:col-span-2"><Label htmlFor="milestone-title">Título *</Label><Input id="milestone-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="space-y-1 sm:col-span-2"><Label htmlFor="milestone-description">Descrição</Label><Textarea id="milestone-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="milestone-date">Prazo *</Label><Input id="milestone-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="milestone-responsible">Responsável *</Label><Select value={responsibleId} onValueChange={setResponsibleId}><SelectTrigger id="milestone-responsible"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{assignees.map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name || "Usuário"}</SelectItem>)}</SelectContent></Select></div><div className="flex gap-2 sm:col-span-2 sm:justify-end"><Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button><Button disabled={saving} onClick={() => void createMilestone()}>{saving ? "Salvando..." : "Criar marco"}</Button></div></div> : null}
        {deliverables.length === 0 ? <div className="py-6 text-center"><Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhum entregável ou marco definido.</p></div> : <><div><div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><span>{stats.percentage}%</span></div><Progress value={stats.percentage} className="h-2" /></div><div className="space-y-2">{deliverables.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3"><Checkbox checked={item.status === "done"} onCheckedChange={(checked) => void updateDeliverable(item.id, { status: checked ? "done" : "pending" })} aria-label={`Marcar ${item.title} como concluído`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={`font-medium ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>{item.title}</p><Badge variant="secondary">{item.itemType === "milestone" ? "Marco" : "Entregável"}</Badge></div>{item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}<p className="mt-1 text-xs text-muted-foreground">{item.dueDate ? `Prazo: ${item.dueDate}` : "Sem prazo"}{item.responsibleName ? ` · ${item.responsibleName}` : ""}</p></div><Badge variant="outline">{statusLabels[item.status]}</Badge></div>)}</div></>}
      </CardContent>
    </Card>
  );
}
