import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { KanbanColumn } from "@/components/plano-acao/KanbanColumn";
import { TaskCard } from "@/components/plano-acao/TaskCard";
import {
  listConsultingDayPlans,
  listConsultingDayTaskIds,
} from "@/integrations/supabase/consulting-days";
import {
  getConsultingDayMetrics,
  isMainConsultingTask,
  sortConsultingTasks,
} from "@/lib/consulting-days";
import { parseTaskDate } from "@/lib/tasks/dates";
import type { Client, ConsultingDayPlan, Project, Task } from "@/types";

const columns: { id: Task["status"]; title: string }[] = [
  { id: "not_started", title: "Não iniciada" },
  { id: "in_progress", title: "Em andamento" },
  { id: "waiting", title: "Aguardando" },
  { id: "blocked", title: "Bloqueada" },
  { id: "done", title: "Concluídas" },
];

const situationLabels = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  done: "Concluído",
  overdue: "Com atraso",
} as const;

const meetingAgenda = [
  "Prestação de contas — 10 minutos.",
  "Apresentação do tema principal — 20 minutos.",
  "Discussão e tomada de decisão — 20 minutos.",
  "Registro dos encaminhamentos — 10 minutos.",
  "Encerramento — 5 minutos.",
];

interface ConsultingDayWorkspaceProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  savingTaskIds: string[];
  currentUserId?: string;
  initialProjectId?: string;
  onUpdateTask: (id: string, patch: Partial<Task>) => Promise<Task>;
  onToggleComplete: (task: Task) => Promise<void>;
  onRequestDelete: (task: Task) => void;
}

type CompletionFilter = "all" | "pending" | "done";
type SortOption =
  | "default"
  | "manual"
  | "priority"
  | "due_date"
  | "assignee"
  | "status"
  | "created_at";

export function ConsultingDayWorkspace({
  clients,
  projects,
  tasks,
  savingTaskIds,
  currentUserId,
  initialProjectId,
  onUpdateTask,
  onToggleComplete,
  onRequestDelete,
}: ConsultingDayWorkspaceProps) {
  const initialProject = projects.find(
    (project) => project.id === initialProjectId,
  );
  const [clientId, setClientId] = useState(initialProject?.clientId || "");
  const [projectId, setProjectId] = useState(initialProject?.id || "");
  const [plans, setPlans] = useState<ConsultingDayPlan[]>([]);
  const [permittedTaskIds, setPermittedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDay, setSelectedDay] = useState<number | "overview">(
    "overview",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogTask, setDialogTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [completion, setCompletion] = useState<CompletionFilter>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const savingIds = useMemo(() => new Set(savingTaskIds), [savingTaskIds]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const clientProjects = useMemo(
    () => projects.filter((project) => project.clientId === clientId),
    [clientId, projects],
  );
  const project = projects.find((item) => item.id === projectId);

  useEffect(() => {
    if (!projectId) {
      setPlans([]);
      setPermittedTaskIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      listConsultingDayPlans(projectId),
      listConsultingDayTaskIds(projectId),
    ])
      .then(([nextPlans, ids]) => {
        if (cancelled) return;
        setPlans(nextPlans);
        setPermittedTaskIds(new Set(ids));
        setSelectedDay("overview");
      })
      .catch(
        (requestError: Error) => !cancelled && setError(requestError.message),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    listConsultingDayTaskIds(projectId)
      .then((ids) => !cancelled && setPermittedTaskIds(new Set(ids)))
      .catch(
        (requestError: Error) => !cancelled && setError(requestError.message),
      );
    return () => {
      cancelled = true;
    };
  }, [projectId, tasks.length]);

  const projectTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.projectId === projectId &&
          task.consultingDay &&
          permittedTaskIds.has(task.id),
      ),
    [permittedTaskIds, projectId, tasks],
  );

  const currentPlan =
    selectedDay === "overview"
      ? undefined
      : plans.find((plan) => plan.dayNumber === selectedDay);
  const currentTasks =
    selectedDay === "overview"
      ? []
      : projectTasks.filter((task) => task.consultingDay === selectedDay);
  const mainTask = currentTasks.find(isMainConsultingTask);
  const deliverables = currentTasks.filter(
    (task) => !isMainConsultingTask(task),
  );
  const metrics = getConsultingDayMetrics(currentTasks);
  const assignees = useMemo(() => {
    const values = new Map<string, string>();
    projectTasks.forEach(
      (task) =>
        task.assignedTo &&
        values.set(task.assignedTo, task.responsible || "Usuário sem nome"),
    );
    return [...values]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [projectTasks]);

  const filteredDeliverables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matching = deliverables.filter((task) => {
      if (
        search &&
        !task.title
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR"))
      )
        return false;
      if (status !== "all" && task.status !== status) return false;
      if (priority !== "all" && task.priority !== priority) return false;
      if (assignee !== "all" && task.assignedTo !== assignee) return false;
      if (completion === "done" && task.status !== "done") return false;
      if (completion === "pending" && task.status === "done") return false;
      const dueDate = parseTaskDate(task.dueDate);
      if (
        overdueOnly &&
        !(task.status !== "done" && dueDate && dueDate < today)
      )
        return false;
      return true;
    });
    if (sortBy === "default") return sortConsultingTasks(matching);
    const priorityOrder: Record<Task["priority"], number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const statusOrder: Record<Task["status"], number> = {
      not_started: 0,
      in_progress: 1,
      waiting: 2,
      blocked: 3,
      done: 4,
    };
    return [...matching].sort((a, b) => {
      if (sortBy === "priority")
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (sortBy === "due_date")
        return (
          (parseTaskDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (parseTaskDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)
        );
      if (sortBy === "assignee")
        return a.responsible.localeCompare(b.responsible, "pt-BR");
      if (sortBy === "status")
        return statusOrder[a.status] - statusOrder[b.status];
      if (sortBy === "created_at")
        return b.createdAt.localeCompare(a.createdAt);
      return (a.sourceActionId || a.id).localeCompare(
        b.sourceActionId || b.id,
        "pt-BR",
        { numeric: true },
      );
    });
  }, [
    assignee,
    completion,
    deliverables,
    overdueOnly,
    priority,
    search,
    sortBy,
    status,
  ]);

  const openTask = (task: Task) => {
    setDialogTask(task);
    setDialogOpen(true);
  };
  const openNewTask = () => {
    if (!project || selectedDay === "overview") return;
    setDialogTask({
      id: "",
      title: "",
      description: "",
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      type: "processo",
      responsible: "",
      priority: "medium",
      taskType: "project",
      assignedTo: currentUserId || "",
      startDate: "",
      dueDate: "",
      status: "not_started",
      evidenceRequired: false,
      createdAt: "",
      createdBy: currentUserId || "",
      consultingDay: selectedDay,
    });
    setDialogOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPriority("all");
    setAssignee("all");
    setCompletion("all");
    setOverdueOnly(false);
    setSortBy("default");
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const nextStatus = String(over.id) as Task["status"];
    const task = tasks.find((item) => item.id === String(active.id));
    if (
      !task ||
      task.status === nextStatus ||
      savingIds.has(task.id) ||
      !columns.some((column) => column.id === nextStatus)
    )
      return;
    if (nextStatus === "blocked") {
      const reason = window.prompt("Informe o motivo do bloqueio:");
      if (!reason?.trim()) return;
      void onUpdateTask(task.id, { status: nextStatus, blockReason: reason.trim(), blockReasonCategory: "other" });
      return;
    }
    void onUpdateTask(task.id, { status: nextStatus });
  };

  const moveDay = (direction: -1 | 1) => {
    if (selectedDay === "overview") return;
    const index = plans.findIndex((plan) => plan.dayNumber === selectedDay);
    const next = plans[index + direction];
    if (next) setSelectedDay(next.dayNumber);
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="consulting-client">Cliente</Label>
            <Select
              value={clientId || "none"}
              onValueChange={(value) => {
                setClientId(value === "none" ? "" : value);
                setProjectId("");
              }}
            >
              <SelectTrigger id="consulting-client">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione o cliente</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nomeFantasia || client.razaoSocial || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="consulting-project">Projeto ou ciclo</Label>
            <Select
              disabled={!clientId}
              value={projectId || "none"}
              onValueChange={(value) =>
                setProjectId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="consulting-project">
                <SelectValue placeholder="Selecione o projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione o projeto</SelectItem>
                {clientProjects.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!projectId && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Selecione um cliente e um projeto para abrir o planejamento.
          </CardContent>
        </Card>
      )}
      {projectId && !error && plans.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">
              Este projeto ainda não possui um planejamento dividido por dias.
            </p>
          </CardContent>
        </Card>
      )}

      {plans.length > 0 && (
        <>
          <nav
            className="flex gap-2 overflow-x-auto pb-2"
            aria-label="Dias da consultoria"
          >
            <Button
              variant={selectedDay === "overview" ? "default" : "outline"}
              className="shrink-0"
              onClick={() => setSelectedDay("overview")}
            >
              Visão geral
            </Button>
            {plans.map((plan) => (
              <Button
                key={plan.id}
                variant={selectedDay === plan.dayNumber ? "default" : "outline"}
                className="shrink-0"
                onClick={() => setSelectedDay(plan.dayNumber)}
              >
                Dia {plan.dayNumber}
              </Button>
            ))}
          </nav>

          {selectedDay === "overview" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const dayMetrics = getConsultingDayMetrics(
                  projectTasks.filter(
                    (task) => task.consultingDay === plan.dayNumber,
                  ),
                );
                return (
                  <button
                    key={plan.id}
                    type="button"
                    className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setSelectedDay(plan.dayNumber)}
                    aria-label={`Abrir Dia ${plan.dayNumber}: ${plan.theme}`}
                  >
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge>Dia {plan.dayNumber}</Badge>
                          <Badge
                            variant={
                              dayMetrics.situation === "overdue"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {situationLabels[dayMetrics.situation]}
                          </Badge>
                        </div>
                        <CardTitle className="pt-2 text-base leading-snug">
                          {plan.theme}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {plan.objective}
                        </p>
                        <Progress
                          value={dayMetrics.progress}
                          aria-label={`Progresso do Dia ${plan.dayNumber}: ${dayMetrics.progress}%`}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{dayMetrics.completed} concluídas</span>
                          <span>{dayMetrics.pending} pendentes</span>
                        </div>
                        {dayMetrics.overdue > 0 && (
                          <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {dayMetrics.overdue} atrasadas
                          </p>
                        )}
                        {plan.meetingDate && (
                          <p className="flex items-center gap-1 text-xs">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(
                              `${plan.meetingDate}T12:00:00`,
                            ).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          ) : (
            currentPlan && (
              <div className="space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Roteiro padrão da reunião
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                      {meetingAgenda.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <Badge>Dia {currentPlan.dayNumber}</Badge>
                        <h2 className="mt-2 text-xl font-semibold">
                          {currentPlan.theme}
                        </h2>
                        <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
                          {currentPlan.objective}
                        </p>
                      </div>
                      <Button onClick={openNewTask}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova tarefa neste dia
                      </Button>
                    </div>
                    <Progress value={metrics.progress} />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">
                        {metrics.progress}% concluído
                      </Badge>
                      <Badge variant="outline">
                        {metrics.completed} concluídas
                      </Badge>
                      <Badge variant="outline">
                        {metrics.pending} pendentes
                      </Badge>
                      {metrics.overdue > 0 && (
                        <Badge variant="destructive">
                          {metrics.overdue} atrasadas
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <section aria-labelledby="main-meeting-title">
                  <div className="mb-3 flex items-center justify-between">
                    <h3
                      id="main-meeting-title"
                      className="text-lg font-semibold"
                    >
                      Reunião principal
                    </h3>
                    {mainTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          savingIds.has(mainTask.id) ||
                          (mainTask.status !== "done" &&
                            (metrics.total === 0 || metrics.pending > 0))
                        }
                        onClick={() => void onToggleComplete(mainTask)}
                      >
                        {mainTask.status === "done"
                          ? "Reabrir dia"
                          : "Concluir dia"}
                      </Button>
                    )}
                  </div>
                  {!mainTask ? (
                    <Card>
                      <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        A tarefa principal deste dia ainda não está cadastrada.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
                      <TaskCard
                        task={mainTask}
                        saving={savingIds.has(mainTask.id)}
                        onClick={() => openTask(mainTask)}
                        onDelete={() => onRequestDelete(mainTask)}
                        onToggleComplete={() => void onToggleComplete(mainTask)}
                      />
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Entregáveis esperados
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {currentPlan.expectedDecisions.map((decision) => (
                            <div
                              key={decision}
                              className="flex items-start gap-2"
                            >
                              <Checkbox disabled aria-label={decision} />
                              <span className="text-sm">{decision}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  {mainTask &&
                    mainTask.status !== "done" &&
                    metrics.pending > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Conclua as tarefas pendentes antes de finalizar este
                        dia.
                      </p>
                    )}
                </section>

                <Alert>
                  <AlertDescription>
                    <strong>Durante esta reunião, registrar:</strong> o que será
                    feito; quem será o responsável; qual será o prazo; qual
                    resultado é esperado; qual indicador será acompanhado; qual
                    é a situação atual; e o que será apresentado na reunião
                    seguinte.
                  </AlertDescription>
                </Alert>

                <section
                  aria-labelledby="deliverables-title"
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3
                      id="deliverables-title"
                      className="text-lg font-semibold"
                    >
                      Tarefas do dia ({metrics.total})
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={view === "list" ? "default" : "outline"}
                        onClick={() => setView("list")}
                      >
                        <List className="mr-1 h-4 w-4" />
                        Lista
                      </Button>
                      <Button
                        size="sm"
                        variant={view === "kanban" ? "default" : "outline"}
                        onClick={() => setView("kanban")}
                      >
                        <LayoutGrid className="mr-1 h-4 w-4" />
                        Kanban
                      </Button>
                    </div>
                  </div>
                  <Card>
                    <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                      <Input
                        aria-label="Buscar por título"
                        placeholder="Buscar por título"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger aria-label="Filtrar por status">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          {columns.map((column) => (
                            <SelectItem key={column.id} value={column.id}>
                              {column.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger aria-label="Filtrar por prioridade">
                          <SelectValue placeholder="Prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Todas as prioridades
                          </SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="low">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={assignee} onValueChange={setAssignee}>
                        <SelectTrigger aria-label="Filtrar por responsável">
                          <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Todos os responsáveis
                          </SelectItem>
                          {assignees.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={completion}
                        onValueChange={(value: CompletionFilter) =>
                          setCompletion(value)
                        }
                      >
                        <SelectTrigger aria-label="Filtrar por conclusão">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Concluídas e pendentes
                          </SelectItem>
                          <SelectItem value="pending">
                            Somente pendentes
                          </SelectItem>
                          <SelectItem value="done">
                            Somente concluídas
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={sortBy}
                        onValueChange={(value: SortOption) => setSortBy(value)}
                      >
                        <SelectTrigger aria-label="Ordenar tarefas">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">
                            Ordem recomendada
                          </SelectItem>
                          <SelectItem value="manual">
                            Ordem manual/importação
                          </SelectItem>
                          <SelectItem value="priority">Prioridade</SelectItem>
                          <SelectItem value="due_date">Prazo</SelectItem>
                          <SelectItem value="assignee">Responsável</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="created_at">
                            Data de criação
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={overdueOnly}
                          onCheckedChange={(checked) =>
                            setOverdueOnly(Boolean(checked))
                          }
                        />
                        Somente atrasadas
                      </label>
                      <Button variant="ghost" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    </CardContent>
                  </Card>

                  {filteredDeliverables.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        {deliverables.length === 0
                          ? "Este dia ainda não possui tarefas de entrega."
                          : "Nenhuma tarefa corresponde aos filtros."}
                      </CardContent>
                    </Card>
                  ) : view === "list" ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {filteredDeliverables.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          saving={savingIds.has(task.id)}
                          onClick={() => openTask(task)}
                          onDelete={() => onRequestDelete(task)}
                          onToggleComplete={() => void onToggleComplete(task)}
                        />
                      ))}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCorners}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex gap-4 overflow-x-auto pb-4">
                        {columns.map((column) => {
                          const columnTasks = filteredDeliverables.filter(
                            (task) => task.status === column.id,
                          );
                          return (
                            <KanbanColumn
                              key={column.id}
                              status={column.id}
                              title={column.title}
                              count={columnTasks.length}
                            >
                              {columnTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  saving={savingIds.has(task.id)}
                                  onClick={() => openTask(task)}
                                  onDelete={() => onRequestDelete(task)}
                                  onToggleComplete={() =>
                                    void onToggleComplete(task)
                                  }
                                />
                              ))}
                            </KanbanColumn>
                          );
                        })}
                      </div>
                    </DndContext>
                  )}
                </section>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={plans[0]?.dayNumber === selectedDay}
                    onClick={() => moveDay(-1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dia anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      plans[plans.length - 1]?.dayNumber === selectedDay
                    }
                    onClick={() => moveDay(1)}
                  >
                    Próximo dia
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          )}
        </>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogTask(null);
        }}
        task={dialogTask}
      />
    </div>
  );
}
