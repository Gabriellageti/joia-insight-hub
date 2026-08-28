
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Circle, Clock, Ban, Play, ExternalLink } from "lucide-react";
import type { Task } from "@/types";

interface ProjectTasksSummaryProps {
  tasks: Task[];
  projectId: string;
}

const statusConfig = {
  not_started: { label: "Não iniciadas", icon: Circle, color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em andamento", icon: Play, color: "bg-amber-100 text-amber-700" },
  waiting: { label: "Aguardando", icon: Clock, color: "bg-orange-100 text-orange-700" },
  blocked: { label: "Bloqueadas", icon: Ban, color: "bg-red-100 text-red-700" },
  done: { label: "Concluídas", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
};

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
  urgent: "bg-red-200 text-red-900",
};

export function ProjectTasksSummary({ tasks, projectId }: ProjectTasksSummaryProps) {
  const navigate = useNavigate();

  const tasksByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      not_started: 0,
      in_progress: 0,
      waiting: 0,
      blocked: 0,
      done: 0,
    };

    tasks.forEach((task) => {
      if (counts[task.status] !== undefined) {
        counts[task.status]++;
      }
    });

    return counts;
  }, [tasks]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        const priorityOrder: Record<Task["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Resumo de Tarefas</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => navigate(`/plano-acao?projectId=${projectId}`)}
        >
          Ver todas
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/plano-acao?view=consulting&projectId=${projectId}`)}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Abrir planejamento por dia
        </Button>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = tasksByStatus[status] || 0;
            return (
              <Badge key={status} variant="outline" className={`${config.color} gap-1`}>
                <Icon className="h-3 w-3" />
                {config.label}: {count}
              </Badge>
            );
          })}
        </div>

        {recentTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Tarefas prioritárias:</p>
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-border p-2 text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      task.priority === "high"
                        ? "bg-red-500"
                        : task.priority === "medium"
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                  />
                  <span className="truncate">{task.title}</span>
                </div>
                <Badge variant="outline" className={priorityColors[task.priority]}>
                  {statusConfig[task.status]?.label || task.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
