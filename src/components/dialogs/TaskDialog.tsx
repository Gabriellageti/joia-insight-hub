import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { TaskComments } from "@/components/plano-acao/TaskComments";
import { TaskHistory } from "@/components/plano-acao/TaskHistory";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { listTaskAssignees, type TaskAssignee } from "@/integrations/supabase/tasks";
import { hasTaskValidationErrors, validateTask, type TaskValidationErrors } from "@/lib/tasks/validation";
import type { Task } from "@/types";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
}

const emptyTask = (userId?: string): Omit<Task, "id" | "createdAt"> => ({
  title: "",
  description: "",
  taskType: "personal",
  projectId: "",
  projectName: "",
  clientId: "",
  clientName: "",
  type: "processo",
  assignedTo: userId || "",
  createdBy: userId || "",
  responsible: "",
  priority: "medium",
  startDate: "",
  dueDate: "",
  status: "backlog",
  evidenceRequired: false,
});

export function TaskDialog({ open, onOpenChange, task }: TaskDialogProps) {
  const { addTask, updateTask, projects, projectsLoading, projectsError } = useData();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Omit<Task, "id" | "createdAt">>(() => emptyTask(user?.id));
  const [errors, setErrors] = useState<TaskValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);
  const assigneeRequestRef = useRef(0);
  const isEditing = Boolean(task?.id);

  const loadAssignees = useCallback(async (projectId?: string) => {
    const requestId = ++assigneeRequestRef.current;
    setAssigneesLoading(true);
    setAssigneesError(null);
    try {
      const data = await listTaskAssignees(projectId);
      if (requestId !== assigneeRequestRef.current) return;
      setAssignees(data);
      setFormData((current) => {
        const selected = data.find((item) => item.id === current.assignedTo);
        return {
          ...current,
          assignedTo: selected ? current.assignedTo : "",
          responsible: selected?.full_name || "",
        };
      });
    } catch (error) {
      if (requestId !== assigneeRequestRef.current) return;
      setAssigneesError((error as Error).message || "Não foi possível carregar os responsáveis.");
    } finally {
      if (requestId === assigneeRequestRef.current) setAssigneesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormData(task ? {
      ...emptyTask(user?.id),
      ...task,
      taskType: task.taskType || (task.projectId ? "project" : "personal"),
      assignedTo: task.assignedTo || user?.id || "",
    } : emptyTask(user?.id));
  }, [loadAssignees, open, task, user?.id]);

  useEffect(() => {
    if (!open) return;
    const projectId = formData.taskType === "project" ? formData.projectId : undefined;
    void loadAssignees(projectId || undefined);
  }, [formData.projectId, formData.taskType, loadAssignees, open]);

  const setField = <Key extends keyof typeof formData>(field: Key, value: (typeof formData)[Key]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleTaskTypeChange = (taskType: NonNullable<Task["taskType"]>) => {
    setFormData((current) => ({
      ...current,
      taskType,
      projectId: taskType === "personal" ? "" : current.projectId,
      projectName: taskType === "personal" ? "" : current.projectName,
      clientId: taskType === "personal" ? "" : current.clientId,
      clientName: taskType === "personal" ? "" : current.clientName,
    }));
    setErrors((current) => ({ ...current, taskType: undefined, projectId: undefined }));
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    setFormData((current) => ({
      ...current,
      projectId,
      projectName: project?.name || "",
      clientId: project?.clientId || "",
      clientName: project?.clientName || "",
    }));
    setErrors((current) => ({ ...current, projectId: undefined }));
  };

  const handleAssigneeChange = (assignedTo: string) => {
    const assignee = assignees.find((item) => item.id === assignedTo);
    setFormData((current) => ({ ...current, assignedTo, responsible: assignee?.full_name || "" }));
    setErrors((current) => ({ ...current, assignedTo: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateTask(formData, projects);
    setErrors(validationErrors);
    if (hasTaskValidationErrors(validationErrors)) return;

    setSaving(true);
    try {
      if (task?.id) {
        await updateTask(task.id, formData);
        toast.success("Tarefa atualizada com sucesso.");
      } else {
        await addTask(formData);
        toast.success("Tarefa criada com sucesso.");
      }
      onOpenChange(false);
    } catch {
      // DataContext keeps the persisted and local states synchronized and shows the database error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Cadastre uma tarefa pessoal ou vinculada a um projeto.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="task-title">Título *</Label>
              <Input id="task-title" autoFocus value={formData.title} onChange={(event) => setField("title", event.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "task-title-error" : undefined} />
              {errors.title && <p id="task-title-error" className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="task-description">Descrição</Label>
              <Textarea id="task-description" rows={3} value={formData.description || ""} onChange={(event) => setField("description", event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-type">Tipo da tarefa *</Label>
              <Select value={formData.taskType} onValueChange={handleTaskTypeChange}>
                <SelectTrigger id="task-type" aria-invalid={Boolean(errors.taskType)} aria-describedby={errors.taskType ? "task-type-error" : undefined}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="personal">Pessoal</SelectItem><SelectItem value="project">Projeto</SelectItem></SelectContent>
              </Select>
              {errors.taskType && <p id="task-type-error" className="text-sm text-destructive">{errors.taskType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-project">Projeto {formData.taskType === "project" && "*"}</Label>
              <Select disabled={formData.taskType === "personal" || projectsLoading || Boolean(projectsError)} value={formData.projectId || "none"} onValueChange={(value) => handleProjectChange(value === "none" ? "" : value)}>
                <SelectTrigger id="task-project" aria-invalid={Boolean(errors.projectId)} aria-describedby={errors.projectId ? "task-project-error" : undefined}><SelectValue placeholder={projectsLoading ? "Carregando projetos..." : "Selecione o projeto"} /></SelectTrigger>
                <SelectContent><SelectItem value="none">Selecione o projeto</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.projectId && <p id="task-project-error" className="text-sm text-destructive">{errors.projectId}</p>}
              {projectsError && <p className="text-sm text-destructive">{projectsError}</p>}
              {!projectsLoading && !projectsError && formData.taskType === "project" && projects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto disponível.</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="task-assignee">Responsável *</Label>
              <Select disabled={assigneesLoading || Boolean(assigneesError)} value={formData.assignedTo || "none"} onValueChange={(value) => handleAssigneeChange(value === "none" ? "" : value)}>
                <SelectTrigger id="task-assignee" aria-invalid={Boolean(errors.assignedTo)} aria-describedby={errors.assignedTo ? "task-assignee-error" : undefined}><SelectValue placeholder={assigneesLoading ? "Carregando responsáveis..." : "Selecione o responsável"} /></SelectTrigger>
                <SelectContent><SelectItem value="none">Selecione o responsável</SelectItem>{assignees.map((assignee) => <SelectItem key={assignee.id} value={assignee.id}>{assignee.full_name || "Usuário sem nome"}</SelectItem>)}</SelectContent>
              </Select>
              {errors.assignedTo && <p id="task-assignee-error" className="text-sm text-destructive">{errors.assignedTo}</p>}
              {assigneesError && <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-2">{assigneesError}<Button type="button" size="sm" variant="outline" onClick={() => void loadAssignees(formData.taskType === "project" ? formData.projectId : undefined)}>Tentar novamente</Button></AlertDescription></Alert>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: Task["status"]) => setField("status", value)}>
                <SelectTrigger id="task-status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="backlog">Backlog</SelectItem><SelectItem value="next">Próximas</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="waiting">Aguardando</SelectItem><SelectItem value="review">Em revisão</SelectItem><SelectItem value="done">Concluída</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value: Task["priority"]) => setField("priority", value)}>
                <SelectTrigger id="task-priority"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Normal</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-category">Categoria</Label>
              <Select value={formData.type} onValueChange={(value: Task["type"]) => setField("type", value)}>
                <SelectTrigger id="task-category"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="processo">Processo</SelectItem><SelectItem value="financeiro">Financeiro</SelectItem><SelectItem value="tecnologia">Tecnologia</SelectItem><SelectItem value="treinamento">Treinamento</SelectItem><SelectItem value="compras">Compras</SelectItem><SelectItem value="vendas">Vendas</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <Label htmlFor="task-evidence-required">Exigir evidência</Label>
              <Switch id="task-evidence-required" checked={formData.evidenceRequired} onCheckedChange={(checked) => setField("evidenceRequired", checked)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-start-date">Data de início</Label>
              <Input id="task-start-date" type="date" value={formData.startDate || ""} onChange={(event) => setField("startDate", event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Prazo</Label>
              <Input id="task-due-date" type="date" value={formData.dueDate || ""} onChange={(event) => setField("dueDate", event.target.value)} aria-invalid={Boolean(errors.dueDate)} aria-describedby={errors.dueDate ? "task-due-date-error" : undefined} />
              {errors.dueDate && <p id="task-due-date-error" className="text-sm text-destructive">{errors.dueDate}</p>}
            </div>

            <details className="sm:col-span-2 rounded-md border p-4">
              <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Detalhes 5W2H</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="task-what">O quê</Label><Textarea id="task-what" value={formData.what || ""} onChange={(event) => setField("what", event.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="task-why">Por quê</Label><Textarea id="task-why" value={formData.why || ""} onChange={(event) => setField("why", event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="task-where">Onde</Label><Input id="task-where" value={formData.where || ""} onChange={(event) => setField("where", event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="task-when">Quando</Label><Input id="task-when" value={formData.when || ""} onChange={(event) => setField("when", event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="task-who">Quem</Label><Input id="task-who" value={formData.who || ""} onChange={(event) => setField("who", event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="task-how-much">Quanto</Label><Input id="task-how-much" value={formData.howMuch || ""} onChange={(event) => setField("howMuch", event.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="task-how">Como</Label><Textarea id="task-how" value={formData.how || ""} onChange={(event) => setField("how", event.target.value)} /></div>
              </div>
            </details>
          </div>

          {isEditing && task?.id && <div className="space-y-5 border-t py-4"><section aria-labelledby="task-history-title"><h3 id="task-history-title" className="mb-3 font-medium">Histórico</h3><TaskHistory taskId={task.id} /></section><TaskComments taskId={task.id} taskTitle={formData.title} /></div>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || assigneesLoading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEditing ? "Salvar alterações" : "Criar tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
