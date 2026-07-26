
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Clock3, Columns3, FolderKanban, PlayCircle, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { ConsultingDayWorkspace, TaskCard, TaskFilters } from "@/components/plano-acao";
import { filterTasks, type TaskFilterValues } from "@/lib/tasks/filters";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCompletionPatch } from "@/lib/tasks/completion";
import { parseTaskDate } from "@/lib/tasks/dates";
import type { Task } from "@/types";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "@/components/plano-acao/KanbanColumn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDeliveryStepsForProject } from "@/lib/project-delivery";

const columns: { id: Task["status"]; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "next", title: "Próximas" },
  { id: "in_progress", title: "Em andamento" },
  { id: "waiting", title: "Aguardando" },
  { id: "review", title: "Em revisão" },
  { id: "done", title: "Concluídas" },
];
const focusColumnIds: Task["status"][] = ["next", "in_progress", "waiting"];

const emptyFilters = (projectId = "all"): TaskFilterValues => ({ search: "", projectId, status: "all", priority: "all", assignedTo: "all", taskType: "all", overdue: false });

export default function PlanoAcao() {
  const { tasks, tasksLoading, tasksError, clients, projects, projectsLoading, projectsError, savingTaskIds, updateTask, deleteTask, updateProject } = useData();
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "all";
  const initialWorkspace = searchParams.get("view") === "consulting" ? "consulting" : initialProjectId === "all" ? "mine" : "project";
  const [workspace, setWorkspace] = useState<"mine" | "project" | "consulting">(initialWorkspace);
  const [filters, setFilters] = useState<TaskFilterValues>(() => emptyFilters(initialProjectId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [showFullBoard, setShowFullBoard] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!taskId || editingTask?.id === taskId) return;
    const task = tasks.find((item) => item.id === taskId);
    if (task) { setEditingTask(task); setDialogOpen(true); }
  }, [editingTask?.id, searchParams, tasks]);

  const filteredTasks = useMemo(() => {
    const workspaceTasks = tasks.filter((task) => {
      if (workspace === "mine" && task.assignedTo !== user?.id && task.createdBy !== user?.id) return false;
      if (workspace === "project" && task.taskType !== "project") return false;
      return true;
    });
    return filterTasks(workspaceTasks, filters);
  }, [filters, tasks, user?.id, workspace]);

  const tasksByColumn = useMemo(() => Object.fromEntries(columns.map((column) => [column.id, filteredTasks.filter((task) => task.status === column.id)])) as Record<Task["status"], Task[]>, [filteredTasks]);
  const visibleColumns = useMemo(
    () => showFullBoard ? columns : columns.filter((column) => focusColumnIds.includes(column.id)),
    [showFullBoard]
  );
  const operationalCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      overdue: filteredTasks.filter((task) => {
        const dueDate = parseTaskDate(task.dueDate);
        return task.status !== "done" && Boolean(dueDate && dueDate < today);
      }).length,
      active: tasksByColumn.in_progress.length,
      waiting: tasksByColumn.waiting.length + tasksByColumn.review.length,
      done: tasksByColumn.done.length,
    };
  }, [filteredTasks, tasksByColumn]);
  const savingIds = useMemo(() => new Set(savingTaskIds), [savingTaskIds]);
  const assignees = useMemo(() => {
    const byId = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.assignedTo) byId.set(task.assignedTo, task.responsible || "Usuário sem nome");
    });
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [tasks]);
  const selectedProject = useMemo(() => projects.find((project) => project.id === filters.projectId) || null, [filters.projectId, projects]);

  const handleDrop = async (taskId: string, status: Task["status"]) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status || savingIds.has(task.id)) return;
    try {
      await updateTask(task.id, { status });
      toast.success(`Tarefa movida para ${columns.find((column) => column.id === status)?.title}.`);
    } catch {
      // DataContext rolls the optimistic state back and reports the persistence error.
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const status = String(over.id) as Task["status"];
    if (!columns.some((column) => column.id === status)) return;
    void handleDrop(String(active.id), status);
  };

  const handleToggleComplete = async (task: Task) => {
    if (savingIds.has(task.id)) return;
    const patch = getCompletionPatch(task, user?.id);
    try {
      await updateTask(task.id, patch);
      if (task.status === "done") {
        toast.success("Tarefa reaberta.", { description: task.title });
      } else {
        toast.success("Tarefa concluída.", {
          description: task.title,
          action: { label: "Desfazer", onClick: () => void updateTask(task.id, { status: task.status }, { expectedStatus: "done" }) },
        });
      }
    } catch {
      // Rollback and error feedback are centralized in DataContext.
    }
  };

  const handleDelete = async (task: Task) => {
    if (savingIds.has(task.id)) return;
    try { await deleteTask(task.id); toast.success("Tarefa excluída."); } catch { /* DataContext reports the error. */ }
  };

  const handleWorkspaceChange = (value: "mine" | "project" | "consulting") => {
    setWorkspace(value);
    if (value === "mine" && filters.projectId !== "all") setFilters((current) => ({ ...current, projectId: "all" }));
    const next = new URLSearchParams(searchParams);
    if (value === "consulting") next.set("view", "consulting"); else next.delete("view");
    setSearchParams(next);
  };

  const handleProjectPhaseChange = async (phase: string) => {
    if (!selectedProject || selectedProject.phase === phase) return;
    try {
      await updateProject(selectedProject.id, { phase });
      toast.success(`Fase atualizada para ${phase}.`);
    } catch {
      toast.error("Não foi possível atualizar a fase do projeto.");
    }
  };

  if (tasksLoading || projectsLoading) {
    return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-12 w-full" /><div className="flex gap-4 overflow-hidden">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-80 w-80 shrink-0" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold">Plano de Ação</h1><p className="text-muted-foreground">Controle suas tarefas pessoais e de projetos.</p></div>
        <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button>
      </div>

      {(tasksError || projectsError) && <Alert variant="destructive"><AlertDescription>{tasksError || projectsError}</AlertDescription></Alert>}

      <Tabs value={workspace} onValueChange={(value) => handleWorkspaceChange(value as "mine" | "project" | "consulting")}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="mine" className="shrink-0"><User className="mr-2 h-4 w-4" />Meu Workspace</TabsTrigger><TabsTrigger value="project" className="shrink-0"><FolderKanban className="mr-2 h-4 w-4" />Por Projeto</TabsTrigger><TabsTrigger value="consulting" className="shrink-0"><CalendarRange className="mr-2 h-4 w-4" />Por Dia da Consultoria</TabsTrigger></TabsList>
      </Tabs>

      {workspace === "consulting" ? (
        <ConsultingDayWorkspace
          clients={clients}
          projects={projects}
          tasks={tasks}
          savingTaskIds={savingTaskIds}
          currentUserId={user?.id}
          initialProjectId={initialProjectId === "all" ? undefined : initialProjectId}
          onUpdateTask={updateTask}
          onToggleComplete={handleToggleComplete}
          onRequestDelete={setDeletingTask}
        />
      ) : <>
      {workspace === "project" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">Controle por projeto</p>
              <p className="text-sm text-muted-foreground">Escolha um projeto para ver suas ações e conduzir a fase por aqui.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <Select value={filters.projectId} onValueChange={(projectId) => setFilters((current) => ({ ...current, projectId }))}>
                <SelectTrigger className="w-full md:w-64"><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos os projetos</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
              </Select>
              {selectedProject && <Select value={selectedProject.phase} onValueChange={handleProjectPhaseChange} disabled={!isAdmin}>
                <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>{getDeliveryStepsForProject(selectedProject).map((step) => <SelectItem key={step.title} value={step.title}>{step.title}</SelectItem>)}</SelectContent>
              </Select>}
            </div>
          </CardContent>
        </Card>
      )}
      <TaskFilters projects={projects.map(({ id, name }) => ({ id, name }))} assignees={assignees} values={filters} onChange={(nextFilters) => { setFilters(nextFilters); const next = new URLSearchParams(searchParams); if (nextFilters.projectId === "all") next.delete("projectId"); else next.set("projectId", nextFilters.projectId); setSearchParams(next); }} onClear={() => { setFilters(emptyFilters()); setSearchParams({}); }} />

      <div className="flex flex-wrap gap-2" aria-label="Atalhos operacionais">
        <Button variant={filters.overdue ? "destructive" : "outline"} size="sm" onClick={() => setFilters((current) => ({ ...current, overdue: !current.overdue, status: "all" }))}><AlertTriangle className="mr-1.5 h-4 w-4" />{operationalCounts.overdue} atrasadas</Button>
        <Button variant={filters.status === "in_progress" ? "default" : "outline"} size="sm" onClick={() => setFilters((current) => ({ ...current, overdue: false, status: "in_progress" }))}><PlayCircle className="mr-1.5 h-4 w-4" />{operationalCounts.active} em andamento</Button>
        <Button variant={filters.status === "waiting" ? "default" : "outline"} size="sm" onClick={() => setFilters((current) => ({ ...current, overdue: false, status: "waiting" }))}><Clock3 className="mr-1.5 h-4 w-4" />{operationalCounts.waiting} aguardando</Button>
        <Button variant={filters.status === "done" ? "default" : "ghost"} size="sm" onClick={() => setFilters((current) => ({ ...current, overdue: false, status: "done" }))}><CheckCircle2 className="mr-1.5 h-4 w-4" />{operationalCounts.done} concluídas</Button>
      </div>

      {filteredTasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-medium">{tasks.length === 0 ? "Nenhuma tarefa cadastrada." : "Nenhuma tarefa encontrada com estes filtros."}</p><p className="mt-1 text-sm text-muted-foreground">{tasks.length === 0 ? "Crie a primeira tarefa para começar." : "Limpe ou altere os filtros para ver outros resultados."}</p></CardContent></Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-semibold">{showFullBoard ? "Fluxo completo" : "Foco operacional"}</h2><p className="text-sm text-muted-foreground">{showFullBoard ? "Todas as etapas do processo." : "Próximas ações, trabalho em curso e pendências externas."}</p></div>
            <Button variant="outline" size="sm" onClick={() => setShowFullBoard((value) => !value)}><Columns3 className="mr-2 h-4 w-4" />{showFullBoard ? "Voltar ao foco" : "Ver fluxo completo"}</Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Kanban de tarefas">
            {visibleColumns.map((column) => (
              <KanbanColumn key={column.id} status={column.id} title={column.title} count={tasksByColumn[column.id].length}>
                {tasksByColumn[column.id].map((task) => <TaskCard key={task.id} task={task} saving={savingIds.has(task.id)} onClick={() => { setEditingTask(task); setDialogOpen(true); }} onDelete={() => setDeletingTask(task)} onToggleComplete={() => void handleToggleComplete(task)} />)}
              </KanbanColumn>
            ))}
          </div>
        </DndContext>
      )}
      </>}

      <TaskDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingTask(null); const next = new URLSearchParams(searchParams); next.delete("taskId"); setSearchParams(next); } }} task={editingTask} />
      <AlertDialog open={Boolean(deletingTask)} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação remove a tarefa e seu histórico. Não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingTask) void handleDelete(deletingTask); setDeletingTask(null); }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
