import { supabase } from "./client";
import type { Json } from "./types";

export interface ContractRow {
  id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  value: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  billing_type: string | null;
  installments: Json | null;
  created_at: string;
  updated_at: string;
}

export interface ContractInsert {
  id?: string;
  client_id?: string | null;
  project_id?: string | null;
  title: string;
  value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  billing_type?: string | null;
  installments?: Json | null;
}

export interface ContractUpdate {
  client_id?: string | null;
  project_id?: string | null;
  title?: string;
  value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  billing_type?: string | null;
  installments?: Json | null;
}

export async function listContracts(): Promise<ContractRow[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createContract(contract: ContractInsert): Promise<ContractRow> {
  const { data, error } = await supabase
    .from("contracts")
    .insert(contract)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContract(id: string, contract: ContractUpdate): Promise<ContractRow> {
  const { data, error } = await supabase
    .from("contracts")
    .update(contract)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}
