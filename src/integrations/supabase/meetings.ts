import { supabase } from "./client";
import type { Database } from "./types";

export type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];
export type MeetingInsert = Database["public"]["Tables"]["meetings"]["Insert"];
export type MeetingUpdate = Database["public"]["Tables"]["meetings"]["Update"];

export async function listMeetings(): Promise<MeetingRow[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMeeting(meeting: MeetingInsert): Promise<MeetingRow> {
  const { data, error } = await supabase
    .from("meetings")
    .insert(meeting)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMeeting(id: string, meeting: MeetingUpdate): Promise<MeetingRow> {
  const { data, error } = await supabase
    .from("meetings")
    .update({ ...meeting, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}
