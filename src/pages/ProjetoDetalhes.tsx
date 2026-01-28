import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Edit, Route, Plus } from "lucide-react";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import {
  ProjectProgressCard,
  ProjectStatusCard,
  ProjectTasksSummary,
  ProjectDiagnosticsList,
  ProjectMeetingsList,
  ProjectOpportunitiesList,
  ProjectDeliverablesList,
} from "@/components/projetos";

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
  const { projects, clients, tasks, diagnostics, meetings, opportunities, deliverables } =
    useData();

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

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

  const projectOpportunities = useMemo(
    () => opportunities.filter((o) => o.projectId === id),
    [opportunities, id]
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
          <Button variant="outline" size="sm" onClick={() => setTaskDialogOpen(true)}>
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

      {/* Cards de Progresso e Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectProgressCard project={project} />
        <ProjectStatusCard project={project} />
      </div>

      {/* Resumo de Tarefas */}
      <ProjectTasksSummary tasks={projectTasks} projectId={project.id} />

      {/* Diagnósticos e Reuniões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProjectDiagnosticsList diagnostics={projectDiagnostics} project={project} />
        <ProjectMeetingsList meetings={projectMeetings} project={project} />
      </div>

      {/* Oportunidades */}
      <ProjectOpportunitiesList opportunities={projectOpportunities} />

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
        onOpenChange={setTaskDialogOpen}
        task={{
          id: "",
          title: "",
          projectId: project.id,
          projectName: project.name,
          clientId: project.clientId,
          clientName: project.clientName,
          type: "processo",
          responsible: "",
          priority: "medium",
          dueDate: "",
          status: "backlog",
          evidenceRequired: false,
          createdAt: "",
        }}
      />
    </div>
  );
}
