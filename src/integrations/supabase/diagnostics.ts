import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "./client";
import type { Database } from "./types";

export type DiagnosticRow = Database["public"]["Tables"]["diagnostics"]["Row"];
type DiagnosticInsert = Database["public"]["Tables"]["diagnostics"]["Insert"];
type DiagnosticUpdate = Database["public"]["Tables"]["diagnostics"]["Update"];

const isMissingDiagnosticColumnError = (error: PostgrestError | null): boolean => {
  if (!error?.message) return false;
  const normalized = error.message.toLowerCase();
  if (!normalized.includes("schema cache")) return false;
  return normalized.includes("'action_plan'") || normalized.includes("'report_payload'");
};

const stripLegacyDiagnosticPayload = <T extends Record<string, unknown>>(payload: T): Omit<
  T,
  "action_plan" | "report_payload"
> => {
  const { action_plan, report_payload, ...rest } = payload;
  return rest;
};

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
    if (isMissingDiagnosticColumnError(error)) {
      const sanitizedPayload = stripLegacyDiagnosticPayload(payload as Record<string, unknown>) as DiagnosticInsert;
      const retry = await supabase.from("diagnostics").insert(sanitizedPayload).select().single();
      if (retry.error) {
        throw new Error(retry.error.message);
      }
      if (!retry.data) {
        throw new Error("Erro ao criar diagnóstico no Supabase");
      }
      return retry.data;
    }
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
    if (isMissingDiagnosticColumnError(error)) {
      const sanitizedPayload = stripLegacyDiagnosticPayload(payload as Record<string, unknown>) as DiagnosticUpdate;
      const retry = await supabase.from("diagnostics").update(sanitizedPayload).eq("id", id).select().single();
      if (retry.error) {
        throw new Error(retry.error.message);
      }
      if (!retry.data) {
        throw new Error("Erro ao atualizar diagnóstico no Supabase");
      }
      return retry.data;
    }
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
