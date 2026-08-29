import { CheckCircle2, Circle, Clock, ExternalLink, FileCheck2, Plus, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Project, Task } from "@/types";
import type { DeliveryStep } from "@/lib/project-delivery";
import { getDeliveryStepsForProject, getProjectTypeLabel } from "@/lib/project-delivery";

interface ProjectDeliveryWorkflowProps {
  project: Project;
  tasks?: Task[];
  onCreateTask?: (step: DeliveryStep) => void;
  onOpenTask?: (task: Task) => void;
}

const statusLabels: Record<Task["status"], string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  blocked: "Bloqueada",
  done: "Concluída",
};

const statusClasses: Record<Task["status"], string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-700",
  waiting: "bg-orange-100 text-orange-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-green-100 text-green-700",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const taskMatchesStep = (task: Task, step: DeliveryStep) => {
  const taskTitle = normalize(task.title);
  const taskDescription = normalize(task.description || "");
  const stepTitle = normalize(step.title);

  return taskTitle.includes(stepTitle) || taskDescription.includes(`etapa: ${stepTitle}`);
};

const getStepStatus = (index: number, activeIndex: number, stepTasks: Task[]) => {
  if (stepTasks.length > 0 && stepTasks.every((task) => task.status === "done")) {
    return "completed";
  }

  if (stepTasks.some((task) => task.status !== "done")) {
    return "active";
  }

  if (index < activeIndex) return "completed";
  if (index === activeIndex) return "active";
  return "pending";
};

export function ProjectDeliveryWorkflow({
  project,
  tasks = [],
  onCreateTask,
  onOpenTask,
}: ProjectDeliveryWorkflowProps) {
  const navigate = useNavigate();
  const steps = getDeliveryStepsForProject(project);
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.title.toLowerCase() === project.phase.toLowerCase())
  );
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;
  const stepsWithTasks = steps.map((step) => ({
    step,
    tasks: tasks.filter((task) => taskMatchesStep(task, step)),
  }));
  const completedSteps = stepsWithTasks.filter(({ tasks: stepTasks }, index) =>
    getStepStatus(index, safeActiveIndex, stepTasks) === "completed"
  ).length;
  const workflowProgress = Math.round((completedSteps / steps.length) * 100);

  const handleOpenInActionPlan = (task?: Task) => {
    const params = new URLSearchParams({ projectId: project.id });
    if (task?.id) params.set("taskId", task.id);
    navigate(`/plano-acao?${params.toString()}`);
  };

  const handleCreateInTaskControl = (step: DeliveryStep) => {
    if (onCreateTask) {
      onCreateTask(step);
      return;
    }
    const params = new URLSearchParams({ projectId: project.id, newStep: step.title });
    navigate(`/plano-acao?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Esteira de Entrega
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Acompanhe as etapas de construção para {getProjectTypeLabel(project.projectType).toLowerCase()}. Tarefas e fase são conduzidas pelo Controle de Tarefas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getProjectTypeLabel(project.projectType)}</Badge>
            <Button variant="outline" size="sm" onClick={() => handleOpenInActionPlan()}>
              Controle de tarefas
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso da esteira</span>
            <span className="font-medium">{workflowProgress}%</span>
          </div>
          <Progress value={workflowProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stepsWithTasks.map(({ step, tasks: stepTasks }, index) => {
            const status = getStepStatus(index, safeActiveIndex, stepTasks);
            const isCompleted = status === "completed";
            const isActive = status === "active";
            const Icon = isCompleted ? CheckCircle2 : isActive ? Clock : Circle;

            return (
              <div
                key={step.title}
                className={`rounded-lg border p-4 transition-colors ${
                  isActive ? "border-primary/40 bg-primary/5" : "bg-card"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <Icon
                      className={`mt-0.5 h-5 w-5 ${
                        isCompleted ? "text-green-600" : isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{step.title}</h4>
                        {isActive && <Badge>Em andamento</Badge>}
                        {isCompleted && <Badge variant="outline">Concluída</Badge>}
                        {step.approvalRequired && (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Aprovação
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleCreateInTaskControl(step)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Criar no controle
                    </Button>
                    {stepTasks[0] && (
                      <Button variant="secondary" size="sm" onClick={() => onOpenTask?.(stepTasks[0])}>
                        Abrir tarefa
                      </Button>
                    )}
                  </div>
                </div>

                {stepTasks.length > 0 && (
                  <div className="mt-4 rounded-lg border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tarefas vinculadas ao plano de ação
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenInActionPlan(stepTasks[0])}>
                        Ver no plano
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {stepTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onOpenTask?.(task)}
                          className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{task.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {task.responsible || "Responsável não definido"}
                              {task.dueDate ? ` • ${task.dueDate}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className={statusClasses[task.status]}>
                            {statusLabels[task.status] || task.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Checklist recomendado
                    </p>
                    <ul className="space-y-1 text-sm">
                      {step.checklist.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Entregáveis esperados
                    </p>
                    <ul className="space-y-1 text-sm">
                      {step.deliverables.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
