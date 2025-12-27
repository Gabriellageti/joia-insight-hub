import { supabase } from "./client";
import type { Database } from "./types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export async function listTasks(): Promise<TaskRow[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
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

export async function updateTask(id: string, task: TaskUpdate): Promise<TaskRow> {
  const { data, error } = await supabase
    .from("tasks")
    .update(task)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao atualizar tarefa no Supabase");
  }

  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
