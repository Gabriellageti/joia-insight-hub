import { useState, useMemo } from "react";
import { Plus, List, Kanban, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { TaskCard, TaskFilters } from "@/components/plano-acao";
import { Task } from "@/types";
import { toast } from "sonner";

const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "next", title: "Próximas" },
  { id: "in_progress", title: "Em Andamento" },
  { id: "validation", title: "Em Validação" },
  { id: "done", title: "Concluídas" },
];

const statusLabels = Object.fromEntries(columns.map((column) => [column.id, column.title]));
const priorityLabels: Record<Task["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export default function PlanoAcao() {
  const { tasks, updateTask, deleteTask, clients } = useData();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedResponsible, setSelectedResponsible] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Get unique responsibles from tasks
  const uniqueResponsibles = useMemo(() => {
    const responsibles = new Set<string>();
    tasks.forEach((task) => {
      if (task.responsible) {
        responsibles.add(task.responsible);
      }
    });
    return Array.from(responsibles).sort();
  }, [tasks]);

  // Get unique clients from tasks
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.clientId && task.clientName) {
        clientsMap.set(task.clientId, task.clientName);
      }
    });
    return Array.from(clientsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const term = search.trim().toLowerCase();
      if (
        term &&
        ![
          task.title,
          task.description,
          task.projectName,
          task.clientName,
          task.responsible,
          task.what,
          task.why,
          task.where,
          task.who,
          task.how,
          task.howMuch,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term))
      ) {
        return false;
      }
      if (selectedClient !== "all" && task.clientId !== selectedClient) {
        return false;
      }
      if (selectedResponsible !== "all" && task.responsible !== selectedResponsible) {
        return false;
      }
      if (selectedPriority !== "all" && task.priority !== selectedPriority) {
        return false;
      }
      if (selectedStatus !== "all" && task.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [tasks, search, selectedClient, selectedResponsible, selectedPriority, selectedStatus]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedClient("all");
    setSelectedResponsible("all");
    setSelectedPriority("all");
    setSelectedStatus("all");
  };

  const handleDrop = (columnId: string) => {
    if (!draggingTaskId) return;

    const task = tasks.find((t) => t.id === draggingTaskId);
    if (task && task.status !== columnId) {
      updateTask(task.id, {
        status: columnId as Task["status"],
      });
      toast.success(`Tarefa movida para ${columns.find((c) => c.id === columnId)?.title}`);
    }

    setDraggingTaskId(null);
    setActiveColumn(null);
  };

  const handleCompleteTask = (task: Task) => {
    updateTask(task.id, { status: "done" });
    toast.success("Tarefa concluída!", {
      description: task.title,
    });
  };

  const handleDeleteTask = (task: Task) => {
    deleteTask(task.id);
    toast.success("Tarefa excluída");
  };

  const tasksByColumn = columns.reduce(
    (acc, col) => {
      acc[col.id] = filteredTasks.filter((t) => t.status === col.id);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const totalFilteredTasks = filteredTasks.length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Plano de Ação
          </h1>
          <p className="text-muted-foreground">
            Gerencie tarefas e ações dos projetos
            {totalFilteredTasks !== totalTasks && (
              <span className="ml-2 text-sm">
                (Exibindo {totalFilteredTasks} de {totalTasks})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "kanban" | "list")}
          >
            <TabsList>
              <TabsTrigger value="kanban">
                <Kanban className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                5W2H
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              setEditingTask(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <TaskFilters
        clients={uniqueClients}
        responsibles={uniqueResponsibles}
        selectedClient={selectedClient}
        selectedResponsible={selectedResponsible}
        onClientChange={setSelectedClient}
        onResponsibleChange={setSelectedResponsible}
        onClear={handleClearFilters}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar tarefa, projeto, responsável ou 5W2H..."
              className="pl-9"
            />
          </div>
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {columns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <Card
                className={`bg-muted/30 transition-colors ${
                  activeColumn === column.id
                    ? "ring-2 ring-accent/60 bg-accent/5"
                    : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setActiveColumn(column.id);
                }}
                onDragLeave={() =>
                  setActiveColumn((current) =>
                    current === column.id ? null : current
                  )
                }
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(column.id);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {column.title}
                    <Badge variant="outline">
                      {tasksByColumn[column.id]?.length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 min-h-[200px]">
                  {tasksByColumn[column.id]?.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => {
                        setEditingTask(task);
                        setDialogOpen(true);
                      }}
                      onDelete={() => handleDeleteTask(task)}
                      onComplete={() => handleCompleteTask(task)}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setActiveColumn(null);
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma tarefa encontrada com os filtros atuais.
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className="cursor-pointer hover:bg-muted/30" onClick={() => {
                setEditingTask(task);
                setDialogOpen(true);
              }}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{task.title}</h3>
                        <Badge variant="outline">{statusLabels[task.status] || task.status}</Badge>
                        <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                          {priorityLabels[task.priority]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.clientName} • {task.projectName} • Responsável: {task.responsible || "Não definido"}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Prazo: <span className="font-medium text-foreground">{task.dueDate || "Sem prazo"}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      ["O que", task.what || task.description || "-"],
                      ["Por quê", task.why || "-"],
                      ["Onde", task.where || task.projectName || "-"],
                      ["Quando", task.when || task.dueDate || "-"],
                      ["Quem", task.who || task.responsible || "-"],
                      ["Como", task.how || "-"],
                      ["Quanto", task.howMuch || "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border p-3">
                        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                        <p className="mt-1 text-sm text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
      />
    </div>
  );
}
