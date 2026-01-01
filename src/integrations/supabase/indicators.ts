import { supabase } from "./client";
import type { Database } from "./types";

export type IndicatorRow = Database["public"]["Tables"]["indicators"]["Row"];
export type IndicatorInsert = Database["public"]["Tables"]["indicators"]["Insert"];
export type IndicatorUpdate = Database["public"]["Tables"]["indicators"]["Update"];

export async function listIndicators(): Promise<IndicatorRow[]> {
  const { data, error } = await supabase
    .from("indicators")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createIndicator(indicator: IndicatorInsert): Promise<IndicatorRow> {
  const { data, error } = await supabase
    .from("indicators")
    .insert(indicator)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateIndicator(id: string, indicator: IndicatorUpdate): Promise<IndicatorRow> {
  const { data, error } = await supabase
    .from("indicators")
    .update(indicator)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIndicator(id: string): Promise<void> {
  const { error } = await supabase.from("indicators").delete().eq("id", id);
  if (error) throw error;
}
