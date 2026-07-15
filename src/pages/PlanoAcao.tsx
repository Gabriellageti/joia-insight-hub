import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { TaskCard, TaskFilters } from "@/components/plano-acao";
import { filterTasks, type TaskFilterValues } from "@/lib/tasks/filters";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCompletionPatch } from "@/lib/tasks/completion";
import type { Task } from "@/types";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "@/components/plano-acao/KanbanColumn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const columns: { id: Task["status"]; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "next", title: "Próximas" },
  { id: "in_progress", title: "Em andamento" },
  { id: "waiting", title: "Aguardando" },
  { id: "review", title: "Em revisão" },
  { id: "done", title: "Concluídas" },
];

const emptyFilters = (projectId = "all"): TaskFilterValues => ({ search: "", projectId, status: "all", priority: "all", assignedTo: "all", taskType: "all", overdue: false });

export default function PlanoAcao() {
  const { tasks, tasksLoading, tasksError, projects, projectsLoading, projectsError, savingTaskIds, updateTask, deleteTask } = useData();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "all";
  const [workspace, setWorkspace] = useState<"mine" | "project">(initialProjectId === "all" ? "mine" : "project");
  const [filters, setFilters] = useState<TaskFilterValues>(() => emptyFilters(initialProjectId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
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
  const savingIds = useMemo(() => new Set(savingTaskIds), [savingTaskIds]);
  const assignees = useMemo(() => {
    const byId = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.assignedTo) byId.set(task.assignedTo, task.responsible || "Usuário sem nome");
    });
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [tasks]);

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

  const handleWorkspaceChange = (value: "mine" | "project") => {
    setWorkspace(value);
    if (value === "mine" && filters.projectId !== "all") setFilters((current) => ({ ...current, projectId: "all" }));
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

      <Tabs value={workspace} onValueChange={(value) => handleWorkspaceChange(value as "mine" | "project")}>
        <TabsList className="w-full justify-start"><TabsTrigger value="mine"><User className="mr-2 h-4 w-4" />Meu Workspace</TabsTrigger><TabsTrigger value="project"><FolderKanban className="mr-2 h-4 w-4" />Por Projeto</TabsTrigger></TabsList>
      </Tabs>

      <TaskFilters projects={projects.map(({ id, name }) => ({ id, name }))} assignees={assignees} values={filters} onChange={(nextFilters) => { setFilters(nextFilters); const next = new URLSearchParams(searchParams); if (nextFilters.projectId === "all") next.delete("projectId"); else next.set("projectId", nextFilters.projectId); setSearchParams(next); }} onClear={() => { setFilters(emptyFilters()); setSearchParams({}); }} />

      {filteredTasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-medium">{tasks.length === 0 ? "Nenhuma tarefa cadastrada." : "Nenhuma tarefa encontrada com estes filtros."}</p><p className="mt-1 text-sm text-muted-foreground">{tasks.length === 0 ? "Crie a primeira tarefa para começar." : "Limpe ou altere os filtros para ver outros resultados."}</p></CardContent></Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4" aria-label="Kanban de tarefas">
            {columns.map((column) => (
              <KanbanColumn key={column.id} status={column.id} title={column.title} count={tasksByColumn[column.id].length}>
                {tasksByColumn[column.id].map((task) => <TaskCard key={task.id} task={task} saving={savingIds.has(task.id)} onClick={() => { setEditingTask(task); setDialogOpen(true); }} onDelete={() => setDeletingTask(task)} onToggleComplete={() => void handleToggleComplete(task)} />)}
              </KanbanColumn>
            ))}
          </div>
        </DndContext>
      )}

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
