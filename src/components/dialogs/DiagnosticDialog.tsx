import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Diagnostic } from "@/types";
import { toast } from "sonner";

const templates = [
  { id: "1", name: "Diagnóstico Completo JoIA" },
  { id: "2", name: "Diagnóstico de Compras" },
  { id: "3", name: "Diagnóstico de Estoque" },
  { id: "4", name: "Diagnóstico Financeiro" },
];

interface DiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostic?: Diagnostic | null;
}

export function DiagnosticDialog({ open, onOpenChange, diagnostic }: DiagnosticDialogProps) {
  const { addDiagnostic, updateDiagnostic, projects, clients } = useData();
  const [formData, setFormData] = useState({
    projectId: "",
    projectName: "",
    clientId: "",
    clientName: "",
    templateId: "",
    templateName: "",
    status: "draft" as "draft" | "in_progress" | "completed",
    progress: 0,
    score: undefined as number | undefined,
    opportunities: 0,
  });

  useEffect(() => {
    if (diagnostic) {
      setFormData({
        projectId: diagnostic.projectId,
        projectName: diagnostic.projectName,
        clientId: diagnostic.clientId,
        clientName: diagnostic.clientName,
        templateId: diagnostic.templateId,
        templateName: diagnostic.templateName,
        status: diagnostic.status,
        progress: diagnostic.progress,
        score: diagnostic.score,
        opportunities: diagnostic.opportunities,
      });
    } else {
      setFormData({
        projectId: "",
        projectName: "",
        clientId: "",
        clientName: "",
        templateId: "",
        templateName: "",
        status: "draft",
        progress: 0,
        score: undefined,
        opportunities: 0,
      });
    }
  }, [diagnostic, open]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const client = clients.find(c => c.id === project?.clientId);
    setFormData({ 
      ...formData, 
      projectId, 
      projectName: project?.name || "",
      clientId: project?.clientId || "",
      clientName: client?.name || "",
    });
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setFormData({ 
      ...formData, 
      templateId, 
      templateName: template?.name || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId) {
      toast.error("Selecione um projeto");
      return;
    }
    if (!formData.templateId) {
      toast.error("Selecione um template");
      return;
    }

    if (diagnostic) {
      updateDiagnostic(diagnostic.id, formData);
      toast.success("Diagnóstico atualizado com sucesso");
    } else {
      addDiagnostic(formData);
      toast.success("Diagnóstico criado com sucesso");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{diagnostic ? "Editar Diagnóstico" : "Novo Diagnóstico"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">Projeto *</Label>
              <Select value={formData.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name} - {project.clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template *</Label>
              <Select value={formData.templateId} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {diagnostic && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: "draft" | "in_progress" | "completed") => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {diagnostic ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
