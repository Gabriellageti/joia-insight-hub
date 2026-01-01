import { supabase } from "./client";

export interface ClientContactRow {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean | null;
  created_at: string;
}

export interface ClientContactInsert {
  id?: string;
  client_id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean | null;
}

export interface ClientContactUpdate {
  client_id?: string;
  name?: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean | null;
}

export async function listClientContacts(): Promise<ClientContactRow[]> {
  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createClientContact(contact: ClientContactInsert): Promise<ClientContactRow> {
  const { data, error } = await supabase
    .from("client_contacts")
    .insert(contact)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClientContact(id: string, contact: ClientContactUpdate): Promise<ClientContactRow> {
  const { data, error } = await supabase
    .from("client_contacts")
    .update(contact)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClientContact(id: string): Promise<void> {
  const { error } = await supabase.from("client_contacts").delete().eq("id", id);
  if (error) throw error;
}
