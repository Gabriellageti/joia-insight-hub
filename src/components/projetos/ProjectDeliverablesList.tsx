import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package } from "lucide-react";
import type { ProjectDeliverable } from "@/types";

interface ProjectDeliverablesListProps {
  deliverables: ProjectDeliverable[];
}

const statusLabels = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluído",
};

export function ProjectDeliverablesList({ deliverables }: ProjectDeliverablesListProps) {
  const stats = useMemo(() => {
    const total = deliverables.length;
    const completed = deliverables.filter((d) => d.status === "done").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [deliverables]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Entregáveis do Projeto</CardTitle>
          {stats.total > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {stats.completed} de {stats.total}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deliverables.length === 0 ? (
          <div className="text-center py-6">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum entregável definido para este projeto.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso dos entregáveis</span>
                <span className="font-medium">{stats.percentage}%</span>
              </div>
              <Progress value={stats.percentage} className="h-2" />
            </div>

            <div className="space-y-2">
              {deliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Checkbox
                    checked={deliverable.status === "done"}
                    disabled
                    aria-label={deliverable.title}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        deliverable.status === "done" ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {deliverable.title}
                    </p>
                    {deliverable.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Prazo: {deliverable.dueDate}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      deliverable.status === "done"
                        ? "bg-green-100 text-green-700"
                        : deliverable.status === "in_progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {statusLabels[deliverable.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
