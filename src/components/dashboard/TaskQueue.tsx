import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, FileWarning } from "lucide-react";

interface Task {
  id: string;
  title: string;
  type: "overdue" | "meeting" | "evidence";
  client?: string;
  time?: string;
}

const mockTasks: Task[] = [
  { id: "1", title: "Análise de fornecedores", type: "overdue", client: "Empresa ABC" },
  { id: "2", title: "Reunião de alinhamento", type: "meeting", client: "Indústria XYZ", time: "14:00" },
  { id: "3", title: "Anexar evidência de saving", type: "evidence", client: "Comércio 123" },
  { id: "4", title: "Review do diagnóstico", type: "meeting", client: "Serviços JKL", time: "16:30" },
];

const typeConfig = {
  overdue: { icon: AlertCircle, label: "Atrasada", color: "bg-destructive text-destructive-foreground" },
  meeting: { icon: Calendar, label: "Hoje", color: "bg-accent text-accent-foreground" },
  evidence: { icon: FileWarning, label: "Pendente", color: "bg-muted text-muted-foreground" },
};

export function TaskQueue() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fila do Dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockTasks.map((task) => {
          const config = typeConfig[task.type];
          const Icon = config.icon;
          
          return (
            <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className={`p-1.5 rounded ${config.color}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.client}</p>
              </div>
              {task.time && (
                <Badge variant="outline" className="text-xs">{task.time}</Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
