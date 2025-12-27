import { supabase } from "./client";
import type { Database } from "./types";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createProject(project: ProjectInsert): Promise<ProjectRow> {
  const { data, error } = await supabase.from("projects").insert(project).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao criar projeto no Supabase");
  }

  return data;
}

export async function updateProject(id: string, project: ProjectUpdate): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .update(project)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao atualizar projeto no Supabase");
  }

  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
