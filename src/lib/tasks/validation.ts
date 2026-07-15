import type { Project, Task } from "@/types";

export interface TaskValidationErrors {
  title?: string;
  taskType?: string;
  projectId?: string;
  assignedTo?: string;
  startDate?: string;
  dueDate?: string;
}

export function validateTask(task: Partial<Task>, projects: Project[]): TaskValidationErrors {
  const errors: TaskValidationErrors = {};

  if (!task.title?.trim()) errors.title = "Informe o título da tarefa.";
  if (!task.taskType || !["personal", "project"].includes(task.taskType)) errors.taskType = "Selecione o tipo da tarefa.";
  if (!task.assignedTo) errors.assignedTo = "Selecione um usuário responsável.";

  if (task.taskType === "project") {
    if (!task.projectId) errors.projectId = "Selecione um projeto.";
    else if (!projects.some((project) => project.id === task.projectId)) errors.projectId = "O projeto selecionado não está disponível.";
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
