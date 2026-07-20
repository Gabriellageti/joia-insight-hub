import { supabase } from "./client";
import type { Database } from "./types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskHistoryRow = Database["public"]["Tables"]["task_history"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type TaskAssignee = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name">;
export type TaskHistoryEntry = TaskHistoryRow & { user_name: string };

const assigneeCache = new Map<string, Promise<TaskAssignee[]>>();

export function listTaskAssignees(projectId?: string): Promise<TaskAssignee[]> {
  const cacheKey = projectId || "personal";
  const cached = assigneeCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    if (!projectId) {
      const { data, error } = await supabase.from("profiles").select("id, full_name").order("full_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId);
    if (membershipError) throw new Error(membershipError.message);

    const userIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  })().catch((error) => {
    assigneeCache.delete(cacheKey);
    throw error;
  });

  assigneeCache.set(cacheKey, request);
  return request;
}

export async function listTasks(): Promise<TaskRow[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listTaskHistory(taskId: string): Promise<TaskHistoryRow[]> {
  const { data, error } = await supabase.from("task_history").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTaskHistoryEntries(taskId: string): Promise<TaskHistoryEntry[]> {
  const history = await listTaskHistory(taskId);
  const userIds = [...new Set(history.map((entry) => entry.user_id).filter((id): id is string => Boolean(id)))];
  if (userIds.length === 0) return history.map((entry) => ({ ...entry, user_name: "Sistema" }));
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  if (error) throw new Error(error.message);
  const names = new Map((data ?? []).map((profile) => [profile.id, profile.full_name || "Usuário"]));
  return history.map((entry) => ({ ...entry, user_name: entry.user_id ? names.get(entry.user_id) || "Usuário" : "Sistema" }));
}

export async function createTask(task: TaskInsert): Promise<TaskRow> {
  const { data, error } = await supabase.from("tasks").insert(task).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao criar tarefa no Supabase");
  }

  return data;
}

export async function createTasksBatch(tasks: TaskInsert[]): Promise<TaskRow[]> {
  if (tasks.length === 0) return [];

  const { data, error } = await supabase.from("tasks").insert(tasks).select();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function updateTask(id: string, task: TaskUpdate, expectedUpdatedAt?: string): Promise<TaskRow> {
  let query = supabase
    .from("tasks")
    .update(task)
    .eq("id", id);

  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);

  const { data, error } = await query.select().maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("A tarefa foi alterada por outra sessão. Recarregue os dados e tente novamente.");
  }

  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
