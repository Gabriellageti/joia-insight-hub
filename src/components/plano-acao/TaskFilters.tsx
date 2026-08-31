import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { TaskFilterValues } from "@/lib/tasks/filters";
export type { TaskFilterValues } from "@/lib/tasks/filters";

interface TaskFiltersProps {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  assignees: { id: string; name: string }[];
  values: TaskFilterValues;
  onChange: (values: TaskFilterValues) => void;
  onClear: () => void;
}

export function TaskFilters({ clients, projects, assignees, values, onChange, onClear }: TaskFiltersProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const setValue = (field: keyof TaskFilterValues, value: string | boolean) => onChange({ ...values, [field]: value });
  const visibleProjects = values.clientId === "all" ? projects : projects.filter((project) => project.clientId === values.clientId);
  const hasFilters = values.search || values.clientId !== "all" || values.projectId !== "all" || values.status !== "all" || values.priority !== "all" || values.assignedTo !== "all" || values.taskType !== "all" || values.due !== "all" || values.mine;

  const content = (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4" />Filtros</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Buscar por título" className="pl-9" placeholder="Buscar por título" value={values.search} onChange={(event) => setValue("search", event.target.value)} />
        </div>
        <Select value={values.clientId} onValueChange={(value) => onChange({ ...values, clientId: value, projectId: value === "all" || projects.some((project) => project.id === values.projectId && project.clientId === value) ? values.projectId : "all" })}><SelectTrigger aria-label="Filtrar por cliente"><SelectValue placeholder="Cliente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select>
        <Select value={values.projectId} onValueChange={(value) => setValue("projectId", value)}><SelectTrigger aria-label="Filtrar por projeto"><SelectValue placeholder="Projeto" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os projetos</SelectItem>{visibleProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
        <Select value={values.status} onValueChange={(value) => setValue("status", value)}><SelectTrigger aria-label="Filtrar por status"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="not_started">Não iniciadas</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="waiting">Aguardando</SelectItem><SelectItem value="blocked">Bloqueadas</SelectItem><SelectItem value="done">Concluídas</SelectItem></SelectContent></Select>
        <Select value={values.priority} onValueChange={(value) => setValue("priority", value)}><SelectTrigger aria-label="Filtrar por prioridade"><SelectValue placeholder="Prioridade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as prioridades</SelectItem><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent></Select>
        <Select value={values.assignedTo} onValueChange={(value) => setValue("assignedTo", value)}><SelectTrigger aria-label="Filtrar por responsável"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{assignees.map((assignee) => <SelectItem key={assignee.id} value={assignee.id}>{assignee.name}</SelectItem>)}</SelectContent></Select>
        <Select value={values.due} onValueChange={(value: TaskFilterValues["due"]) => setValue("due", value)}><SelectTrigger aria-label="Filtrar por prazo"><SelectValue placeholder="Prazo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os prazos</SelectItem><SelectItem value="today">Hoje</SelectItem><SelectItem value="overdue">Atrasadas</SelectItem><SelectItem value="next_7_days">Próximos 7 dias</SelectItem><SelectItem value="no_due">Sem prazo</SelectItem></SelectContent></Select>
        <Select value={values.taskType} onValueChange={(value) => setValue("taskType", value)}><SelectTrigger aria-label="Filtrar por tipo"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="personal">Pessoais</SelectItem><SelectItem value="client">De cliente</SelectItem><SelectItem value="project">De projeto</SelectItem></SelectContent></Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant={values.mine ? "secondary" : "outline"} size="sm" onClick={() => setValue("mine", !values.mine)}>Minhas tarefas</Button>
        {hasFilters && <Button variant="ghost" size="sm" onClick={onClear}><X className="mr-1 h-4 w-4" />Limpar filtros</Button>}
      </div>
    </div>
  );
  if (!isMobile) return content;
  return <div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => setOpen(true)}><Filter className="h-4 w-4" />Filtros{hasFilters ? " ativos" : ""}</Button>{hasFilters ? <Button variant="ghost" onClick={onClear}>Limpar filtros</Button> : null}<Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Filtros de tarefas</DialogTitle><DialogDescription>Refine a mesma lista e o mesmo Kanban.</DialogDescription></DialogHeader>{content}<Button onClick={() => setOpen(false)}>Ver resultados</Button></DialogContent></Dialog></div>;
}
