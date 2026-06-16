import { useEffect, useMemo, useState } from "react";
import { Plus, List, Kanban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/contexts/DataContext";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { TaskCard, TaskFilters } from "@/components/plano-acao";
import { Task } from "@/types";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "next", title: "Próximas" },
  { id: "in_progress", title: "Em Andamento" },
  { id: "validation", title: "Em Validação" },
  { id: "done", title: "Concluídas" },
];

export default function PlanoAcao() {
  const { tasks, updateTask, deleteTask, clients, projects } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  
  // Filters
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedResponsible, setSelectedResponsible] = useState("all");
  const selectedProjectId = searchParams.get("projectId") || "all";
  const selectedTaskId = searchParams.get("taskId") || "";
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

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
      if (selectedProjectId !== "all" && task.projectId !== selectedProjectId) {
        return false;
      }
      if (selectedClient !== "all" && task.clientId !== selectedClient) {
        return false;
      }
      if (selectedResponsible !== "all" && task.responsible !== selectedResponsible) {
        return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, selectedClient, selectedResponsible]);

  useEffect(() => {
    if (!selectedTaskId || editingTask?.id === selectedTaskId) return;

    const task = tasks.find((item) => item.id === selectedTaskId);
    if (task) {
      setEditingTask(task);
      setDialogOpen(true);
    }
  }, [tasks, selectedTaskId, editingTask?.id]);

  const handleClearFilters = () => {
    setSelectedClient("all");
    setSelectedResponsible("all");
    setSearchParams({});
  };

  const handleClearProjectFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("projectId");
    nextParams.delete("taskId");
    setSearchParams(nextParams);
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

      {selectedProject && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Plano filtrado pelo projeto</p>
              <p className="text-sm text-muted-foreground">{selectedProject.name}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearProjectFilter}>
              <X className="mr-1 h-4 w-4" />
              Limpar projeto
            </Button>
          </CardContent>
        </Card>
      )}

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
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set("taskId", task.id);
                        if (task.projectId) nextParams.set("projectId", task.projectId);
                        setSearchParams(nextParams);
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
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center py-8">
              Visualização 5W2H - Clique em Nova Tarefa para adicionar com
              campos 5W2H
            </p>
          </CardContent>
        </Card>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingTask(null);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("taskId");
            setSearchParams(nextParams);
          }
        }}
        task={editingTask}
      />
    </div>
  );
}
