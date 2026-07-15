import type { Task } from "@/types";

export function getCompletionPatch(task: Task, userId?: string, now = new Date()): Partial<Task> {
  if (task.status === "done") {
    const reopenStatus = task.previousStatus && ["backlog", "next", "in_progress", "waiting", "review"].includes(task.previousStatus)
      ? task.previousStatus
      : "in_progress";
    return {
      status: reopenStatus,
      completedAt: "",
      completedBy: "",
    };
  }

  return {
    status: "done",
    previousStatus: task.status,
    completedAt: now.toISOString(),
    completedBy: userId,
  };
}

export function assertExpectedTaskStatus(task: Task, expectedStatus?: Task["status"]): void {
  if (expectedStatus && task.status !== expectedStatus) {
    throw new Error("A tarefa mudou desde esta ação e não pode mais ser desfeita.");
  }
}
