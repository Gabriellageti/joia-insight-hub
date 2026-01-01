import { supabase } from "./client";

export interface OpportunityRow {
  id: string;
  project_id: string | null;
  client_id: string | null;
  diagnostic_id: string | null;
  title: string;
  description: string | null;
  type: string | null;
  estimated_value: number | null;
  priority: string | null;
  status: string | null;
  source: string | null;
  evidence_type: string | null;
  effort: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityInsert {
  id?: string;
  project_id?: string | null;
  client_id?: string | null;
  diagnostic_id?: string | null;
  title: string;
  description?: string | null;
  type?: string | null;
  estimated_value?: number | null;
  priority?: string | null;
  status?: string | null;
  source?: string | null;
  evidence_type?: string | null;
  effort?: string | null;
}

export interface OpportunityUpdate {
  project_id?: string | null;
  client_id?: string | null;
  diagnostic_id?: string | null;
  title?: string;
  description?: string | null;
  type?: string | null;
  estimated_value?: number | null;
  priority?: string | null;
  status?: string | null;
  source?: string | null;
  evidence_type?: string | null;
  effort?: string | null;
}

export async function listOpportunities(): Promise<OpportunityRow[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createOpportunity(opportunity: OpportunityInsert): Promise<OpportunityRow> {
  const { data, error } = await supabase
    .from("opportunities")
    .insert(opportunity)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOpportunity(id: string, opportunity: OpportunityUpdate): Promise<OpportunityRow> {
  const { data, error } = await supabase
    .from("opportunities")
    .update(opportunity)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw error;
}
