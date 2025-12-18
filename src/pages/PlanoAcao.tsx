import { useState } from "react";
import { Plus, List, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Task {
  id: string;
  title: string;
  project: string;
  client: string;
  type: string;
  responsible: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  impact: string;
}

const columns = [
  { id: "backlog", title: "Backlog", tasks: [] as Task[] },
  { id: "next", title: "Próximas", tasks: [] as Task[] },
  { id: "in_progress", title: "Em Andamento", tasks: [] as Task[] },
  { id: "validation", title: "Em Validação", tasks: [] as Task[] },
  { id: "done", title: "Concluídas", tasks: [] as Task[] },
];

const mockTasks: Task[] = [
  { id: "1", title: "Mapear fornecedores críticos", project: "Otimização de Compras", client: "Empresa ABC", type: "processo", responsible: "Ana Silva", priority: "high", dueDate: "20/12/2024", impact: "R$ 15.000" },
  { id: "2", title: "Implantar curva ABC", project: "Gestão de Estoque", client: "Indústria XYZ", type: "processo", responsible: "Carlos Santos", priority: "medium", dueDate: "22/12/2024", impact: "R$ 8.000" },
  { id: "3", title: "Treinar equipe de compras", project: "Otimização de Compras", client: "Empresa ABC", type: "treinamento", responsible: "Maria Oliveira", priority: "low", dueDate: "28/12/2024", impact: "R$ 5.000" },
  { id: "4", title: "Configurar dashboard financeiro", project: "Controle Financeiro", client: "Comércio 123", type: "tecnologia", responsible: "João Costa", priority: "high", dueDate: "19/12/2024", impact: "R$ 12.000" },
];

const tasksByColumn = {
  backlog: mockTasks.filter((_, i) => i === 0),
  next: mockTasks.filter((_, i) => i === 1),
  in_progress: mockTasks.filter((_, i) => i === 2),
  validation: mockTasks.filter((_, i) => i === 3),
  done: [],
};

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm">{task.title}</h4>
          <Badge className={priorityColors[task.priority]} variant="outline">
            {priorityLabels[task.priority]}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>{task.project}</p>
          <p>{task.client}</p>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{task.responsible}</span>
          <span className="font-medium text-accent">{task.impact}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <Badge variant="outline">{task.type}</Badge>
          <span className="text-muted-foreground">{task.dueDate}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlanoAcao() {
  const [view, setView] = useState<"kanban" | "list">("kanban");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Plano de Ação</h1>
          <p className="text-muted-foreground">Gerencie tarefas e ações dos projetos</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
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
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-72">
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {column.title}
                    <Badge variant="outline">{(tasksByColumn as any)[column.id]?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 min-h-[200px]">
                  {(tasksByColumn as any)[column.id]?.map((task: Task) => (
                    <TaskCard key={task.id} task={task} />
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
              Visualização 5W2H em desenvolvimento...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
