import { AlertTriangle, CheckCircle2, Circle, GripVertical, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseTaskDate } from "@/lib/tasks/dates";
import type { Task } from "@/types";
import { useDraggable } from "@dnd-kit/core";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/constants";
import { getTaskRiskSignal } from "@/lib/tasks/risk";

const priorityConfig: Record<Task["priority"], { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-blue-100 text-blue-700" },
  medium: { label: TASK_PRIORITY_LABELS.medium, className: "bg-slate-100 text-slate-700" },
  high: { label: "Alta", className: "bg-amber-100 text-amber-800" },
  urgent: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

interface TaskCardProps {
  task: Task;
  saving?: boolean;
  onClick: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}

export function TaskCard({ task, saving = false, onClick, onDelete, onToggleComplete }: TaskCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({ id: task.id, disabled: saving });
  const completed = task.status === "done";
  const dueDate = parseTaskDate(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = Boolean(!completed && dueDate && dueDate < today);
  const priority = priorityConfig[task.priority];
  const risk = getTaskRiskSignal(task);

  return (
    <Card
      ref={setNodeRef}
      aria-busy={saving}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`group cursor-grab touch-none select-none transition-shadow hover:shadow-md active:cursor-grabbing ${saving ? "pointer-events-none opacity-70" : ""} ${isDragging ? "z-50 opacity-60 shadow-lg" : ""}`}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" disabled={saving} className="h-8 w-8 shrink-0 rounded-full focus-visible:ring-2" aria-label={completed ? "Reabrir tarefa" : "Marcar como concluída"} aria-pressed={completed} onClick={(event) => { event.stopPropagation(); onToggleComplete(); }} onPointerDown={(event) => event.stopPropagation()}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : completed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{completed ? "Reabrir tarefa" : "Marcar como concluída"}</TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`line-clamp-2 text-sm font-medium ${completed ? "text-muted-foreground line-through opacity-70" : ""}`}>{task.title}</h3>
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100" aria-hidden="true" />
            </div>
            {task.clientName && <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{task.clientName}</p>}
            {task.projectName && <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className={priority.className}>{priority.label}</Badge>
          {risk.atRisk ? <Badge variant="outline" className={risk.staleBlock ? "border-red-300 bg-red-50 text-red-800" : "border-orange-300 bg-orange-50 text-orange-800"}>Em risco{typeof risk.blockedDays === "number" ? ` · ${risk.blockedDays}d` : ""}</Badge> : null}
          <span className="truncate text-muted-foreground">{task.responsible || "Sem responsável"}</span>
        </div>
        {task.status === "blocked" && task.blockReason ? <p className="rounded-md bg-orange-50 p-2 text-xs text-orange-900"><strong>Bloqueio:</strong> {task.blockReason}</p> : null}

        <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs">
          <span className={overdue ? "flex items-center gap-1 font-medium text-destructive" : "text-muted-foreground"}>
            {overdue && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
            {task.dueDate ? `Prazo: ${dueDate?.toLocaleDateString("pt-BR") || task.dueDate}` : "Sem prazo"}
            {overdue && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">Atrasada</Badge>}
          </span>
          <Button type="button" variant="ghost" size="icon" disabled={saving} className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={`Excluir tarefa ${task.title}`} onClick={(event) => { event.stopPropagation(); onDelete(); }} onPointerDown={(event) => event.stopPropagation()}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
