import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, Edit, ListTodo, Route, Plus } from "lucide-react";
import { getProjectTypeLabel } from "@/lib/project-delivery";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types";
import type { DeliveryStep } from "@/lib/project-delivery";
import {
  ProjectProgressCard,
  ProjectStatusCard,
  ProjectTasksSummary,
  ProjectDiagnosticsList,
  ProjectMeetingsList,
  ProjectDeliverablesList,
  ProjectDeliveryWorkflow,
} from "@/components/projetos";
import { ProjectAccessManager } from "@/components/projetos/ProjectAccessManager";

const phaseColors: Record<string, string> = {
  Diagnóstico: "bg-blue-100 text-blue-700",
  "Quick wins": "bg-purple-100 text-purple-700",
  Estruturação: "bg-orange-100 text-orange-700",
  Acompanhamento: "bg-green-100 text-green-700",
  "Cultura e treinamento": "bg-teal-100 text-teal-700",
};

export default function ProjetoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, clients, tasks, diagnostics, meetings, deliverables } =
    useData();
  const { isAdmin } = useAuth();

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id]);
  const client = useMemo(
    () => (project ? clients.find((c) => c.id === project.clientId) : undefined),
    [clients, project]
  );

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === id),
    [tasks, id]
  );

  const projectDiagnostics = useMemo(
    () => diagnostics.filter((d) => d.projectId === id),
    [diagnostics, id]
  );

  const projectMeetings = useMemo(
    () => meetings.filter((m) => m.projectId === id),
    [meetings, id]
  );

  const projectDeliverables = useMemo(
    () => deliverables.filter((d) => d.projectId === id),
    [deliverables, id]
  );

  const nextTask = useMemo(
    () => projectTasks
      .filter((task) => task.status !== "done")
      .sort((first, second) => {
        if (!first.dueDate) return 1;
        if (!second.dueDate) return -1;
        return first.dueDate.localeCompare(second.dueDate);
      })[0],
    [projectTasks]
  );

  const nextMeeting = useMemo(
    () => projectMeetings
      .filter((meeting) => meeting.status === "scheduled")
      .sort((first, second) => first.date.localeCompare(second.date))[0],
    [projectMeetings]
  );

  const pendingDeliverables = projectDeliverables.filter((deliverable) => deliverable.status !== "done").length;

  if (!project) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Projeto não encontrado</AlertTitle>
          <AlertDescription>
            Não foi possível localizar os dados deste projeto. Retorne para a lista para
            tentar novamente.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/projetos">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Projetos
          </Link>
        </Button>
      </div>
    );
  }



  const buildTaskDraftFromStep = (step: DeliveryStep): Task => ({
    id: "",
    title: step.title,
    description: `Etapa: ${step.title}\n\n${step.description}`,
    projectId: project.id,
    projectName: project.name,
    clientId: project.clientId,
    clientName: project.clientName,
    type:
      project.projectType === "automation" || project.projectType === "ai_implementation"
        ? "tecnologia"
        : "processo",
    responsible: project.responsible || project.responsibleNameLegacy || "",
    priority: step.approvalRequired ? "high" : "medium",
    dueDate: "",
    status: "backlog",
    evidenceRequired: true,
    what: step.title,
    why: step.description,
    where: project.clientName,
    when: "",
    who: project.responsible || project.responsibleNameLegacy || "",
    how: [...step.checklist, ...step.deliverables.map((item) => `Entregável: ${item}`)].join("\n"),
    howMuch: "",
    createdAt: "",
  });

  const handleCreateTaskFromStep = (step: DeliveryStep) => {
    setSelectedTask(buildTaskDraftFromStep(step));
    setTaskDialogOpen(true);
  };

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const isCompleted = project.phase === "Encerramento" || project.progress >= 100;


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            className="h-auto px-2 text-muted-foreground hover:text-foreground"
          >
            <Link to="/projetos" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              {isCompleted && (
                <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
                </Badge>
              )}
              <Badge variant="secondary">{getProjectTypeLabel(project.projectType)}</Badge>
              <Badge className={phaseColors[project.phase] || "bg-muted"} variant="outline">
                {project.phase}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Cliente:{" "}
              <Link
                to={`/clientes/${project.clientId}`}
                className="text-primary hover:underline"
              >
                {project.clientName}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTask(null);
              setTaskDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
          <Button variant="outline" size="sm" onClick={() => setProjectDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          {client && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/clientes/${project.clientId}/jornada`)}
            >
              <Route className="h-4 w-4 mr-1" />
              Ver Jornada
            </Button>
          )}
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visão rápida do projeto</CardTitle>
          <p className="text-sm text-muted-foreground">
            O que precisa de atenção agora, sem percorrer toda a operação.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListTodo className="h-4 w-4 text-primary" /> Próxima ação
            </div>
            {nextTask ? (
              <button type="button" onClick={() => handleOpenTask(nextTask)} className="mt-2 text-left hover:underline">
                <p className="font-medium">{nextTask.title}</p>
                <p className="text-xs text-muted-foreground">
                  {nextTask.responsible || "Responsável pendente"}{nextTask.dueDate ? ` · ${nextTask.dueDate}` : " · Sem prazo"}
                </p>
              </button>
            ) : (
              <Button variant="link" className="mt-1 h-auto px-0" onClick={() => setTaskDialogOpen(true)}>Criar a primeira tarefa</Button>
            )}
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Entregas e diagnóstico
            </div>
            <p className="mt-2 font-medium">{pendingDeliverables} entrega{pendingDeliverables === 1 ? " pendente" : "s pendentes"}</p>
            <p className="text-xs text-muted-foreground">{projectDiagnostics.length} diagnóstico{projectDiagnostics.length === 1 ? " vinculado" : "s vinculados"}</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-primary" /> Próximo contato
            </div>
            {nextMeeting ? (
              <>
                <p className="mt-2 font-medium">{nextMeeting.title}</p>
                <p className="text-xs text-muted-foreground">{nextMeeting.date}{nextMeeting.time ? ` · ${nextMeeting.time}` : ""}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards de Progresso e Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectProgressCard project={project} />
        <ProjectStatusCard project={project} />
      </div>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Acesso da equipe</CardTitle><p className="text-sm text-muted-foreground">Operador executa o trabalho. Sócio do projeto também acessa os dados financeiros deste projeto.</p></CardHeader>
          <CardContent><ProjectAccessManager projectId={project.id} /></CardContent>
        </Card>
      )}

      {/* Esteira de Entrega */}
      <ProjectDeliveryWorkflow
        project={project}
        tasks={projectTasks}
        onCreateTask={handleCreateTaskFromStep}
        onOpenTask={handleOpenTask}
      />

      {/* Resumo de Tarefas */}
      <ProjectTasksSummary tasks={projectTasks} projectId={project.id} />

      {/* Diagnósticos e Reuniões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProjectDiagnosticsList diagnostics={projectDiagnostics} project={project} />
        <ProjectMeetingsList meetings={projectMeetings} project={project} />
      </div>

      {/* Entregáveis */}
      <ProjectDeliverablesList deliverables={projectDeliverables} />

      {/* Dialogs */}
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={project}
      />
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setSelectedTask(null);
        }}
        task={
          selectedTask || {
            id: "",
            title: "",
            projectId: project.id,
            projectName: project.name,
            clientId: project.clientId,
            clientName: project.clientName,
            type: "processo",
            responsible: project.responsible || project.responsibleNameLegacy || "",
            priority: "medium",
            dueDate: "",
            status: "backlog",
            evidenceRequired: false,
            createdAt: "",
          }
        }
      />
    </div>
  );
}
