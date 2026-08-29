import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type ConsultingReportRow = Database["public"]["Tables"]["consulting_reports"]["Row"];
export const REPORT_SECTIONS = [
  ["executive_summary", "Resumo Executivo"], ["activities", "Atividades Realizadas"], ["meetings", "Reuniões"], ["diagnostics", "Principais Diagnósticos"], ["decisions", "Decisões"], ["improvements", "Melhorias Implementadas"], ["completed_tasks", "Tarefas Concluídas"], ["pending_tasks", "Pendências"], ["risks", "Riscos"], ["next_steps", "Próximos Passos"], ["documents", "Documentos e Marcos"], ["considerations", "Considerações"],
] as const;

export function sectionToText(value: Json | undefined): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return value ? JSON.stringify(value, null, 2) : "";
  return value.map((item) => {
    if (typeof item === "string") return `• ${item}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) return `• ${String(item ?? "")}`;
    const record = item as Record<string, Json | undefined>;
    const primary = record.title || record.name || record.description || "Item";
    const details = Object.entries(record).filter(([key, entry]) => !["id", "project_id", "meeting_id", "title", "name", "description"].includes(key) && entry !== null && entry !== "").map(([key, entry]) => `${key.replace(/_/g, " ")}: ${String(entry)}`).join(" · ");
    return `• ${String(primary)}${details ? ` — ${details}` : ""}`;
  }).join("\n");
}

export async function listConsultingReports(): Promise<ConsultingReportRow[]> {
  const { data, error } = await supabase.from("consulting_reports").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message); return data ?? [];
}
export async function getConsultingReport(id: string): Promise<ConsultingReportRow> {
  const { data, error } = await supabase.from("consulting_reports").select("*").eq("id", id).single();
  if (error || !data) throw new Error(error?.message || "Relatório não encontrado"); return data;
}
export async function listReportVersions(groupId: string): Promise<ConsultingReportRow[]> {
  const { data, error } = await supabase.from("consulting_reports").select("*").eq("version_group_id", groupId).order("version_number", { ascending: false });
  if (error) throw new Error(error.message); return data ?? [];
}
export async function generateConsultingReport(clientId: string, start: string, end: string, projectIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc("generate_consulting_report", { p_client_id: clientId, p_period_start: start, p_period_end: end, p_project_ids: projectIds.length ? projectIds : null });
  if (error) throw new Error(error.message); return data;
}
export async function updateConsultingReport(id: string, title: string, sections: Record<string, string>, finalize = false): Promise<void> {
  const { error } = await supabase.from("consulting_reports").update({ title, sections: sections as unknown as Json, status: finalize ? "finalized" : "draft" }).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function createReportVersion(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_consulting_report_version", { p_report_id: id });
  if (error) throw new Error(error.message); return data;
}
