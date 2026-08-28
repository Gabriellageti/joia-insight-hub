
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
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
import { TASK_STATUSES } from "@/lib/tasks/constants";
import type { Task } from "@/types";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultClientId?: string;
  defaultProjectId?: string;
  onSuccess?: () => void;
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
  status: "not_started",
  evidenceRequired: false,
});

export function TaskDialog({ open, onOpenChange, task, defaultClientId, defaultProjectId, onSuccess }: TaskDialogProps) {
  const { addTask, updateTask, clients, projects, projectsLoading, projectsError } = useData();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Omit<Task, "id" | "createdAt">>(() => emptyTask(user?.id));
  const [errors, setErrors] = useState<TaskValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);
  const assigneeRequestRef = useRef(0);
  const isEditing = Boolean(task?.id);
  const availableProjects = formData.clientId
    ? projects.filter((project) => project.clientId === formData.clientId)
    : projects;

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
    const defaultProject = projects.find((project) => project.id === defaultProjectId);
    setFormData(task ? {
      ...emptyTask(user?.id),
      ...task,
      taskType: task.taskType || (task.projectId ? "project" : task.clientId ? "client" : "personal"),
      assignedTo: task.assignedTo || user?.id || "",
    } : {
      ...emptyTask(user?.id),
      taskType: defaultProject ? "project" : defaultClientId ? "client" : "personal",
      projectId: defaultProject?.id || "",
      projectName: defaultProject?.name || "",
      clientId: defaultProject?.clientId || defaultClientId || "",
      clientName: defaultProject?.clientName || clients.find((client) => client.id === defaultClientId)?.nomeFantasia || clients.find((client) => client.id === defaultClientId)?.razaoSocial || "",
    });
  }, [clients, defaultClientId, defaultProjectId, open, projects, task, user?.id]);

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
      projectId: taskType === "project" ? current.projectId : "",
      projectName: taskType === "project" ? current.projectName : "",
      clientId: taskType === "personal" ? "" : current.clientId,
      clientName: taskType === "personal" ? "" : current.clientName,
    }));
    setErrors((current) => ({ ...current, taskType: undefined, projectId: undefined }));
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((item) => item.id === clientId);
    setFormData((current) => {
      const selectedProject = projects.find((project) => project.id === current.projectId);
      const keepProject = selectedProject?.clientId === clientId;
      return {
        ...current,
        clientId,
        clientName: client?.nomeFantasia || client?.razaoSocial || client?.name || "",
        projectId: keepProject ? current.projectId : "",
        projectName: keepProject ? current.projectName : "",
      };
    });
    setErrors((current) => ({ ...current, clientId: undefined, projectId: undefined }));
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
      onSuccess?.();
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
          <DialogDescription>Cadastre uma tarefa pessoal ou relacione-a a um cliente e projeto.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          {formData.sourceMeetingId ? (
            <Button asChild type="button" variant="outline" size="sm" className="mt-4">
              <Link to={`/reunioes/${formData.sourceMeetingId}`} onClick={() => onOpenChange(false)}><ExternalLink className="mr-2 h-4 w-4" />Ver reunião de origem</Link>
            </Button>
          ) : null}
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
                <SelectContent><SelectItem value="personal">Pessoal</SelectItem><SelectItem value="client">Cliente</SelectItem><SelectItem value="project">Projeto</SelectItem></SelectContent>
              </Select>
              {errors.taskType && <p id="task-type-error" className="text-sm text-destructive">{errors.taskType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-client">Cliente {formData.taskType !== "personal" && "*"}</Label>
              <Select disabled={formData.taskType === "personal"} value={formData.clientId || "none"} onValueChange={(value) => handleClientChange(value === "none" ? "" : value)}>
                <SelectTrigger id="task-client" aria-invalid={Boolean(errors.clientId)} aria-describedby={errors.clientId ? "task-client-error" : undefined}><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Selecione o cliente</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial || client.name || "Cliente"}</SelectItem>)}</SelectContent>
              </Select>
              {errors.clientId && <p id="task-client-error" className="text-sm text-destructive">{errors.clientId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-project">Projeto {formData.taskType === "project" && "*"}</Label>
              <Select disabled={formData.taskType !== "project" || !formData.clientId || projectsLoading || Boolean(projectsError)} value={formData.projectId || "none"} onValueChange={(value) => handleProjectChange(value === "none" ? "" : value)}>
                <SelectTrigger id="task-project" aria-invalid={Boolean(errors.projectId)} aria-describedby={errors.projectId ? "task-project-error" : undefined}><SelectValue placeholder={projectsLoading ? "Carregando projetos..." : "Selecione o projeto"} /></SelectTrigger>
                <SelectContent><SelectItem value="none">Selecione o projeto</SelectItem>{availableProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.projectId && <p id="task-project-error" className="text-sm text-destructive">{errors.projectId}</p>}
              {projectsError && <p className="text-sm text-destructive">{projectsError}</p>}
              {!projectsLoading && !projectsError && formData.taskType === "project" && formData.clientId && availableProjects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto deste cliente está disponível.</p>}
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
                <SelectContent>{TASK_STATUSES.map((status) => <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {formData.status === "blocked" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="task-block-category">Categoria do bloqueio</Label>
                  <Select value={formData.blockReasonCategory || "other"} onValueChange={(value: NonNullable<Task["blockReasonCategory"]>) => setField("blockReasonCategory", value)}>
                    <SelectTrigger id="task-block-category"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="client">Cliente</SelectItem><SelectItem value="dependency">Dependência</SelectItem><SelectItem value="decision">Decisão</SelectItem><SelectItem value="resource">Recurso</SelectItem><SelectItem value="technical">Técnico</SelectItem><SelectItem value="other">Outro</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="task-block-reason">Motivo do bloqueio *</Label>
                  <Textarea id="task-block-reason" rows={2} value={formData.blockReason || ""} onChange={(event) => setField("blockReason", event.target.value)} aria-invalid={Boolean(errors.blockReason)} aria-describedby={errors.blockReason ? "task-block-reason-error" : undefined} placeholder="Explique o impedimento e o que é necessário para liberar a tarefa." />
                  {errors.blockReason ? <p id="task-block-reason-error" className="text-sm text-destructive">{errors.blockReason}</p> : null}
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value: Task["priority"]) => setField("priority", value)}>
                <SelectTrigger id="task-priority"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-category">Categoria</Label>
              <Select value={formData.type} onValueChange={(value: Task["type"]) => setField("type", value)}>
                <SelectTrigger id="task-category"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="processo">Processo</SelectItem><SelectItem value="financeiro">Financeiro</SelectItem><SelectItem value="tecnologia">Tecnologia</SelectItem><SelectItem value="treinamento">Treinamento</SelectItem><SelectItem value="compras">Compras</SelectItem><SelectItem value="vendas">Vendas</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="task-observations">Observações</Label>
              <Textarea id="task-observations" rows={3} value={formData.observations || ""} onChange={(event) => setField("observations", event.target.value)} placeholder="Contexto, impedimentos ou instruções adicionais" />
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
