import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { MyDayTaskItem } from "@/components/my-day/MyDayTaskItem";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { filterMyTasks, type MyTaskFilter } from "@/lib/my-day";
import type { Task } from "@/types";
import { toast } from "sonner";

const filters: { id: MyTaskFilter; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "overdue", label: "Atrasadas" },
  { id: "in_progress", label: "Em andamento" },
  { id: "waiting", label: "Aguardando" },
  { id: "blocked", label: "Bloqueadas" },
  { id: "upcoming", label: "Próximas" },
  { id: "completed", label: "Concluídas" },
];

export default function MinhasTarefas() {
  const { user } = useAuth();
  const { tasks, tasksLoading, savingTaskIds, updateTask } = useData();
  const [filter, setFilter] = useState<MyTaskFilter>("today");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const visible = useMemo(() => filterMyTasks(tasks, filter, user?.id), [filter, tasks, user?.id]);
  const updateStatus = async (task: Task, status: Task["status"]) => {
    try { await updateTask(task.id, { status }); toast.success(status === "done" ? "Tarefa concluída." : "Status atualizado."); } catch { /* feedback centralized */ }
  };
  if (tasksLoading) return <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-72 w-full" /></div>;

  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">Visão pessoal</p><h1 className="text-2xl font-semibold">Minhas Tarefas</h1><p className="mt-1 text-muted-foreground">Suas atividades na mesma base do Kanban, dos clientes e dos projetos.</p></div><div className="flex gap-2"><Button variant="outline" asChild><Link to="/meu-dia"><CalendarDays className="mr-2 h-4 w-4" />Meu Dia</Link></Button><Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button></div></header>
    <Tabs value={filter} onValueChange={(value) => setFilter(value as MyTaskFilter)}><TabsList className="h-auto w-full justify-start overflow-x-auto">{filters.map((item) => <TabsTrigger key={item.id} value={item.id} className="shrink-0">{item.label}</TabsTrigger>)}</TabsList></Tabs>
    <section className="space-y-3" aria-label={filters.find((item) => item.id === filter)?.label}>{visible.length ? visible.map((task) => <MyDayTaskItem key={task.id} task={task} saving={savingTaskIds.includes(task.id)} onOpen={() => { setEditingTask(task); setDialogOpen(true); }} onStatus={(status) => void updateStatus(task, status)} />) : <Card><CardContent className="py-12 text-center"><p className="font-medium">Nenhuma tarefa nesta visão.</p><p className="mt-1 text-sm text-muted-foreground">A rotina está limpa por aqui.</p></CardContent></Card>}</section>
    <TaskDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTask(null); }} task={editingTask} />
  </div>;
}
