import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "./client";
import type { Database } from "./types";

// Tipo estendido para incluir colunas que existem no banco mas ainda não no types.ts gerado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DiagnosticRow = Database["public"]["Tables"]["diagnostics"]["Row"] & Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DiagnosticInsert = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DiagnosticUpdate = Record<string, any>;

// Cliente sem tipagem estrita para colunas que ainda não estão no schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedSupabase = supabase as any;

const isMissingDiagnosticColumnError = (error: PostgrestError | null): boolean => {
  if (!error?.message) return false;
  const normalized = error.message.toLowerCase();
  if (normalized.includes("schema cache")) return true;
  return normalized.includes("column") && normalized.includes("does not exist");
};

const extractMissingColumn = (error: PostgrestError | null): string | null => {
  if (!error?.message) return null;
  const match = error.message.match(/'([^']+)' column/i);
  return match?.[1] ?? null;
};

const legacyDiagnosticFields = [
  "action_plan",
  "report_payload",
  "progress",
  "answered_questions",
  "total_questions",
  "auto_generate_opportunities",
  "client_name",
  "project_name",
  "template_id",
  "template_name",
  "responsible_name",
  "responsible_id",
  "due_date",
  "opportunities_count",
];

const stripLegacyDiagnosticPayload = <T extends Record<string, unknown>>(
  payload: T,
  extraKeys: string[] = []
): Omit<
  T,
  "action_plan" | "report_payload" | "answered_questions" | "total_questions" | "auto_generate_opportunities"
> => {
  const keysToStrip = new Set([...legacyDiagnosticFields, ...extraKeys]);
  const sanitized = { ...payload };
  keysToStrip.forEach((key) => {
    if (key in sanitized) {
      delete sanitized[key];
    }
  });
  return sanitized;
};

const retryDiagnosticMutation = async <T extends Record<string, unknown>, R>(
  payload: T,
  executor: (nextPayload: T) => Promise<{ data: R | null; error: PostgrestError | null }>
): Promise<R> => {
  let currentPayload = payload;

  while (true) {
    const { data, error } = await executor(currentPayload);
    if (!error) {
      if (!data) {
        throw new Error("Erro ao salvar diagnóstico no Supabase");
      }
      return data;
    }

    if (!isMissingDiagnosticColumnError(error)) {
      throw new Error(error.message);
    }

    const missingColumn = extractMissingColumn(error);
    const sanitizedPayload = stripLegacyDiagnosticPayload(
      currentPayload as Record<string, unknown>,
      missingColumn ? [missingColumn] : []
    ) as T;

    if (Object.keys(sanitizedPayload).length === Object.keys(currentPayload).length) {
      throw new Error(error.message);
    }

    currentPayload = sanitizedPayload;
  }
};

export async function listDiagnostics(): Promise<DiagnosticRow[]> {
  const { data, error } = await untypedSupabase.from("diagnostics").select("*").order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createDiagnostic(payload: DiagnosticInsert): Promise<DiagnosticRow> {
  return retryDiagnosticMutation(payload, async (nextPayload) => {
    const result = await untypedSupabase.from("diagnostics").insert(nextPayload).select().single();
    return result;
  });
}

export async function updateDiagnostic(id: string, payload: DiagnosticUpdate): Promise<DiagnosticRow> {
  return retryDiagnosticMutation(payload, async (nextPayload) => {
    const result = await untypedSupabase.from("diagnostics").update(nextPayload).eq("id", id).select().single();
    return result;
  });
}

export async function deleteDiagnostic(id: string): Promise<void> {
  const { error } = await untypedSupabase.from("diagnostics").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
