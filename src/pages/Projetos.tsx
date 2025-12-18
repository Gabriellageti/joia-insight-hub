import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useData } from "@/contexts/DataContext";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { Project } from "@/types";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const statusColors = { green: "bg-green-500", yellow: "bg-yellow-500", red: "bg-red-500" };
const phaseColors: Record<string, string> = { "Diagnóstico": "bg-blue-100 text-blue-700", "Quick wins": "bg-purple-100 text-purple-700", "Estruturação": "bg-orange-100 text-orange-700", "Acompanhamento": "bg-green-100 text-green-700" };

export default function Projetos() {
  const { projects, deleteProject } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase()));
  const handleDelete = () => { if (deleteId) { deleteProject(deleteId); toast.success("Projeto excluído"); setDeleteId(null); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Projetos</h1><p className="text-muted-foreground">Acompanhe todos os projetos de consultoria</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingProject(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Projeto</Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar projeto ou cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div><h3 className="font-semibold">{project.name}</h3><p className="text-sm text-muted-foreground">{project.clientName}</p></div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { setEditingProject(project); setDialogOpen(true); }}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem onClick={() => setDeleteId(project.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className={phaseColors[project.phase] || "bg-muted"} variant="outline">{project.phase}</Badge>
              <div className="space-y-1"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><span className="font-medium">{project.progress}%</span></div><Progress value={project.progress} className="h-2" /></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Responsável</span><span>{project.responsible}</span></div>
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{project.startDate}</span><span>→</span><span>{project.endDate}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editingProject} />
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este projeto?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
