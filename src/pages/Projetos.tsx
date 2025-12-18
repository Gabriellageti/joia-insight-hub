import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Project {
  id: string;
  name: string;
  client: string;
  phase: string;
  progress: number;
  status: "green" | "yellow" | "red";
  responsible: string;
  startDate: string;
  endDate: string;
}

const mockProjects: Project[] = [
  { id: "1", name: "Otimização de Compras", client: "Empresa ABC", phase: "Estruturação", progress: 75, status: "green", responsible: "Ana Silva", startDate: "01/10/2024", endDate: "31/01/2025" },
  { id: "2", name: "Gestão de Estoque", client: "Indústria XYZ", phase: "Quick wins", progress: 45, status: "yellow", responsible: "Carlos Santos", startDate: "15/11/2024", endDate: "28/02/2025" },
  { id: "3", name: "Controle Financeiro", client: "Comércio 123", phase: "Diagnóstico", progress: 20, status: "red", responsible: "Maria Oliveira", startDate: "01/12/2024", endDate: "31/03/2025" },
  { id: "4", name: "Processos de Vendas", client: "Serviços JKL", phase: "Acompanhamento", progress: 90, status: "green", responsible: "João Costa", startDate: "01/08/2024", endDate: "31/12/2024" },
];

const statusColors = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const phaseColors: Record<string, string> = {
  "Diagnóstico": "bg-blue-100 text-blue-700",
  "Quick wins": "bg-purple-100 text-purple-700",
  "Estruturação": "bg-orange-100 text-orange-700",
  "Acompanhamento": "bg-green-100 text-green-700",
};

export default function Projetos() {
  const [search, setSearch] = useState("");

  const filteredProjects = mockProjects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projetos</h1>
          <p className="text-muted-foreground">Acompanhe todos os projetos de consultoria</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar projeto ou cliente..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={phaseColors[project.phase] || "bg-muted"} variant="outline">
                  {project.phase}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Responsável</span>
                <span>{project.responsible}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{project.startDate}</span>
                <span>→</span>
                <span>{project.endDate}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
