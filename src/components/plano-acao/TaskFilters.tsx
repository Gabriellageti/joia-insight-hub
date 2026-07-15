import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { TaskFilterValues } from "@/lib/tasks/filters";
export type { TaskFilterValues } from "@/lib/tasks/filters";

interface TaskFiltersProps {
  projects: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
  values: TaskFilterValues;
  onChange: (values: TaskFilterValues) => void;
  onClear: () => void;
}

export function TaskFilters({ projects, assignees, values, onChange, onClear }: TaskFiltersProps) {
  const setValue = (field: keyof TaskFilterValues, value: string | boolean) => onChange({ ...values, [field]: value });
  const hasFilters = values.search || values.projectId !== "all" || values.status !== "all" || values.priority !== "all" || values.assignedTo !== "all" || values.taskType !== "all" || values.overdue;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4" />Filtros</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Buscar por título" className="pl-9" placeholder="Buscar por título" value={values.search} onChange={(event) => setValue("search", event.target.value)} />
        </div>
        <Select value={values.projectId} onValueChange={(value) => setValue("projectId", value)}><SelectTrigger aria-label="Filtrar por projeto"><SelectValue placeholder="Projeto" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os projetos</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
        <Select value={values.status} onValueChange={(value) => setValue("status", value)}><SelectTrigger aria-label="Filtrar por status"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="backlog">Backlog</SelectItem><SelectItem value="next">Próximas</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="waiting">Aguardando</SelectItem><SelectItem value="review">Em revisão</SelectItem><SelectItem value="done">Concluídas</SelectItem></SelectContent></Select>
        <Select value={values.priority} onValueChange={(value) => setValue("priority", value)}><SelectTrigger aria-label="Filtrar por prioridade"><SelectValue placeholder="Prioridade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as prioridades</SelectItem><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Normal</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent></Select>
        <Select value={values.assignedTo} onValueChange={(value) => setValue("assignedTo", value)}><SelectTrigger aria-label="Filtrar por responsável"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{assignees.map((assignee) => <SelectItem key={assignee.id} value={assignee.id}>{assignee.name}</SelectItem>)}</SelectContent></Select>
        <Select value={values.taskType} onValueChange={(value) => setValue("taskType", value)}><SelectTrigger aria-label="Filtrar por tipo"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="personal">Pessoais</SelectItem><SelectItem value="project">De projeto</SelectItem></SelectContent></Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Checkbox id="overdue-filter" checked={values.overdue} onCheckedChange={(checked) => setValue("overdue", checked === true)} /><Label htmlFor="overdue-filter">Somente atrasadas</Label></div>
        {hasFilters && <Button variant="ghost" size="sm" onClick={onClear}><X className="mr-1 h-4 w-4" />Limpar filtros</Button>}
      </div>
    </div>
  );
}
