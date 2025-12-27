import { supabase } from "./client";
import type { Database } from "./types";

export type PlaybookRow = Database["public"]["Tables"]["playbooks"]["Row"];
export type PlaybookInsert = Database["public"]["Tables"]["playbooks"]["Insert"];
export type PlaybookUpdate = Database["public"]["Tables"]["playbooks"]["Update"];

export const listPlaybooks = async (): Promise<PlaybookRow[]> => {
  const { data, error } = await supabase.from("playbooks").select("*").order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
};

export const createPlaybook = async (playbook: PlaybookInsert): Promise<PlaybookRow> => {
  const { data, error } = await supabase.from("playbooks").insert(playbook).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updatePlaybookRecord = async (id: string, playbook: PlaybookUpdate): Promise<PlaybookRow> => {
  const { data, error } = await supabase.from("playbooks").update(playbook).eq("id", id).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deletePlaybookRecord = async (id: string): Promise<void> => {
  const { error } = await supabase.from("playbooks").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
};
