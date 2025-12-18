import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
  client: string;
  progress: number;
  status: "green" | "yellow" | "red";
  phase: string;
}

const mockProjects: Project[] = [
  { id: "1", name: "Otimização de Compras", client: "Empresa ABC", progress: 75, status: "green", phase: "Estruturação" },
  { id: "2", name: "Gestão de Estoque", client: "Indústria XYZ", progress: 45, status: "yellow", phase: "Quick wins" },
  { id: "3", name: "Controle Financeiro", client: "Comércio 123", progress: 20, status: "red", phase: "Diagnóstico" },
  { id: "4", name: "Processos de Vendas", client: "Serviços JKL", progress: 90, status: "green", phase: "Acompanhamento" },
];

const statusColors = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

export function ProjectProgress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progresso de Projetos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockProjects.map((project) => (
          <div key={project.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.client}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{project.phase}</Badge>
                <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={project.progress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-8">{project.progress}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
