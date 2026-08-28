import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, FilterX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { HealthBadge } from "@/components/operations/HealthBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useOperationsDashboard, useTeamOperations } from "@/hooks/useOperations";
import { hasWorkspaceRole } from "@/lib/authorization";
import { parseTaskDate } from "@/lib/tasks/dates";
import type { OperationalHealth } from "@/types/operations";
import type { Task } from "@/types";
import { toast } from "sonner";

type PendingType = "all" | "task" | "project" | "client" | "meeting";
type PendingItem = {
  id: string; type: Exclude<PendingType, "all">; title: string; reason: string; date: Date | null;
  clientId?: string | null; projectId?: string | null; responsibleId?: string | null; health?: OperationalHealth; score?: number; task?: Task;
  priority?: Task["priority"];
};

export default function Pendencias() {
  const { user, activeMembership } = useAuth();
  const { clients, tasks, meetings, updateTask } = useData();
  const [params, setParams] = useSearchParams();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const type = (params.get("type") as PendingType | null) ?? "all";
  const criticality = params.get("criticality") ?? "all";
  const priority = params.get("priority") ?? "all";
  const period = params.get("period") ?? "all";
  const clientId = params.get("clientId") ?? "all";
  const responsibleId = params.get("responsibleId") ?? "all";
  const manager = hasWorkspaceRole(activeMembership?.role, "manager");
  const dashboard = useOperationsDashboard();
  const team = useTeamOperations();
  const scopeTasks = manager ? tasks : tasks.filter((task) => task.assignedTo === user?.id);
  const scopeMeetings = manager ? meetings : meetings.filter((meeting) => meeting.responsibleUserId === user?.id);

  const items = useMemo<PendingItem[]>(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const taskItems: PendingItem[] = scopeTasks.flatMap((task) => {
      const due = parseTaskDate(task.dueDate);
      if (task.status === "done") return [];
      const reason = task.status === "blocked" ? "Tarefa bloqueada" : due && due < today ? "Tarefa atrasada" : task.priority === "urgent" ? "Tarefa urgente" : null;
      return reason ? [{ id: task.id, type: "task", title: task.title, reason, date: due, clientId: task.clientId, projectId: task.projectId, responsibleId: task.assignedTo, priority: task.priority, task }] : [];
    });
    const projectItems: PendingItem[] = (dashboard.data?.projects ?? []).filter((project) => project.health !== "healthy" && project.health !== "completed").map((project) => ({
      id: project.project_id, type: "project", title: project.project_name, reason: project.risk_reasons[0] || "Projeto requer atenção", date: project.end_date ? new Date(`${project.end_date}T12:00:00`) : null, clientId: project.client_id, projectId: project.project_id, health: project.health, score: project.risk_score,
    }));
    const clientItems: PendingItem[] = (dashboard.data?.clients ?? []).filter((client) => client.health !== "healthy").map((client) => ({
      id: client.client_id, type: "client", title: client.client_name, reason: client.risk_reasons[0] || "Cliente requer acompanhamento", date: new Date(client.last_activity_at), clientId: client.client_id, health: client.health, score: client.risk_score,
    }));
    const meetingItems: PendingItem[] = scopeMeetings.flatMap((meeting) => {
      const date = meeting.date ? parseTaskDate(meeting.date) : null;
      const pending = meeting.status === "scheduled" && Boolean(date && date < today);
      return pending ? [{ id: meeting.id, type: "meeting", title: meeting.title, reason: "Reunião pendente", date, clientId: meeting.clientId, projectId: meeting.projectId, responsibleId: meeting.responsibleUserId }] : [];
    });
    return [...taskItems, ...projectItems, ...clientItems, ...meetingItems];
  }, [dashboard.data?.clients, dashboard.data?.projects, scopeMeetings, scopeTasks]);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const limit = period === "all" || period === "overdue" ? null : new Date(today.getTime() + Number(period) * 86_400_000);
    return items.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (clientId !== "all" && item.clientId !== clientId) return false;
      if (responsibleId !== "all" && item.responsibleId !== responsibleId) return false;
      if (priority !== "all" && item.priority !== priority) return false;
      if (criticality === "blocked" && item.reason !== "Tarefa bloqueada") return false;
      if (criticality === "attention" && !["attention","risk","critical"].includes(item.health ?? "")) return false;
      if (criticality === "risk" && !["risk","critical"].includes(item.health ?? "")) return false;
      if (period === "overdue" && (!item.date || item.date >= today)) return false;
      if (limit && (!item.date || item.date < today || item.date > limit)) return false;
      return true;
    }).sort((a,b) => (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER));
  }, [clientId, criticality, items, period, priority, responsibleId, type]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key); else next.set(key, value);
    setParams(next);
  };
  const completeTask = async (task: Task) => {
    try { await updateTask(task.id, { status: "done", completedAt: new Date().toISOString(), completedBy: user?.id }); toast.success("Pendência resolvida."); }
    catch { /* DataContext reports persistence failures. */ }
  };

  return (
    <div className="space-y-6">
      <header><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">Pendências</h1><Badge variant="secondary">{manager ? "Empresa" : "Minhas pendências"}</Badge></div><p className="text-muted-foreground">Tarefas, projetos, clientes e reuniões que precisam de ação.</p></header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Select value={type} onValueChange={(value) => setFilter("type", value)}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="task">Tarefas</SelectItem><SelectItem value="project">Projetos</SelectItem><SelectItem value="client">Clientes</SelectItem><SelectItem value="meeting">Reuniões</SelectItem></SelectContent></Select>
        <Select value={clientId} onValueChange={(value) => setFilter("clientId", value)}><SelectTrigger aria-label="Cliente"><SelectValue placeholder="Cliente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial || client.name}</SelectItem>)}</SelectContent></Select>
        <Select value={responsibleId} onValueChange={(value) => setFilter("responsibleId", value)} disabled={!team.data}><SelectTrigger aria-label="Responsável"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{team.data?.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.member_name}</SelectItem>)}</SelectContent></Select>
        <Select value={period} onValueChange={(value) => setFilter("period", value)}><SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Qualquer prazo</SelectItem><SelectItem value="overdue">Atrasados</SelectItem><SelectItem value="3">Próximos 3 dias</SelectItem><SelectItem value="7">Próximos 7 dias</SelectItem><SelectItem value="30">Próximos 30 dias</SelectItem></SelectContent></Select>
        <Select value={criticality} onValueChange={(value) => setFilter("criticality", value)}><SelectTrigger aria-label="Criticidade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toda criticidade</SelectItem><SelectItem value="attention">Atenção ou pior</SelectItem><SelectItem value="risk">Risco ou crítico</SelectItem><SelectItem value="blocked">Bloqueados</SelectItem></SelectContent></Select>
        <Select value={priority} onValueChange={(value) => setFilter("priority", value)}><SelectTrigger aria-label="Prioridade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toda prioridade</SelectItem><SelectItem value="urgent">Urgente</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="low">Baixa</SelectItem></SelectContent></Select>
      </div>
      {params.size > 0 ? <Button variant="ghost" size="sm" onClick={() => setParams({})}><FilterX className="mr-2 h-4 w-4" />Limpar filtros</Button> : null}
      <div className="space-y-3">{filtered.length === 0 ? <Card><CardContent className="py-12 text-center"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" /><p className="font-medium">Nenhuma pendência encontrada</p><p className="text-sm text-muted-foreground">O escopo está em dia ou os filtros podem ser ampliados.</p></CardContent></Card> : filtered.map((item) => <Card key={`${item.type}-${item.id}`}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{item.type === "task" ? "Tarefa" : item.type === "project" ? "Projeto" : item.type === "client" ? "Cliente" : "Reunião"}</Badge>{item.health ? <HealthBadge health={item.health} score={item.score} /> : null}</div><p className="mt-2 font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.reason}{item.date ? ` · ${item.date.toLocaleDateString("pt-BR")}` : ""}</p></div><div className="flex shrink-0 gap-2">{item.task ? <><Button size="sm" variant="outline" onClick={() => setEditingTask(item.task!)}>Editar</Button><Button size="sm" onClick={() => void completeTask(item.task!)}><CheckCircle2 className="mr-2 h-4 w-4" />Resolver</Button></> : <Button asChild size="sm" variant="outline"><Link to={item.type === "project" ? `/projetos/${item.id}` : item.type === "client" ? `/clientes/${item.id}` : `/reunioes/${item.id}`}>Abrir<ExternalLink className="ml-2 h-4 w-4" /></Link></Button>}</div></CardContent></Card>)}</div>
      <TaskDialog open={Boolean(editingTask)} onOpenChange={(open) => !open && setEditingTask(null)} task={editingTask} />
    </div>
  );
}
