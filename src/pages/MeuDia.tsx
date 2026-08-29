import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, FolderKanban, Focus, ListChecks, Pause, Plus, ShieldAlert, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { DayNotesDialog } from "@/components/my-day/DayNotesDialog";
import { MyDayTaskItem } from "@/components/my-day/MyDayTaskItem";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useMyDay } from "@/hooks/useMyDay";
import { filterMyTasks, getClientsNeedingAttention, getMyDayBuckets, getProjectsNeedingAttention, sortDailyPriorities, type MyTaskFilter } from "@/lib/my-day";
import type { Task } from "@/types";
import { toast } from "sonner";

type SummaryFilter = Exclude<MyTaskFilter, "upcoming" | "completed"> | "completed_today";

const activityLabel: Record<string, string> = { created: "adicionou", status_changed: "atualizou", completed: "concluiu", reopened: "reabriu" };

export default function MeuDia() {
  const { user } = useAuth();
  const { tasks, tasksLoading, tasksError, clients, projects, meetings, savingTaskIds, updateTask } = useData();
  const navigate = useNavigate();
  const myTasks = useMemo(() => tasks.filter((task) => task.assignedTo === user?.id), [tasks, user?.id]);
  const myDay = useMyDay(myTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SummaryFilter | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const now = useMemo(() => new Date(), []);
  const buckets = useMemo(() => getMyDayBuckets(tasks, user?.id, now), [now, tasks, user?.id]);
  const priorities = useMemo(() => sortDailyPriorities(buckets.pending, now).slice(0, 8), [buckets.pending, now]);
  const focusTasks = useMemo(() => myDay.focusTaskIds.map((id) => tasks.find((task) => task.id === id)).filter((task): task is Task => Boolean(task && task.status !== "done")), [myDay.focusTaskIds, tasks]);
  const attentionClients = useMemo(() => getClientsNeedingAttention(buckets.pending, clients), [buckets.pending, clients]);
  const attentionProjects = useMemo(() => getProjectsNeedingAttention(buckets.pending, projects, now), [buckets.pending, now, projects]);
  const selectedTasks = useMemo(() => {
    if (!selectedFilter) return [];
    if (selectedFilter === "completed_today") return buckets.completedToday;
    return filterMyTasks(tasks, selectedFilter, user?.id, now);
  }, [buckets.completedToday, now, selectedFilter, tasks, user?.id]);
  const dayTotal = buckets.today.length + buckets.completedToday.length;
  const progress = dayTotal ? Math.round((buckets.completedToday.length / dayTotal) * 100) : 0;
  const firstName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "pessoa").trim().split(/\s+/)[0];
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const dailyMeetings = useMemo(() => meetings.map((meeting) => {
    const [day, month, year] = meeting.date.split("/").map(Number);
    const [hours, minutes] = meeting.time.split(":").map(Number);
    return { meeting, value: new Date(year, month - 1, day, hours || 0, minutes || 0) };
  }).filter(({ meeting, value }) => !Number.isNaN(value.getTime()) && (meeting.responsibleUserId === user?.id || !meeting.responsibleUserId) && meeting.status !== "cancelled"), [meetings, user?.id]);
  const meetingBuckets = useMemo(() => {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const upcomingEnd = new Date(start); upcomingEnd.setDate(upcomingEnd.getDate() + 8);
    return {
      today: dailyMeetings.filter(({ value }) => value >= start && value < end),
      upcoming: dailyMeetings.filter(({ meeting, value }) => meeting.status === "scheduled" && value >= end && value < upcomingEnd),
      pending: dailyMeetings.filter(({ meeting, value }) => meeting.status === "in_progress" || (meeting.status === "scheduled" && value < start)),
    };
  }, [dailyMeetings, now]);

  const setStatus = async (task: Task, status: Task["status"]) => {
    try {
      await updateTask(task.id, { status });
      if (status === "done" && myDay.focusTaskIds.includes(task.id)) await myDay.toggleFocus(task.id);
      toast.success(status === "done" ? "Tarefa concluída." : "Status atualizado.", { description: task.title });
    } catch { /* DataContext restores and reports persistence failures. */ }
  };
  const toggleFocus = async (task: Task) => {
    try { await myDay.toggleFocus(task.id); toast.success(myDay.focusTaskIds.includes(task.id) ? "Tarefa removida do foco." : "Tarefa adicionada ao foco."); }
    catch (error) { toast.error((error as Error).message); }
  };
  const openTask = (task: Task) => { setEditingTask(task); setTaskOpen(true); };
  const taskItem = (task: Task, options: { quick?: boolean; focus?: boolean; index?: number } = {}) => <MyDayTaskItem key={task.id} task={task} saving={savingTaskIds.includes(task.id)} quickActions={options.quick} focused={options.focus || myDay.focusTaskIds.includes(task.id)} canMoveUp={options.index !== undefined && options.index > 0} canMoveDown={options.index !== undefined && options.index < focusTasks.length - 1} onOpen={() => openTask(task)} onStatus={(status) => void setStatus(task, status)} onToggleFocus={() => void toggleFocus(task)} onMoveFocus={options.index === undefined ? undefined : (direction) => void myDay.moveFocus(task.id, direction).catch((error) => toast.error(error.message))} />;

  if (tasksLoading || myDay.loading) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-24" />)}</div><Skeleton className="h-72 w-full" /></div>;

  const summaryCards: { id: SummaryFilter; label: string; value: number; icon: typeof CalendarDays; tone: string }[] = [
    { id: "today", label: "Hoje", value: buckets.today.length, icon: CalendarDays, tone: "text-blue-600" },
    { id: "overdue", label: "Atrasadas", value: buckets.overdue.length, icon: AlertTriangle, tone: "text-red-600" },
    { id: "in_progress", label: "Em andamento", value: buckets.inProgress.length, icon: Clock3, tone: "text-amber-600" },
    { id: "waiting", label: "Aguardando", value: buckets.waiting.length, icon: Pause, tone: "text-slate-600" },
    { id: "completed_today", label: "Concluídas hoje", value: buckets.completedToday.length, icon: CheckCircle2, tone: "text-emerald-600" },
  ];

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-sm capitalize text-muted-foreground">{dateLabel}</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{greeting}, {firstName}.</h1><p className="mt-1 text-muted-foreground">Você tem <strong className="text-foreground">{buckets.today.length} {buckets.today.length === 1 ? "tarefa" : "tarefas"}</strong> para hoje e <strong className="text-foreground">{buckets.overdue.length} atrasadas</strong>.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setStartOpen(true)} disabled={Boolean(myDay.checkin?.started_at)}>{myDay.checkin?.started_at ? "Dia iniciado" : "Começar meu dia"}</Button><Button onClick={() => setEndOpen(true)}>Encerrar meu dia</Button></div>
    </header>
    {(tasksError || myDay.error) ? <Alert variant="destructive"><AlertDescription>{tasksError || myDay.error}</AlertDescription></Alert> : null}

    <section aria-label="Resumo do dia" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {summaryCards.map((item) => <button key={item.id} type="button" aria-pressed={selectedFilter === item.id} onClick={() => setSelectedFilter((current) => current === item.id ? null : item.id)} className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className={selectedFilter === item.id ? "border-primary shadow-sm" : "h-full transition-colors hover:border-primary/40"}><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{item.label}</p><item.icon className={`h-4 w-4 ${item.tone}`} /></div><p className="mt-2 text-2xl font-semibold">{item.value}</p></CardContent></Card></button>)}
    </section>

    {selectedFilter ? <section aria-labelledby="quick-filter-title" className="space-y-3"><div className="flex items-center justify-between"><h2 id="quick-filter-title" className="text-lg font-semibold">{summaryCards.find((item) => item.id === selectedFilter)?.label}</h2><Button size="sm" variant="ghost" onClick={() => setSelectedFilter(null)}>Limpar filtro</Button></div>{selectedTasks.length ? selectedTasks.map((task) => taskItem(task)) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma tarefa nesta visão.</CardContent></Card>}</section> : null}

    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">Progresso do dia</p><p className="text-sm text-muted-foreground">{buckets.completedToday.length} de {dayTotal} tarefas concluídas</p></div><span className="text-xl font-semibold">{progress}%</span></div><Progress value={progress} className="mt-3 h-2" /></CardContent></Card>

    <section aria-labelledby="quick-actions-title"><div className="mb-3 flex items-center gap-2"><Plus className="h-5 w-5" /><h2 id="quick-actions-title" className="text-lg font-semibold">Ações rápidas</h2></div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><Button variant="outline" onClick={() => { setEditingTask(null); setTaskOpen(true); }}>Nova tarefa</Button><Button variant="outline" onClick={() => setProjectOpen(true)}>Novo projeto</Button><Button variant="outline" onClick={() => setClientOpen(true)}>Novo cliente</Button><Button variant="outline" onClick={() => setMeetingOpen(true)}>Nova reunião</Button></div></section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
      <div className="space-y-6">
        <section aria-labelledby="meetings-today-title" className="space-y-3"><div className="flex items-center justify-between"><h2 id="meetings-today-title" className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="h-5 w-5 text-violet-600" />Reuniões do dia</h2><Button size="sm" variant="ghost" onClick={() => navigate("/reunioes")}>Ver agenda</Button></div>{meetingBuckets.pending.length ? <Alert variant="destructive"><AlertDescription>{meetingBuckets.pending.length} reunião(ões) pendente(s) de tratamento.</AlertDescription></Alert> : null}<div className="grid gap-3 sm:grid-cols-2">{[...meetingBuckets.today, ...meetingBuckets.upcoming.slice(0, 2)].map(({ meeting }) => <button key={meeting.id} type="button" className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate(`/reunioes/${meeting.id}`)}><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{meeting.title}</p><p className="mt-1 text-sm text-muted-foreground">{meeting.date} às {meeting.time}</p><p className="text-xs text-muted-foreground">{meeting.projectName || meeting.clientName || "Reunião interna"}</p></div><Badge variant={meeting.status === "in_progress" ? "default" : "secondary"}>{meeting.status === "in_progress" ? "Em andamento" : "Agendada"}</Badge></div></CardContent></Card></button>)}{meetingBuckets.today.length + meetingBuckets.upcoming.length === 0 ? <Card className="sm:col-span-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma reunião hoje ou nos próximos dias.</CardContent></Card> : null}</div></section>

        <section aria-labelledby="focus-title" className="space-y-3"><div className="flex items-center justify-between"><div><h2 id="focus-title" className="flex items-center gap-2 text-lg font-semibold"><Focus className="h-5 w-5 text-primary" />Foco de hoje</h2><p className="text-sm text-muted-foreground">Escolha e ordene de 3 a 5 tarefas importantes.</p></div><Badge variant="secondary">{focusTasks.length}/5</Badge></div>{focusTasks.length ? focusTasks.map((task, index) => taskItem(task, { focus: true, index })) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Marque tarefas como foco nas seções abaixo.</CardContent></Card>}</section>

        <section aria-labelledby="priorities-title" className="space-y-3"><h2 id="priorities-title" className="flex items-center gap-2 text-lg font-semibold"><ListChecks className="h-5 w-5" />Minhas prioridades</h2>{priorities.length ? priorities.map((task) => taskItem(task)) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Você não possui tarefas pendentes.</CardContent></Card>}</section>

        <section aria-labelledby="today-title" className="space-y-3"><h2 id="today-title" className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="h-5 w-5 text-blue-600" />Hoje <Badge variant="secondary">{buckets.today.length}</Badge></h2>{buckets.today.length ? buckets.today.map((task) => taskItem(task, { quick: true })) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma tarefa pendente com prazo para hoje.</CardContent></Card>}</section>

        {buckets.overdue.length ? <section aria-labelledby="overdue-title" className="space-y-3"><h2 id="overdue-title" className="flex items-center gap-2 text-lg font-semibold text-destructive"><AlertTriangle className="h-5 w-5" />Atrasadas <Badge variant="destructive">{buckets.overdue.length}</Badge></h2>{buckets.overdue.map((task) => taskItem(task))}</section> : null}

        <section aria-labelledby="upcoming-title" className="space-y-3"><div className="flex items-center justify-between"><h2 id="upcoming-title" className="flex items-center gap-2 text-lg font-semibold"><Clock3 className="h-5 w-5" />Próximos dias</h2>{buckets.upcoming.length > 4 ? <Button size="sm" variant="ghost" onClick={() => setShowAllUpcoming((value) => !value)}>{showAllUpcoming ? "Mostrar menos" : `Ver todas (${buckets.upcoming.length})`}</Button> : null}</div>{buckets.upcoming.length ? buckets.upcoming.slice(0, showAllUpcoming ? undefined : 4).map((task) => taskItem(task)) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum prazo nos próximos 7 dias.</CardContent></Card>}</section>
      </div>

      <aside className="space-y-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" />Clientes que precisam de atenção</CardTitle></CardHeader><CardContent className="space-y-2">{attentionClients.length ? attentionClients.map((item) => <button type="button" key={item.id} className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate(`/clientes/${item.id}`)}><div className="min-w-0"><p className="truncate font-medium">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.reasons.join(" · ")}</p></div><ArrowRight className="h-4 w-4 shrink-0" /></button>) : <p className="text-sm text-muted-foreground">Nenhum cliente em atenção pelas suas tarefas.</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FolderKanban className="h-5 w-5" />Projetos em atenção</CardTitle></CardHeader><CardContent className="space-y-2">{attentionProjects.length ? attentionProjects.map((item) => <button type="button" key={item.id} className="w-full rounded-md border p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate(`/projetos/${item.id}`)}><div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{item.name}</p><span className="text-xs font-medium">{item.progress}%</span></div><p className="truncate text-xs text-muted-foreground">{item.clientName}</p><p className="mt-1 text-xs text-muted-foreground">{item.reasons.join(" · ")}</p></button>) : <p className="text-sm text-muted-foreground">Nenhum projeto em atenção pelas suas tarefas.</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Atividade recente</CardTitle></CardHeader><CardContent>{myDay.activity.length ? <ol className="space-y-4">{myDay.activity.map((entry) => <li key={entry.id} className="border-l-2 border-border pl-3"><p className="text-sm"><time className="font-medium">{new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time> — {entry.userId === user?.id ? "Você" : entry.userName} {activityLabel[entry.action] || "alterou"} <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => { const task = tasks.find((item) => item.id === entry.taskId); if (task) openTask(task); }}>{entry.taskTitle}</button>.</p></li>)}</ol> : <p className="text-sm text-muted-foreground">Nenhuma atividade recente nas suas tarefas.</p>}</CardContent></Card>
      </aside>
    </div>

    <TaskDialog open={taskOpen} onOpenChange={(open) => { setTaskOpen(open); if (!open) setEditingTask(null); }} task={editingTask} />
    <ProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
    <ClientDialog open={clientOpen} onOpenChange={setClientOpen} />
    <MeetingDialog open={meetingOpen} onOpenChange={setMeetingOpen} />
    <DayNotesDialog open={startOpen} mode="start" initialNotes={myDay.checkin?.start_notes} onOpenChange={setStartOpen} onSave={async (notes) => { await myDay.saveStart(notes); toast.success("Seu dia foi iniciado."); }} />
    <DayNotesDialog open={endOpen} mode="end" initialNotes={myDay.checkin?.end_notes} summary={`Concluídas hoje: ${buckets.completedToday.length} · Pendentes de hoje: ${buckets.today.length} · Atrasadas: ${buckets.overdue.length} · Em andamento: ${buckets.inProgress.length}`} onOpenChange={setEndOpen} onSave={async (notes) => { await myDay.saveEnd(notes); toast.success("Resumo do dia salvo."); }} />
  </div>;
}
