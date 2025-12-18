import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Project } from "@/types";
import { toast } from "sonner";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { addProject, updateProject, clients } = useData();
  const [formData, setFormData] = useState({
    name: "",
    clientId: "",
    clientName: "",
    objective: "",
    scope: "",
    phase: "Diagnóstico",
    progress: 0,
    status: "green" as "green" | "yellow" | "red",
    responsible: "",
    startDate: "",
    endDate: "",
    moneyHypothesis: "",
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        clientId: project.clientId,
        clientName: project.clientName,
        objective: project.objective || "",
        scope: project.scope || "",
        phase: project.phase,
        progress: project.progress,
        status: project.status,
        responsible: project.responsible,
        startDate: project.startDate,
        endDate: project.endDate,
        moneyHypothesis: project.moneyHypothesis || "",
      });
    } else {
      setFormData({
        name: "",
        clientId: "",
        clientName: "",
        objective: "",
        scope: "",
        phase: "Diagnóstico",
        progress: 0,
        status: "green",
        responsible: "",
        startDate: "",
        endDate: "",
        moneyHypothesis: "",
      });
    }
  }, [project, open]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ 
      ...formData, 
      clientId, 
      clientName: client?.name || "" 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }
    if (!formData.clientId) {
      toast.error("Selecione um cliente");
      return;
    }

    if (project) {
      updateProject(project.id, formData);
      toast.success("Projeto atualizado com sucesso");
    } else {
      addProject(formData);
      toast.success("Projeto criado com sucesso");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do projeto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={formData.clientId} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.status === "ativo").map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Objetivo do projeto"
                rows={2}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="scope">Escopo</Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="Escopo do projeto"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase">Fase</Label>
              <Select value={formData.phase} onValueChange={(value) => setFormData({ ...formData, phase: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
                  <SelectItem value="Quick wins">Quick wins</SelectItem>
                  <SelectItem value="Estruturação">Estruturação</SelectItem>
                  <SelectItem value="Cultura e treinamento">Cultura e treinamento</SelectItem>
                  <SelectItem value="Acompanhamento">Acompanhamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: "green" | "yellow" | "red") => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress">Progresso (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="moneyHypothesis">Hipótese de Dinheiro na Mesa</Label>
              <Textarea
                id="moneyHypothesis"
                value={formData.moneyHypothesis}
                onChange={(e) => setFormData({ ...formData, moneyHypothesis: e.target.value })}
                placeholder="Descreva a hipótese de valor a ser resgatado"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {project ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
