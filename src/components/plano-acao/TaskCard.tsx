import { FileText, CheckCircle2, Trash2, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDelete: () => void;
  onComplete?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function TaskCard({
  task,
  onClick,
  onDelete,
  onComplete,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const navigate = useNavigate();
  const hasDiagnostic = Boolean(task.sourceDiagnosticId);
  const isCompleted = task.status === "done";

  const handleViewReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.sourceDiagnosticId) {
      navigate(`/diagnosticos/${task.sourceDiagnosticId}`);
    }
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete?.();
  };

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header com título e ações */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge className={priorityColors[task.priority]} variant="outline">
              {priorityLabels[task.priority]}
            </Badge>
          </div>
        </div>

        {/* Informações do projeto/cliente */}
        <div className="text-xs text-muted-foreground">
          <p className="truncate">{task.projectName}</p>
          <p className="truncate">{task.clientName}</p>
        </div>

        {/* Responsável e impacto */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground truncate max-w-[120px]">
            {task.responsible}
          </span>
          {task.impact && (
            <span className="font-medium text-accent">{task.impact}</span>
          )}
        </div>

        {/* Tipo e data */}
        <div className="flex items-center justify-between text-xs">
          <Badge variant="outline" className="capitalize">
            {task.type}
          </Badge>
          <span className="text-muted-foreground">{task.dueDate}</span>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            {/* Botão Ver Relatório - só aparece se tiver diagnóstico vinculado */}
            {hasDiagnostic && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleViewReport}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Relatório
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ver relatório do diagnóstico</TooltipContent>
              </Tooltip>
            )}

            {/* Botão Concluir - só aparece se não estiver concluído */}
            {!isCompleted && onComplete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={handleComplete}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Concluir
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marcar tarefa como concluída</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Botão excluir */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label="Excluir tarefa"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir tarefa</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
