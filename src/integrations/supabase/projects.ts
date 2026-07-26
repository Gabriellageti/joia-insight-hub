import { supabase } from "./client";
import type { Database } from "./types";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

const PROJECT_CREATOR_ROLES = ["admin_joia"] as const;

async function requireProjectCreationSession(): Promise<void> {
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError || !refreshData.session?.user) {
    throw new Error("Sua sessão expirou. Entre novamente para criar o projeto.");
  }

  const userId = refreshData.session.user.id;
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", [...PROJECT_CREATOR_ROLES]);

  if (rolesError) {
    throw new Error(`Não foi possível validar sua permissão: ${rolesError.message}`);
  }

  if (!roles?.length) {
    throw new Error("Sua conta não possui permissão para criar projetos.");
  }
}

export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createProject(project: ProjectInsert): Promise<ProjectRow> {
  await requireProjectCreationSession();

  // Do not chain `.select()` to this insert. Project visibility depends on the
  // AFTER INSERT trigger that grants the creator membership; PostgREST applies
  // the SELECT policy to `INSERT ... RETURNING` before that membership can be
  // used, which makes an otherwise-authorized insert fail RLS.
  const projectId = project.id ?? crypto.randomUUID();
  const { error: insertError } = await supabase.from("projects").insert({
    ...project,
    id: projectId,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  // The insert transaction has completed and the creator membership now
  // exists, so the regular project SELECT policy authorizes this read.
  const { data, error: selectError } = await supabase.from("projects").select("*").eq("id", projectId).single();

  if (selectError) {
    throw new Error(selectError.message);
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
