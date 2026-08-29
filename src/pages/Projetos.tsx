import { useCallback, useMemo, useState } from "react";
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
import { isPastDate } from "@/lib/dates";
import { getProjectTypeLabel } from "@/lib/project-delivery";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors = { green: "bg-green-500", yellow: "bg-yellow-500", red: "bg-red-500" };
const phaseColors: Record<string, string> = { "Diagnóstico": "bg-blue-100 text-blue-700", "Quick wins": "bg-purple-100 text-purple-700", "Estruturação": "bg-orange-100 text-orange-700", "Acompanhamento": "bg-green-100 text-green-700", "Cultura e treinamento": "bg-teal-100 text-teal-700" };
const getInitials = (value?: string) => value?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "--";
type ProjectView = "all" | "active" | "attention" | "no_next_action" | "closed";

const projectIsClosed = (project: Project) => project.phase === "Encerramento" || project.progress >= 100;
const isAttentionProject = (project: Project) => {
  const forecastEndDate = project.forecastEndDate || project.endDate || "";
  return project.status !== "green" || Boolean(forecastEndDate && isPastDate(forecastEndDate));
};

export default function Projetos() {
  const navigate = useNavigate();
  const { projects, deleteProject, tasks } = useData();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ProjectView>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");

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

  const matchesView = useCallback((project: Project, targetView: ProjectView) => {
    if (targetView === "all") return true;
    if (targetView === "closed") return projectIsClosed(project);
    if (targetView === "active") return !projectIsClosed(project);
    if (targetView === "attention") return !projectIsClosed(project) && isAttentionProject(project);
    return !projectIsClosed(project) && !projectHasPendingAction.has(project.id);
  }, [projectHasPendingAction]);

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) || project.clientName.toLowerCase().includes(search.toLowerCase());
    return matchesSearch
      && matchesView(project, view)
      && (statusFilter === "all" || project.status === statusFilter)
      && (phaseFilter === "all" || project.phase === phaseFilter);
  }), [matchesView, phaseFilter, projects, search, statusFilter, view]);

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
  const handleDelete = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      await deleteProject(deleteId);
      toast.success("Projeto excluído");
      setDeleteId(null);
    } catch {
      // DataContext reports the persistence error and keeps the project visible.
    } finally {
      setDeleting(false);
    }
  };

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
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" />Filtros</Button></PopoverTrigger>
          <PopoverContent align="end" className="space-y-4">
            <div className="space-y-2"><Label>Status</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="green">No prazo</SelectItem><SelectItem value="yellow">Atenção</SelectItem><SelectItem value="red">Crítico</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Fase</Label><Select value={phaseFilter} onValueChange={setPhaseFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{Object.keys(phaseColors).map((phase) => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}</SelectContent></Select></div>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setStatusFilter("all"); setPhaseFilter("all"); }}>Limpar filtros</Button>
          </PopoverContent>
        </Popover>
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
          <div className="divide-y">
        {filteredProjects.map((project) => {
          const forecastEndDate = project.forecastEndDate || project.endDate || "";
          const overdue = forecastEndDate ? isPastDate(forecastEndDate) : false;
          const completed = projectIsClosed(project);
          const nextAction = nextActionByProject.get(project.id);
          const responsibleName = project.responsible || project.responsibleNameLegacy || "Responsável pendente";
          return <div key={project.id} role="button" tabIndex={0} className="group cursor-pointer p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" onClick={() => navigate(`/projetos/${project.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/projetos/${project.id}`); }}>
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_minmax(220px,1.5fr)_minmax(170px,0.8fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-start gap-2"><div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${completed ? "bg-emerald-500" : statusColors[project.status]}`} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{project.name}</p>{completed && <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Concluído</Badge>}</div><p className="truncate text-xs text-muted-foreground">{project.clientName || "Projeto interno"} · {getProjectTypeLabel(project.projectType)}</p><Badge className={`mt-2 ${phaseColors[project.phase] || "bg-muted text-muted-foreground"}`} variant="outline">{project.phase}</Badge></div></div>
              <div className="min-w-0 border-l-0 lg:border-l lg:pl-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Próxima ação</p>{completed ? <span className="mt-1 block text-sm text-emerald-700">Nenhuma ação pendente</span> : nextAction ? <div className="mt-1"><p className="truncate text-sm font-medium">{nextAction.title}</p><p className="truncate text-xs text-muted-foreground">{nextAction.responsible || "Responsável pendente"}{nextAction.dueDate ? ` · ${nextAction.dueDate}` : " · Sem prazo"}</p></div> : <span className="mt-1 block text-sm text-amber-700">Sem próxima ação</span>}</div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1"><div className="flex min-w-0 items-center gap-2"><Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-primary/10 text-primary">{getInitials(responsibleName)}</AvatarFallback></Avatar><span className="truncate">{responsibleName}</span></div><div className="text-muted-foreground">{forecastEndDate ? <span className={overdue ? "font-medium text-destructive" : ""}>{forecastEndDate}{overdue ? " · Atrasado" : ""}</span> : "Sem previsão"}</div></div>
              <div className="flex items-center gap-3 lg:justify-end"><TooltipProvider><Tooltip><TooltipTrigger asChild><div className="w-20 space-y-1"><span className="text-xs">{Math.round(project.progress)}%</span><Progress value={project.progress} className="h-1.5" /></div></TooltipTrigger><TooltipContent><p>Calculado por tarefas, entregáveis e fases</p></TooltipContent></Tooltip></TooltipProvider><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(event) => event.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={(event) => { event.stopPropagation(); setEditingProject(project); setDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem><DropdownMenuItem onClick={(event) => { event.stopPropagation(); setDeleteId(project.id); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
            </div>
          </div>;
        })}
          </div>
        </CardContent>
      </Card>
      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editingProject} />
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleting) setDeleteId(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este projeto?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void handleDelete()} disabled={deleting}>{deleting ? "Excluindo..." : "Excluir"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
