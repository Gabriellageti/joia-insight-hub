import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/contexts/DataContext";
import { Task } from "@/types";
import { toast } from "sonner";
import { TaskComments } from "@/components/plano-acao/TaskComments";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
}

export function TaskDialog({ open, onOpenChange, task }: TaskDialogProps) {
  const { addTask, updateTask, projects, clients } = useData();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectId: "",
    projectName: "",
    clientId: "",
    clientName: "",
    type: "processo" as Task["type"],
    responsible: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
    impact: "",
    status: "backlog" as Task["status"],
    evidenceRequired: true,
    what: "",
    why: "",
    where: "",
    when: "",
    who: "",
    how: "",
    howMuch: "",
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        projectId: task.projectId,
        projectName: task.projectName,
        clientId: task.clientId,
        clientName: task.clientName,
        type: task.type,
        responsible: task.responsible,
        priority: task.priority,
        dueDate: task.dueDate,
        impact: task.impact || "",
        status: task.status,
        evidenceRequired: task.evidenceRequired,
        what: task.what || "",
        why: task.why || "",
        where: task.where || "",
        when: task.when || "",
        who: task.who || "",
        how: task.how || "",
        howMuch: task.howMuch || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        projectId: "",
        projectName: "",
        clientId: "",
        clientName: "",
        type: "processo",
        responsible: "",
        priority: "medium",
        dueDate: "",
        impact: "",
        status: "backlog",
        evidenceRequired: true,
        what: "",
        why: "",
        where: "",
        when: "",
        who: "",
        how: "",
        howMuch: "",
      });
    }
  }, [task, open]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!formData.projectId) {
      toast.error("Selecione um projeto");
      return;
    }

    if (task) {
      updateTask(task.id, formData);
      toast.success("Tarefa atualizada com sucesso");
    } else {
      addTask(formData);
      toast.success("Tarefa criada com sucesso");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="O que precisa ser feito?"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes da tarefa"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Projeto *</Label>
              <Select value={formData.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value: Task["type"]) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processo">Processo</SelectItem>
                  <SelectItem value="financeiro">Financeiro (Diagnóstico JoIA)</SelectItem>
                  <SelectItem value="tecnologia">Tecnologia</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                  <SelectItem value="compras">Compras</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
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
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value: "low" | "medium" | "high") => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Prazo</Label>
              <Input
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact">Impacto Esperado (R$)</Label>
              <Input
                id="impact"
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: Task["status"]) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="next">Próximas</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="validation">Em Validação</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="evidenceRequired"
                checked={formData.evidenceRequired}
                onCheckedChange={(checked) => setFormData({ ...formData, evidenceRequired: checked })}
              />
              <Label htmlFor="evidenceRequired">Exigir evidência para conclusão</Label>
            </div>
            
            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="font-medium mb-3">5W2H (opcional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="what">What (O quê)</Label>
                  <Input id="what" value={formData.what} onChange={(e) => setFormData({ ...formData, what: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="why">Why (Por quê)</Label>
                  <Input id="why" value={formData.why} onChange={(e) => setFormData({ ...formData, why: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="where">Where (Onde)</Label>
                  <Input id="where" value={formData.where} onChange={(e) => setFormData({ ...formData, where: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="when">When (Quando)</Label>
                  <Input id="when" value={formData.when} onChange={(e) => setFormData({ ...formData, when: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="who">Who (Quem)</Label>
                  <Input id="who" value={formData.who} onChange={(e) => setFormData({ ...formData, who: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="how">How (Como)</Label>
                  <Input id="how" value={formData.how} onChange={(e) => setFormData({ ...formData, how: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="howMuch">How Much (Quanto)</Label>
                  <Input id="howMuch" value={formData.howMuch} onChange={(e) => setFormData({ ...formData, howMuch: e.target.value })} placeholder="Custo e retorno esperado" />
                </div>
              </div>
            </div>

            {task && (
              <div className="col-span-2 border-t pt-4 mt-2">
                <TaskComments taskId={task.id} taskTitle={task.title} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {task ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
