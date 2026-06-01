import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors = { green: "bg-green-500", yellow: "bg-yellow-500", red: "bg-red-500" };
const phaseColors: Record<string, string> = { "Diagnóstico": "bg-blue-100 text-blue-700", "Quick wins": "bg-purple-100 text-purple-700", "Estruturação": "bg-orange-100 text-orange-700", "Acompanhamento": "bg-green-100 text-green-700", "Cultura e treinamento": "bg-teal-100 text-teal-700" };
const getInitials = (value?: string) => value?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "--";

export default function Projetos() {
  const navigate = useNavigate();
  const { projects, deleteProject } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const phaseOptions = Array.from(new Set(projects.map((project) => project.phase).filter(Boolean))).sort();
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesPhase = phaseFilter === "all" || p.phase === phaseFilter;
    return matchesSearch && matchesStatus && matchesPhase;
  });
  const handleDelete = () => { if (deleteId) { deleteProject(deleteId); toast.success("Projeto excluído"); setDeleteId(null); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Projetos</h1><p className="text-muted-foreground">Acompanhe todos os projetos de consultoria</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingProject(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Projeto</Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar projeto ou cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="green">Verde</SelectItem>
            <SelectItem value="yellow">Atenção</SelectItem>
            <SelectItem value="red">Risco</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas fases</SelectItem>
            {phaseOptions.map((phase) => (
              <SelectItem key={phase} value={phase}>
                {phase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const forecastEndDate = project.forecastEndDate || project.endDate || "";
          const overdue = forecastEndDate ? isPastDate(forecastEndDate) : false;
          const responsibleName = project.responsible || project.responsibleNameLegacy || "Responsável pendente";
          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projetos/${project.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div><h3 className="font-semibold">{project.name}</h3><p className="text-sm text-muted-foreground">{project.clientName}</p></div>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingProject(project); setDialogOpen(true); }}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                    <span className="text-foreground">{project.statusReason || "Status automático"}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {project.statusSource === "manual" ? "Status manual" : "Status automático"}
                  </Badge>
                </div>
                <Badge className={phaseColors[project.phase] || "bg-muted"} variant="outline">{project.phase}</Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="space-y-1 cursor-help">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{Math.round(project.progress)}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Calculado por tarefas, entregáveis e fases</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Responsável</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">{getInitials(responsibleName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-sm font-medium text-foreground">{responsibleName}</span>
                      {!project.responsibleUserId && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto px-0 text-xs"
                          onClick={() => { setEditingProject(project); setDialogOpen(true); }}
                        >
                          Vincular responsável
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{project.startDate || "Sem início"}</span>
                  <span>→</span>
                  <div className="flex items-center gap-2">
                    <span>{forecastEndDate || "Sem previsão"}</span>
                    {overdue && <Badge variant="destructive">Atrasado</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editingProject} />
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este projeto?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
