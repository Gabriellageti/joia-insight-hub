import { supabase } from "./client";

export interface DeliverableRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string | null;
  due_date: string | null;
  completed_at: string | null;
  responsible: string | null;
  responsible_user_id: string | null;
  item_type: string;
  created_at: string;
  updated_at: string;
}

export interface DeliverableInsert {
  id?: string;
  project_id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  responsible?: string | null;
  responsible_user_id?: string | null;
  item_type?: string;
}

export interface DeliverableUpdate {
  project_id?: string;
  title?: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  responsible?: string | null;
  responsible_user_id?: string | null;
  item_type?: string;
}

export async function listDeliverables(): Promise<DeliverableRow[]> {
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createDeliverable(deliverable: DeliverableInsert): Promise<DeliverableRow> {
  const { data, error } = await supabase
    .from("deliverables")
    .insert(deliverable)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeliverable(id: string, deliverable: DeliverableUpdate): Promise<DeliverableRow> {
  const { data, error } = await supabase
    .from("deliverables")
    .update(deliverable)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDeliverable(id: string): Promise<void> {
  const { error } = await supabase.from("deliverables").delete().eq("id", id);
  if (error) throw error;
}
