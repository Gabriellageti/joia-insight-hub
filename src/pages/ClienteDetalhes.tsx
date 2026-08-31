import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BriefcaseBusiness, CalendarClock, CheckCircle2, Clock3, Edit, FileText, FolderKanban, ListTodo, Route, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { ScopedTasksPanel } from "@/components/plano-acao";
import { useData } from "@/contexts/DataContext";
import { parseTaskDate } from "@/lib/tasks/dates";
import { TASK_PRIORITY_ORDER, TASK_STATUS_LABELS } from "@/lib/tasks/constants";
import { ActivityFeed } from "@/components/meetings";
import { FavoriteButton } from "@/components/operations/FavoriteButton";
import { DocumentsWorkspace } from "@/components/documents";

const metricCards = [
  { key: "open", label: "Tarefas abertas", icon: ListTodo },
  { key: "progress", label: "Em andamento", icon: Clock3 },
  { key: "overdue", label: "Atrasadas", icon: AlertTriangle },
  { key: "done", label: "Concluídas", icon: CheckCircle2 },
  { key: "projects", label: "Projetos ativos", icon: BriefcaseBusiness },
] as const;

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, projects, tasks, meetings, deleteClient } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const client = useMemo(() => clients.find((item) => item.id === id), [clients, id]);
  const clientProjects = useMemo(() => projects.filter((project) => project.clientId === id), [projects, id]);
  const clientTasks = useMemo(() => tasks.filter((task) => task.clientId === id), [tasks, id]);
  const clientMeetings = useMemo(() => meetings.filter((meeting) => meeting.clientId === id), [meetings, id]);

  const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
  const openTasks = useMemo(() => clientTasks.filter((task) => task.status !== "done"), [clientTasks]);
  const overdueTasks = useMemo(() => openTasks.filter((task) => { const due = parseTaskDate(task.dueDate); return Boolean(due && due < today); }), [openTasks, today]);
  const nextTasks = useMemo(() => [...openTasks].filter((task) => parseTaskDate(task.dueDate)).sort((left, right) => (parseTaskDate(left.dueDate)?.getTime() || Infinity) - (parseTaskDate(right.dueDate)?.getTime() || Infinity)).slice(0, 5), [openTasks]);
  const attentionTasks = useMemo(() => [...openTasks].filter((task) => task.status === "blocked" || task.priority === "urgent" || overdueTasks.some((item) => item.id === task.id)).sort((left, right) => TASK_PRIORITY_ORDER[left.priority] - TASK_PRIORITY_ORDER[right.priority]).slice(0, 5), [openTasks, overdueTasks]);
  const responsibles = useMemo(() => [...new Set(clientTasks.map((task) => task.responsible).filter(Boolean))], [clientTasks]);

  if (!client) return <div className="space-y-4"><Alert><AlertTitle>Cliente não encontrado</AlertTitle><AlertDescription>Não foi possível localizar os dados deste cliente.</AlertDescription></Alert><Button asChild variant="outline"><Link to="/clientes"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Clientes</Link></Button></div>;

  const displayName = client.nomeFantasia || client.razaoSocial || client.name || "Cliente";
  const metrics = {
    open: openTasks.length,
    progress: clientTasks.filter((task) => task.status === "in_progress").length,
    overdue: overdueTasks.length,
    done: clientTasks.filter((task) => task.status === "done").length,
    projects: clientProjects.length,
  };
  const nextDue = nextTasks[0] ? parseTaskDate(nextTasks[0].dueDate)?.toLocaleDateString("pt-BR") : "Sem prazo";

  const handleDelete = async () => {
    if (!window.confirm(`Deseja realmente excluir ${displayName}?`)) return;
    try { await deleteClient(client.id); toast.success("Cliente excluído com sucesso."); navigate("/clientes"); }
    catch { toast.error("Não foi possível excluir o cliente."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-start gap-3"><Button asChild variant="ghost" className="shrink-0 px-2"><Link to="/clientes"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link></Button><div className="min-w-0 flex-1 break-words"><p className="text-sm text-muted-foreground">Central do cliente</p><h1 className="text-2xl font-semibold">{displayName}</h1></div><Badge variant={client.status === "ativo" ? "default" : "secondary"}>{client.status === "ativo" ? "Ativo" : "Inativo"}</Badge></div>
        <div className="flex flex-wrap gap-2"><FavoriteButton entityType="client" entityId={client.id} /><Button variant="outline" onClick={() => navigate(`/assistente?clientId=${client.id}&auto=1&prompt=${encodeURIComponent(`Resuma o cliente ${displayName}: situação atual, projetos, atividades, últimas reuniões, pendências, riscos e próximos passos.`)}`)}><Sparkles className="mr-2 h-4 w-4" />Resumir com IA</Button><Button variant="outline" onClick={() => navigate(`/relatorios/consultoria?clientId=${client.id}`)}><FileText className="mr-2 h-4 w-4" />Gerar relatório</Button><Button variant="outline" onClick={() => navigate(`/clientes/${id}/jornada`)}><Route className="mr-2 h-4 w-4" />Jornada</Button><Button variant="outline" onClick={() => setDialogOpen(true)}><Edit className="mr-2 h-4 w-4" />Editar</Button><Button variant="ghost" className="text-destructive" onClick={() => void handleDelete()}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button></div>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Visão Geral</TabsTrigger><TabsTrigger value="projects">Projetos</TabsTrigger><TabsTrigger value="tasks">Tarefas</TabsTrigger><TabsTrigger value="kanban">Kanban</TabsTrigger><TabsTrigger value="meetings">Reuniões</TabsTrigger><TabsTrigger value="documents">Documentos</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {metricCards.map(({ key, label, icon: Icon }) => <Card key={key}><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className={`h-4 w-4 ${key === "overdue" && metrics[key] ? "text-destructive" : "text-muted-foreground"}`} /></div><p className="mt-2 text-2xl font-semibold">{metrics[key]}</p></CardContent></Card>)}
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Próximo prazo</p><CalendarClock className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-lg font-semibold">{nextDue}</p></CardContent></Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Próximas atividades</CardTitle></CardHeader><CardContent className="space-y-3">{nextTasks.length ? nextTasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border p-3"><div className="min-w-0"><p className="truncate font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{task.projectName || "Atividade do cliente"} · {task.responsible || "Sem responsável"}</p></div><span className="shrink-0 text-sm">{parseTaskDate(task.dueDate)?.toLocaleDateString("pt-BR")}</span></div>) : <p className="text-sm text-muted-foreground">Nenhuma atividade com prazo definido.</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Tarefas que precisam de atenção</CardTitle></CardHeader><CardContent className="space-y-3">{attentionTasks.length ? attentionTasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 p-3"><div className="min-w-0"><p className="truncate font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{task.responsible || "Sem responsável"}</p></div><Badge variant={overdueTasks.some((item) => item.id === task.id) ? "destructive" : "secondary"}>{overdueTasks.some((item) => item.id === task.id) ? "Atrasada" : TASK_STATUS_LABELS[task.status]}</Badge></div>) : <p className="text-sm text-muted-foreground">Nenhuma tarefa exige atenção imediata.</p>}</CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Responsáveis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{responsibles.length ? responsibles.join(", ") : "Nenhum responsável associado às tarefas."}</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="projects"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clientProjects.length ? clientProjects.map((project) => <Card key={project.id}><CardHeader><CardTitle className="text-base"><Link className="hover:text-primary" to={`/projetos/${project.id}`}>{project.name}</Link></CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Fase: {project.phase}</p><p className="text-muted-foreground">Responsável: {project.responsible || project.responsibleNameLegacy || "Não definido"}</p><p className="text-muted-foreground">Progresso: {Math.round(project.progress)}%</p></CardContent></Card>) : <Card><CardContent className="py-10 text-sm text-muted-foreground">Nenhum projeto relacionado.</CardContent></Card>}</div></TabsContent>
        <TabsContent value="tasks"><ScopedTasksPanel tasks={clientTasks} mode="list" defaultClientId={client.id} /></TabsContent>
        <TabsContent value="kanban"><ScopedTasksPanel tasks={clientTasks} mode="kanban" defaultClientId={client.id} /></TabsContent>
        <TabsContent value="meetings"><div className="grid gap-3 md:grid-cols-2">{clientMeetings.length ? clientMeetings.map((meeting) => <Link key={meeting.id} to={`/reunioes/${meeting.id}`}><Card className="h-full transition-colors hover:bg-muted/40"><CardContent className="p-4"><p className="font-medium">{meeting.title}</p><p className="mt-1 text-sm text-muted-foreground">{meeting.date} {meeting.time} · {meeting.projectName || displayName}</p><Badge className="mt-3" variant="outline">{meeting.status === "completed" ? "Concluída" : meeting.status === "cancelled" ? "Cancelada" : meeting.status === "in_progress" ? "Em andamento" : "Agendada"}</Badge></CardContent></Card></Link>) : <Card><CardContent className="py-10 text-sm text-muted-foreground">Nenhuma reunião relacionada.</CardContent></Card>}</div></TabsContent>
        <TabsContent value="documents"><DocumentsWorkspace clientId={client.id} compact /></TabsContent>
        <TabsContent value="history"><ActivityFeed clientId={client.id} /></TabsContent>
      </Tabs>

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} client={client} />
    </div>
  );
}
