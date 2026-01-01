import { supabase } from "./client";

export interface AuditLogRow {
  id: string;
  project_id: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  justification: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  project_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  justification?: string | null;
}

export async function listAuditLogs(projectId?: string): Promise<AuditLogRow[]> {
  let query = supabase
    .from("project_audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function createAuditLog(log: AuditLogInsert): Promise<AuditLogRow> {
  const { data, error } = await supabase
    .from("project_audit_logs")
    .insert(log)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Audit logs should not be updated or deleted (immutable)
