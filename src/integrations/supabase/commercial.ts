import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { CommercialStage, ProposalStatus } from "@/lib/commercial/commercial";

export type CommercialLead = {
  id: string; workspace_id: string; name: string; company: string | null; email: string | null; phone: string | null;
  source: string | null; status: string | null; notes: string | null; assigned_to: string | null; created_at: string;
  updated_at: string; value: number | null; next_action: string | null; next_action_date: string | null; service: string | null;
  probability: number; stage: CommercialStage; responsible_user_id: string | null; expected_close_date: string | null;
  lost_reason: string | null; won_at: string | null; lost_at: string | null; converted_client_id: string | null;
  converted_project_id: string | null; created_by: string | null;
};
export type CommercialActivity = { id: string; workspace_id: string; lead_id: string; activity_type: string; title: string; description: string | null; happened_at: string; created_by: string; metadata: unknown; created_at: string };
export type CommercialProposal = { id: string; workspace_id: string; lead_id: string; value: number; scope: string; proposal_date: string; valid_until: string | null; status: ProposalStatus; created_by: string; created_at: string; updated_at: string };
export type CommercialFollowUp = { id: string; workspace_id: string; lead_id: string; responsible_user_id: string; action: string; due_at: string; completed_at: string | null; completed_by: string | null; created_by: string; created_at: string; updated_at: string };
export type ClientDuplicate = { id: string; name: string; trade_name: string | null; contact_email: string | null; contact_phone: string | null };

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type CommercialDatabase = {
  public: {
    Tables: {
      leads: Table<CommercialLead>;
      commercial_activities: Table<CommercialActivity>;
      commercial_proposals: Table<CommercialProposal>;
      commercial_follow_ups: Table<CommercialFollowUp>;
    };
    Views: Record<string, never>;
    Functions: {
      schedule_commercial_follow_up: { Args: { p_lead_id: string; p_action: string; p_due_at: string; p_responsible_user_id: string }; Returns: string };
      find_lead_client_duplicates: { Args: { p_lead_id: string }; Returns: ClientDuplicate[] };
      convert_lead_to_client: { Args: { p_lead_id: string; p_existing_client_id?: string | null }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const db = supabase as unknown as SupabaseClient<CommercialDatabase>;

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Resposta vazia do banco de dados.");
  return data;
}

export async function listCommercialData() {
  const [leads, activities, proposals, followUps] = await Promise.all([
    db.from("leads").select("*").order("updated_at", { ascending: false }),
    db.from("commercial_activities").select("*").order("happened_at", { ascending: false }).limit(500),
    db.from("commercial_proposals").select("*").order("proposal_date", { ascending: false }),
    db.from("commercial_follow_ups").select("*").order("due_at", { ascending: true }),
  ]);
  if (leads.error || activities.error || proposals.error || followUps.error) throw new Error(leads.error?.message || activities.error?.message || proposals.error?.message || followUps.error?.message);
  return { leads: leads.data ?? [], activities: activities.data ?? [], proposals: proposals.data ?? [], followUps: followUps.data ?? [] };
}

export async function listMyCommercialFollowUps() {
  const { data, error } = await db.from("commercial_follow_ups").select("*").is("completed_at", null).order("due_at", { ascending: true }).limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCommercialLead(input: Partial<CommercialLead> & Pick<CommercialLead, "name" | "company" | "stage" | "probability">) {
  const { data, error } = await db.from("leads").insert(input).select("*").single();
  return unwrap(data, error);
}
export async function updateCommercialLead(id: string, input: Partial<CommercialLead>) {
  const { data, error } = await db.from("leads").update(input).eq("id", id).select("*").single();
  return unwrap(data, error);
}
export async function addCommercialActivity(input: Pick<CommercialActivity, "workspace_id" | "lead_id" | "activity_type" | "title" | "description" | "created_by">) {
  const { data, error } = await db.from("commercial_activities").insert(input).select("*").single();
  return unwrap(data, error);
}
export async function saveCommercialProposal(input: Partial<CommercialProposal> & Pick<CommercialProposal, "workspace_id" | "lead_id" | "value" | "scope" | "status" | "created_by">) {
  if (input.id) {
    const { data, error } = await db.from("commercial_proposals").update(input).eq("id", input.id).select("*").single();
    return unwrap(data, error);
  }
  const { data, error } = await db.from("commercial_proposals").insert(input).select("*").single();
  return unwrap(data, error);
}
export async function scheduleCommercialFollowUp(leadId: string, action: string, dueAt: string, responsibleUserId: string) {
  const { data, error } = await db.rpc("schedule_commercial_follow_up", { p_lead_id: leadId, p_action: action, p_due_at: dueAt, p_responsible_user_id: responsibleUserId });
  return unwrap(data, error);
}
export async function completeCommercialFollowUp(id: string) {
  const { data, error } = await db.from("commercial_follow_ups").update({ completed_at: new Date().toISOString() }).eq("id", id).select("*").single();
  return unwrap(data, error);
}
export async function findLeadClientDuplicates(leadId: string) {
  const { data, error } = await db.rpc("find_lead_client_duplicates", { p_lead_id: leadId });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function convertLeadToClient(leadId: string, existingClientId?: string | null) {
  const { data, error } = await db.rpc("convert_lead_to_client", { p_lead_id: leadId, p_existing_client_id: existingClientId });
  return unwrap(data, error);
}
