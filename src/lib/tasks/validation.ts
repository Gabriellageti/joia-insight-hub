import type { Project, Task } from "@/types";

export interface TaskValidationErrors {
  title?: string;
  taskType?: string;
  projectId?: string;
  clientId?: string;
  assignedTo?: string;
  startDate?: string;
  dueDate?: string;
  blockReason?: string;
}

export function validateTask(task: Partial<Task>, projects: Project[]): TaskValidationErrors {
  const errors: TaskValidationErrors = {};

  if (!task.title?.trim()) errors.title = "Informe o título da tarefa.";
  if (!task.taskType || !["personal", "client", "project"].includes(task.taskType)) errors.taskType = "Selecione o tipo da tarefa.";
  if (!task.assignedTo) errors.assignedTo = "Selecione um usuário responsável.";
  if (task.status === "blocked" && !task.blockReason?.trim()) errors.blockReason = "Informe o motivo do bloqueio.";

  if (task.taskType === "client" && !task.clientId) errors.clientId = "Selecione um cliente.";

  if (task.taskType === "project") {
    if (!task.clientId) errors.clientId = "Selecione um cliente.";
    if (!task.projectId) errors.projectId = "Selecione um projeto.";
    else {
      const project = projects.find((item) => item.id === task.projectId);
      if (!project) errors.projectId = "O projeto selecionado não está disponível.";
      else if (task.clientId && project.clientId !== task.clientId) errors.projectId = "O projeto não pertence ao cliente selecionado.";
    }
  }

  if (task.startDate && task.dueDate) {
    const start = new Date(`${task.startDate}T00:00:00`);
    const due = new Date(`${task.dueDate}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(due.getTime()) && due < start) {
      errors.dueDate = "O prazo não pode ser anterior à data de início.";
    }
  }

  return errors;
}

export function hasTaskValidationErrors(errors: TaskValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
