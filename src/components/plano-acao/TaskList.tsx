import { useMemo, useState } from "react";
import { ArrowDownUp, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseTaskDate } from "@/lib/tasks/dates";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_ORDER, TASK_STATUS_LABELS } from "@/lib/tasks/constants";
import type { Task } from "@/types";
import { getTaskRiskSignal } from "@/lib/tasks/risk";

type SortKey = "dueDate" | "priority" | "client" | "project" | "responsible" | "status";

interface TaskListProps {
  tasks: Task[];
  savingTaskIds: string[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const compareText = (left?: string, right?: string) => (left || "").localeCompare(right || "", "pt-BR");

export function TaskList({ tasks, savingTaskIds, onEdit, onDelete, onToggleComplete }: TaskListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const savingIds = useMemo(() => new Set(savingTaskIds), [savingTaskIds]);
  const sortedTasks = useMemo(() => [...tasks].sort((left, right) => {
    if (sortKey === "priority") return TASK_PRIORITY_ORDER[left.priority] - TASK_PRIORITY_ORDER[right.priority];
    if (sortKey === "client") return compareText(left.clientName, right.clientName);
    if (sortKey === "project") return compareText(left.projectName, right.projectName);
    if (sortKey === "responsible") return compareText(left.responsible, right.responsible);
    if (sortKey === "status") return compareText(TASK_STATUS_LABELS[left.status], TASK_STATUS_LABELS[right.status]);
    return compareText(left.dueDate || "9999-12-31", right.dueDate || "9999-12-31");
  }), [sortKey, tasks]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <ArrowDownUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Select value={sortKey} onValueChange={(value: SortKey) => setSortKey(value)}>
          <SelectTrigger className="w-48" aria-label="Ordenar tarefas"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Prazo</SelectItem><SelectItem value="priority">Prioridade</SelectItem>
            <SelectItem value="client">Cliente</SelectItem><SelectItem value="project">Projeto</SelectItem>
            <SelectItem value="responsible">Responsável</SelectItem><SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[900px]">
          <TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Cliente</TableHead><TableHead>Projeto</TableHead><TableHead>Responsável</TableHead><TableHead>Prioridade</TableHead><TableHead>Prazo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const due = parseTaskDate(task.dueDate);
              const overdue = task.status !== "done" && Boolean(due && due < today);
              const saving = savingIds.has(task.id);
              const risk = getTaskRiskSignal(task);
              return (
                <TableRow key={task.id} className={overdue ? "bg-destructive/[0.035]" : undefined}>
                  <TableCell className="max-w-64 font-medium"><button type="button" className="line-clamp-2 text-left hover:text-primary" onClick={() => onEdit(task)}>{task.title}</button>{risk.atRisk ? <p className="mt-1 text-xs text-orange-700">{risk.reason}{typeof risk.blockedDays === "number" ? ` · ${risk.blockedDays} dia(s)` : ""}</p> : null}</TableCell>
                  <TableCell>{task.clientName || "—"}</TableCell><TableCell>{task.projectName || "—"}</TableCell><TableCell>{task.responsible || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{TASK_PRIORITY_LABELS[task.priority]}</Badge></TableCell>
                  <TableCell><div className="flex items-center gap-2"><span>{due?.toLocaleDateString("pt-BR") || "Sem prazo"}</span>{overdue && <Badge variant="destructive">Atrasada</Badge>}</div></TableCell>
                  <TableCell><div className="flex flex-wrap gap-1"><Badge variant="secondary">{TASK_STATUS_LABELS[task.status]}</Badge>{risk.atRisk ? <Badge variant="outline" className="border-orange-300 text-orange-800">Em risco</Badge> : null}</div></TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button type="button" size="icon" variant="ghost" disabled={saving} aria-label={`Editar ${task.title}`} onClick={() => onEdit(task)}><Pencil className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" disabled={saving} aria-label={task.status === "done" ? `Reabrir ${task.title}` : `Concluir ${task.title}`} onClick={() => onToggleComplete(task)}><CheckCircle2 className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" disabled={saving} className="text-muted-foreground hover:text-destructive" aria-label={`Excluir ${task.title}`} onClick={() => onDelete(task)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
