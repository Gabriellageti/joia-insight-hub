
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, CalendarX2, KanbanSquare, List, Plus, User } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { ConsultingDayWorkspace, TaskFilters, TaskKanban, TaskList } from "@/components/plano-acao";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { getCompletionPatch } from "@/lib/tasks/completion";
import { parseTaskDate } from "@/lib/tasks/dates";
import { filterTasks, type TaskFilterValues } from "@/lib/tasks/filters";
import { TASK_STATUS_LABELS } from "@/lib/tasks/constants";
import type { Task } from "@/types";
import { toast } from "sonner";

type TaskView = "kanban" | "list" | "today" | "overdue" | "mine" | "consulting";

const emptyFilters = (clientId = "all", projectId = "all"): TaskFilterValues => ({
  search: "", clientId, projectId, status: "all", priority: "all", assignedTo: "all", taskType: "all", due: "all", mine: false,
});

export default function PlanoAcao() {
  const { tasks, tasksLoading, tasksError, clients, projects, projectsLoading, projectsError, savingTaskIds, updateTask, deleteTask } = useData();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "all";
  const initialClientId = searchParams.get("clientId") || "all";
  const requestedView = searchParams.get("view") as TaskView | null;
  const [view, setView] = useState<TaskView>(requestedView && ["kanban", "list", "today", "overdue", "mine", "consulting"].includes(requestedView) ? requestedView : "kanban");
  const [filters, setFilters] = useState<TaskFilterValues>(() => emptyFilters(initialClientId, initialProjectId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!taskId || editingTask?.id === taskId) return;
    const task = tasks.find((item) => item.id === taskId);
    if (task) { setEditingTask(task); setDialogOpen(true); }
  }, [editingTask?.id, searchParams, tasks]);

  const filteredTasks = useMemo(() => {
    let result = filterTasks(tasks, filters, new Date(), user?.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (view === "mine") result = result.filter((task) => task.assignedTo === user?.id);
    if (view === "today") result = result.filter((task) => parseTaskDate(task.dueDate)?.getTime() === today.getTime());
    if (view === "overdue") result = result.filter((task) => {
      const due = parseTaskDate(task.dueDate);
      return task.status !== "done" && Boolean(due && due < today);
    });
    return result;
  }, [filters, tasks, user?.id, view]);

  const assignees = useMemo(() => {
    const byId = new Map<string, string>();
    tasks.forEach((task) => { if (task.assignedTo) byId.set(task.assignedTo, task.responsible || "Usuário sem nome"); });
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [tasks]);
  const myTaskSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const mine = tasks.filter((task) => task.assignedTo === user?.id && task.status !== "done");
    return {
      today: mine.filter((task) => parseTaskDate(task.dueDate)?.getTime() === today.getTime()).length,
      overdue: mine.filter((task) => { const due = parseTaskDate(task.dueDate); return Boolean(due && due < today); }).length,
      upcoming: mine.filter((task) => { const due = parseTaskDate(task.dueDate); return Boolean(due && due > today && due <= nextWeek); }).length,
      progress: mine.filter((task) => task.status === "in_progress").length,
      waiting: mine.filter((task) => task.status === "waiting").length,
    };
  }, [tasks, user?.id]);

  const handleStatusChange = async (task: Task, status: Task["status"]) => {
    if (status === "blocked") {
      setEditingTask({ ...task, status: "blocked", blockReasonCategory: task.blockReasonCategory || "other" });
      setDialogOpen(true);
      return;
    }
    try { await updateTask(task.id, { status }); toast.success(`Tarefa movida para ${TASK_STATUS_LABELS[status]}.`); }
    catch { /* rollback and feedback are centralized in DataContext */ }
  };

  const handleToggleComplete = async (task: Task) => {
    try { await updateTask(task.id, getCompletionPatch(task, user?.id)); toast.success(task.status === "done" ? "Tarefa reaberta." : "Tarefa concluída.", { description: task.title }); }
    catch { /* rollback and feedback are centralized in DataContext */ }
  };

  const handleDelete = async (task: Task) => {
    try { await deleteTask(task.id); toast.success("Tarefa excluída."); } catch { /* DataContext reports the error */ }
  };

  const handleViewChange = (nextView: TaskView) => {
    setView(nextView);
    const next = new URLSearchParams(searchParams);
    if (nextView === "kanban") next.delete("view"); else next.set("view", nextView);
    setSearchParams(next);
  };

  const handleFiltersChange = (nextFilters: TaskFilterValues) => {
    setFilters(nextFilters);
    const next = new URLSearchParams(searchParams);
    if (nextFilters.clientId === "all") next.delete("clientId"); else next.set("clientId", nextFilters.clientId);
    if (nextFilters.projectId === "all") next.delete("projectId"); else next.set("projectId", nextFilters.projectId);
    setSearchParams(next);
  };

  if (tasksLoading || projectsLoading) return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-12 w-full" /><div className="flex gap-4 overflow-hidden">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-80 w-80 shrink-0" />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold">Plano de Ação</h1><p className="text-muted-foreground">Uma única visão para tarefas pessoais, de clientes e de projetos.</p></div>
        <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button>
      </div>
      {(tasksError || projectsError) && <Alert variant="destructive"><AlertDescription>{tasksError || projectsError}</AlertDescription></Alert>}
      <Tabs value={view} onValueChange={(value) => handleViewChange(value as TaskView)}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="kanban" className="shrink-0"><KanbanSquare className="mr-2 h-4 w-4" />Kanban</TabsTrigger>
          <TabsTrigger value="list" className="shrink-0"><List className="mr-2 h-4 w-4" />Lista</TabsTrigger>
          <TabsTrigger value="today" className="shrink-0"><CalendarRange className="mr-2 h-4 w-4" />Hoje</TabsTrigger>
          <TabsTrigger value="overdue" className="shrink-0"><CalendarX2 className="mr-2 h-4 w-4" />Atrasadas</TabsTrigger>
          <TabsTrigger value="mine" className="shrink-0"><User className="mr-2 h-4 w-4" />Minhas tarefas</TabsTrigger>
          <TabsTrigger value="consulting" className="shrink-0">Consultoria</TabsTrigger>
        </TabsList>
      </Tabs>
      {view === "consulting" ? (
        <ConsultingDayWorkspace clients={clients} projects={projects} tasks={tasks} savingTaskIds={savingTaskIds} currentUserId={user?.id} initialProjectId={initialProjectId === "all" ? undefined : initialProjectId} onUpdateTask={updateTask} onToggleComplete={handleToggleComplete} onRequestDelete={setDeletingTask} />
      ) : (
        <>
          {view === "mine" && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{Object.entries({ Hoje: myTaskSummary.today, Atrasadas: myTaskSummary.overdue, Próximas: myTaskSummary.upcoming, "Em andamento": myTaskSummary.progress, Aguardando: myTaskSummary.waiting }).map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>)}</div>}
          <TaskFilters clients={clients.map((client) => ({ id: client.id, name: client.nomeFantasia || client.razaoSocial || client.name || "Cliente" }))} projects={projects.map(({ id, name, clientId }) => ({ id, name, clientId }))} assignees={assignees} values={filters} onChange={handleFiltersChange} onClear={() => { setFilters(emptyFilters()); setSearchParams(view === "kanban" ? {} : { view }); }} />
          {filteredTasks.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><p className="font-medium">{tasks.length === 0 ? "Nenhuma tarefa cadastrada." : "Nenhuma tarefa encontrada nesta visão."}</p><p className="mt-1 text-sm text-muted-foreground">Crie uma tarefa ou ajuste os filtros para continuar.</p></CardContent></Card>
          ) : view === "kanban" ? (
            <TaskKanban tasks={filteredTasks} savingTaskIds={savingTaskIds} onEdit={(task) => { setEditingTask(task); setDialogOpen(true); }} onDelete={setDeletingTask} onToggleComplete={(task) => void handleToggleComplete(task)} onStatusChange={(task, status) => void handleStatusChange(task, status)} />
          ) : (
            <TaskList tasks={filteredTasks} savingTaskIds={savingTaskIds} onEdit={(task) => { setEditingTask(task); setDialogOpen(true); }} onDelete={setDeletingTask} onToggleComplete={(task) => void handleToggleComplete(task)} />
          )}
        </>
      )}
      <TaskDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingTask(null); const next = new URLSearchParams(searchParams); next.delete("taskId"); setSearchParams(next); } }} task={editingTask} />
      <AlertDialog open={Boolean(deletingTask)} onOpenChange={(open) => !open && setDeletingTask(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação remove a tarefa e seu histórico. Não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingTask) void handleDelete(deletingTask); setDeletingTask(null); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
