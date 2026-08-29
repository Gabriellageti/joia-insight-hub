import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Edit, Route, Plus } from "lucide-react";
import { getProjectTypeLabel } from "@/lib/project-delivery";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScopedTasksPanel } from "@/components/plano-acao";
import type { Task } from "@/types";
import type { DeliveryStep } from "@/lib/project-delivery";
import { DocumentsWorkspace } from "@/components/documents";
import {
  ProjectProgressCard,
  ProjectStatusCard,
  ProjectTasksSummary,
  ProjectDiagnosticsList,
  ProjectMeetingsList,
  ProjectDeliverablesList,
  ProjectDeliveryWorkflow,
} from "@/components/projetos";
import { ActivityFeed } from "@/components/meetings";
import { FavoriteButton } from "@/components/operations/FavoriteButton";
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
    status: "not_started",
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
          <FavoriteButton entityType="project" entityId={project.id} />
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

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Visão Geral</TabsTrigger><TabsTrigger value="tasks">Tarefas</TabsTrigger><TabsTrigger value="kanban">Kanban</TabsTrigger><TabsTrigger value="meetings">Reuniões</TabsTrigger><TabsTrigger value="documents">Documentos</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-6">
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
      <ProjectDeliverablesList projectId={project.id} deliverables={projectDeliverables} />
        </TabsContent>
        <TabsContent value="tasks"><ScopedTasksPanel tasks={projectTasks} mode="list" defaultClientId={project.clientId} defaultProjectId={project.id} showCreate={false} /></TabsContent>
        <TabsContent value="kanban"><ScopedTasksPanel tasks={projectTasks} mode="kanban" defaultClientId={project.clientId} defaultProjectId={project.id} showCreate={false} /></TabsContent>
        <TabsContent value="meetings"><ProjectMeetingsList meetings={projectMeetings} project={project} /></TabsContent>
        <TabsContent value="documents"><DocumentsWorkspace clientId={project.clientId} projectId={project.id} compact /></TabsContent>
        <TabsContent value="history"><ActivityFeed projectId={project.id} /></TabsContent>
      </Tabs>

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
            status: "not_started",
            evidenceRequired: false,
            createdAt: "",
          }
        }
        defaultClientId={project.clientId}
        defaultProjectId={project.id}
      />
    </div>
  );
}
