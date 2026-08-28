import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { getCompletionPatch } from "@/lib/tasks/completion";
import { TASK_STATUS_LABELS } from "@/lib/tasks/constants";
import { TaskKanban } from "./TaskKanban";
import { TaskList } from "./TaskList";
import type { Task } from "@/types";

interface ScopedTasksPanelProps {
  tasks: Task[];
  mode: "kanban" | "list";
  defaultClientId?: string;
  defaultProjectId?: string;
  showCreate?: boolean;
}

export function ScopedTasksPanel({ tasks, mode, defaultClientId, defaultProjectId, showCreate = true }: ScopedTasksPanelProps) {
  const { savingTaskIds, updateTask, deleteTask } = useData();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const edit = (task: Task) => { setEditingTask(task); setDialogOpen(true); };
  const toggle = async (task: Task) => {
    try { await updateTask(task.id, getCompletionPatch(task, user?.id)); toast.success(task.status === "done" ? "Tarefa reaberta." : "Tarefa concluída."); }
    catch { /* DataContext reports and rolls back */ }
  };
  const move = async (task: Task, status: Task["status"]) => {
    try { await updateTask(task.id, { status }); toast.success(`Tarefa movida para ${TASK_STATUS_LABELS[status]}.`); }
    catch { /* DataContext reports and rolls back */ }
  };
  const remove = async (task: Task) => {
    try { await deleteTask(task.id); toast.success("Tarefa excluída."); }
    catch { /* DataContext reports the error */ }
  };

  return (
    <div className="space-y-4">
      {showCreate && <div className="flex justify-end"><Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button></div>}
      {tasks.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma tarefa neste contexto.</CardContent></Card> : mode === "kanban" ? (
        <TaskKanban tasks={tasks} savingTaskIds={savingTaskIds} onEdit={edit} onDelete={setDeletingTask} onToggleComplete={(task) => void toggle(task)} onStatusChange={(task, status) => void move(task, status)} />
      ) : (
        <TaskList tasks={tasks} savingTaskIds={savingTaskIds} onEdit={edit} onDelete={setDeletingTask} onToggleComplete={(task) => void toggle(task)} />
      )}
      <TaskDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTask(null); }} task={editingTask} defaultClientId={defaultClientId} defaultProjectId={defaultProjectId} />
      <AlertDialog open={Boolean(deletingTask)} onOpenChange={(open) => !open && setDeletingTask(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>A tarefa e seu histórico serão removidos definitivamente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingTask) void remove(deletingTask); setDeletingTask(null); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
