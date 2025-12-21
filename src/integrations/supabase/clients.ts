import { assertSupabaseConfigured } from "./client";
import type { Database } from "./types";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export async function listClients(): Promise<ClientRow[]> {
  const supabase = assertSupabaseConfigured();
  const { data, error } = await supabase.from("clients").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createClient(client: ClientInsert): Promise<ClientRow> {
  const supabase = assertSupabaseConfigured();
  const { data, error } = await supabase.from("clients").insert(client).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao criar cliente no Supabase");
  }

  return data;
}

export async function updateClient(id: string, client: ClientUpdate): Promise<ClientRow> {
  const supabase = assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("clients")
    .update(client)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao atualizar cliente no Supabase");
  }

  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = assertSupabaseConfigured();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
