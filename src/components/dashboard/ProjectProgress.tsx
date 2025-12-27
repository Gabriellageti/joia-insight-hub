import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";

const statusColors: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  green: "No prazo",
  yellow: "Atenção",
  red: "Crítico",
};

const getStatusColor = (status: string): string => {
  return statusColors[status] || "bg-muted";
};

export function ProjectProgress() {
  const { projects, clients } = useData();

  const activeProjects = useMemo(() => {
    return projects
      .slice(0, 6) // Show max 6 projects
      .map((project) => {
        const client = clients.find((c) => c.id === project.clientId);
        return {
          id: project.id,
          name: project.name,
          client: client?.name || project.clientName || "—",
          progress: project.progress || 0,
          status: project.status || "green",
          statusLabel: statusLabels[project.status] || "No prazo",
          phase: project.phase || "Diagnóstico",
        };
      });
  }, [projects, clients]);

  if (activeProjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progresso de Projetos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum projeto em andamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progresso de Projetos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeProjects.map((project) => (
          <div key={project.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.client}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {project.phase}
                </Badge>
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`}
                  title={project.status}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={project.progress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-8">
                {project.progress}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
