import { supabase } from "./client";
import type { Database } from "./types";

export type DiagnosticRow = Database["public"]["Tables"]["diagnostics"]["Row"];
type DiagnosticInsert = Database["public"]["Tables"]["diagnostics"]["Insert"];
type DiagnosticUpdate = Database["public"]["Tables"]["diagnostics"]["Update"];

export async function listDiagnostics(): Promise<DiagnosticRow[]> {
  const { data, error } = await supabase.from("diagnostics").select("*").order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createDiagnostic(payload: DiagnosticInsert): Promise<DiagnosticRow> {
  const { data, error } = await supabase.from("diagnostics").insert(payload).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao criar diagnóstico no Supabase");
  }

  return data;
}

export async function updateDiagnostic(id: string, payload: DiagnosticUpdate): Promise<DiagnosticRow> {
  const { data, error } = await supabase.from("diagnostics").update(payload).eq("id", id).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao atualizar diagnóstico no Supabase");
  }

  return data;
}

export async function deleteDiagnostic(id: string): Promise<void> {
  const { error } = await supabase.from("diagnostics").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
