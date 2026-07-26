import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, CheckCircle2, AlertTriangle, ListTodo, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useData } from "@/contexts/DataContext";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { Project } from "@/types";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isPastDate } from "@/lib/dates";
import { getProjectTypeLabel } from "@/lib/project-delivery";

const statusColors = { green: "bg-green-500", yellow: "bg-yellow-500", red: "bg-red-500" };
const phaseColors: Record<string, string> = { "Diagnóstico": "bg-blue-100 text-blue-700", "Quick wins": "bg-purple-100 text-purple-700", "Estruturação": "bg-orange-100 text-orange-700", "Acompanhamento": "bg-green-100 text-green-700", "Cultura e treinamento": "bg-teal-100 text-teal-700" };
const getInitials = (value?: string) => value?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "--";
type ProjectView = "all" | "active" | "attention" | "no_next_action" | "closed";

const projectIsClosed = (project: Project) => project.phase === "Encerramento" || project.progress >= 100;

export default function Projetos() {
  const navigate = useNavigate();
  const { projects, deleteProject, tasks } = useData();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ProjectView>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const projectHasPendingAction = useMemo(() => new Set(
    tasks
      .filter((task) => task.status !== "done")
      .map((task) => task.projectId)
  ), [tasks]);

  const nextActionByProject = useMemo(() => {
    const nextActions = new Map<string, typeof tasks[number]>();

    tasks
      .filter((task) => task.status !== "done")
      .sort((first, second) => {
        if (!first.dueDate) return 1;
        if (!second.dueDate) return -1;
        return first.dueDate.localeCompare(second.dueDate);
      })
      .forEach((task) => {
        if (!nextActions.has(task.projectId)) nextActions.set(task.projectId, task);
      });

    return nextActions;
  }, [tasks]);

  const isAttentionProject = (project: Project) => {
    const forecastEndDate = project.forecastEndDate || project.endDate || "";
    return project.status !== "green" || Boolean(forecastEndDate && isPastDate(forecastEndDate));
  };

  const matchesView = (project: Project, targetView: ProjectView) => {
    if (targetView === "all") return true;
    if (targetView === "closed") return projectIsClosed(project);
    if (targetView === "active") return !projectIsClosed(project);
    if (targetView === "attention") return !projectIsClosed(project) && isAttentionProject(project);
    return !projectIsClosed(project) && !projectHasPendingAction.has(project.id);
  };

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) || project.clientName.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesView(project, view);
  }), [projects, search, view, projectHasPendingAction]);

  const viewOptions: { value: ProjectView; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Em andamento" },
    { value: "attention", label: "Precisa de atenção" },
    { value: "no_next_action", label: "Sem próxima ação" },
    { value: "closed", label: "Encerrados" },
  ];
  const managementViews: { value: ProjectView; label: string; icon: typeof PlayCircle; className: string }[] = [
    { value: "active", label: "Em andamento", icon: PlayCircle, className: "text-blue-600" },
    { value: "attention", label: "Precisa de atenção", icon: AlertTriangle, className: "text-amber-600" },
    { value: "no_next_action", label: "Sem próxima ação", icon: ListTodo, className: "text-violet-600" },
    { value: "closed", label: "Concluídos", icon: CheckCircle2, className: "text-emerald-600" },
  ];
  const handleDelete = () => { if (deleteId) { deleteProject(deleteId); toast.success("Projeto excluído"); setDeleteId(null); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Projetos</h1><p className="text-muted-foreground">Acompanhe projetos de consultoria, desenvolvimento, IA e transformação digital</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingProject(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Projeto</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {managementViews.map((option) => {
          const Icon = option.icon;
          const count = projects.filter((project) => matchesView(project, option.value)).length;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              className={`rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-sm ${view === option.value ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{option.label}</span>
                <Icon className={`h-4 w-4 ${option.className}`} />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{count}</p>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar projeto ou cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtros rápidos de projetos">
          {viewOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={view === option.value ? "default" : "outline"}
              aria-pressed={view === option.value}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {filteredProjects.length} projeto{filteredProjects.length === 1 ? " encontrado" : "s encontrados"}
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Próxima ação</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
        {filteredProjects.map((project) => {
          const forecastEndDate = project.forecastEndDate || project.endDate || "";
          const overdue = forecastEndDate ? isPastDate(forecastEndDate) : false;
          const completed = projectIsClosed(project);
          const nextAction = nextActionByProject.get(project.id);
          const responsibleName = project.responsible || project.responsibleNameLegacy || "Responsável pendente";
          return <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projetos/${project.id}`)}>
            <TableCell className="min-w-[240px]"><div className="flex items-start gap-2"><div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${completed ? "bg-emerald-500" : statusColors[project.status]}`} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{project.name}</p>{completed && <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Concluído</Badge>}</div><p className="truncate text-xs text-muted-foreground">{project.clientName || "Projeto interno"} · {getProjectTypeLabel(project.projectType)}</p></div></div></TableCell>
            <TableCell><Badge className={phaseColors[project.phase] || "bg-muted text-muted-foreground"} variant="outline">{project.phase}</Badge></TableCell>
            <TableCell className="min-w-[220px]">{completed ? <span className="text-sm text-emerald-700">Nenhuma ação pendente</span> : nextAction ? <div><p className="max-w-[260px] truncate text-sm font-medium">{nextAction.title}</p><p className="text-xs text-muted-foreground">{nextAction.responsible || "Responsável pendente"}{nextAction.dueDate ? ` · ${nextAction.dueDate}` : " · Sem prazo"}</p></div> : <span className="text-sm text-amber-700">Sem próxima ação</span>}</TableCell>
            <TableCell><div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary">{getInitials(responsibleName)}</AvatarFallback></Avatar><span className="max-w-[140px] truncate text-sm">{responsibleName}</span></div></TableCell>
            <TableCell>{forecastEndDate ? <div className="flex items-center gap-2 text-sm"><span>{forecastEndDate}</span>{overdue && <Badge variant="destructive">Atrasado</Badge>}</div> : <span className="text-sm text-muted-foreground">Sem previsão</span>}</TableCell>
            <TableCell className="min-w-[110px]"><TooltipProvider><Tooltip><TooltipTrigger asChild><div className="space-y-1"><span className="text-xs">{Math.round(project.progress)}%</span><Progress value={project.progress} className="h-1.5" /></div></TooltipTrigger><TooltipContent><p>Calculado por tarefas, entregáveis e fases</p></TooltipContent></Tooltip></TooltipProvider></TableCell>
            <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(event) => event.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={(event) => { event.stopPropagation(); setEditingProject(project); setDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem><DropdownMenuItem onClick={(event) => { event.stopPropagation(); setDeleteId(project.id); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
          </TableRow>;
        })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editingProject} />
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este projeto?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
