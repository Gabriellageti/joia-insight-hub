import { ArrowDown, ArrowUp, Check, Clock3, ExternalLink, Focus, Pause, Play, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/tasks/constants";
import { daysOverdue } from "@/lib/my-day";
import { parseTaskDate } from "@/lib/tasks/dates";
import type { Task } from "@/types";

interface MyDayTaskItemProps {
  task: Task;
  focused?: boolean;
  saving?: boolean;
  quickActions?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onOpen: () => void;
  onStatus: (status: Task["status"]) => void;
  onToggleFocus?: () => void;
  onMoveFocus?: (direction: -1 | 1) => void;
}

const priorityClass: Record<Task["priority"], string> = {
  low: "border-blue-200 bg-blue-50 text-blue-700",
  medium: "border-slate-200 bg-slate-50 text-slate-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

export function MyDayTaskItem({ task, focused, saving, quickActions, canMoveUp, canMoveDown, onOpen, onStatus, onToggleFocus, onMoveFocus }: MyDayTaskItemProps) {
  const overdue = daysOverdue(task);
  const due = parseTaskDate(task.dueDate);
  return (
    <Card data-testid={`my-day-task-${task.id}`} className={focused ? "border-primary/40 bg-primary/[0.03]" : ""}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <button type="button" className="min-w-0 flex-1 text-left focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onOpen}>
            <div className="flex flex-wrap items-center gap-2">
              {focused ? <Focus className="h-4 w-4 text-primary" aria-label="Foco de hoje" /> : null}
              <span className="font-medium">{task.title}</span>
              <Badge variant="outline" className={priorityClass[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
              <Badge variant="outline">{TASK_STATUS_LABELS[task.status]}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{[task.clientName, task.projectName].filter(Boolean).join(" · ") || "Tarefa pessoal"}</p>
            <p className={overdue ? "mt-2 text-xs font-medium text-destructive" : "mt-2 text-xs text-muted-foreground"}>
              {overdue ? `Atrasada há ${overdue} ${overdue === 1 ? "dia" : "dias"}` : due ? `Prazo ${due.toLocaleDateString("pt-BR")}` : "Sem prazo"}
              {task.responsible ? ` · ${task.responsible}` : ""}
            </p>
          </button>

          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {onToggleFocus ? <Button type="button" size="sm" variant={focused ? "secondary" : "ghost"} disabled={saving} onClick={onToggleFocus}><Focus className="mr-1 h-4 w-4" />{focused ? "Remover foco" : "Foco"}</Button> : null}
            {focused && onMoveFocus ? <>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!canMoveUp || saving} onClick={() => onMoveFocus(-1)} aria-label={`Mover ${task.title} para cima`}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!canMoveDown || saving} onClick={() => onMoveFocus(1)} aria-label={`Mover ${task.title} para baixo`}><ArrowDown className="h-4 w-4" /></Button>
            </> : null}
            {quickActions ? <>
              <Button type="button" size="sm" variant="outline" disabled={saving || task.status === "in_progress"} onClick={() => onStatus("in_progress")}><Play className="mr-1 h-4 w-4" />Iniciar</Button>
              <Button type="button" size="sm" variant="outline" disabled={saving || task.status === "done"} onClick={() => onStatus("done")}><Check className="mr-1 h-4 w-4" />Concluir</Button>
            </> : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="outline" disabled={saving}><Clock3 className="mr-1 h-4 w-4" />Status</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onStatus("in_progress")}><Play className="mr-2 h-4 w-4" />Iniciar</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onStatus("waiting")}><Pause className="mr-2 h-4 w-4" />Aguardar</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onStatus("blocked")}><ShieldAlert className="mr-2 h-4 w-4" />Bloquear</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onStatus("done")}><Check className="mr-2 h-4 w-4" />Concluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onOpen} aria-label={`Abrir tarefa ${task.title}`}><ExternalLink className="h-4 w-4" /></Button>
          </div>
        </div>
        {quickActions ? <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" disabled={saving || task.status === "waiting"} onClick={() => onStatus("waiting")}><Pause className="mr-1 h-4 w-4" />Aguardar</Button>
          <Button type="button" size="sm" variant="ghost" disabled={saving || task.status === "blocked"} onClick={() => onStatus("blocked")}><ShieldAlert className="mr-1 h-4 w-4" />Bloquear</Button>
        </div> : null}
      </CardContent>
    </Card>
  );
}
