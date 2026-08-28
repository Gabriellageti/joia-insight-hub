import { supabase } from "./client";
import type { Database } from "./types";

export type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];
export type MeetingInsert = Database["public"]["Tables"]["meetings"]["Insert"];
export type MeetingUpdate = Database["public"]["Tables"]["meetings"]["Update"];
export type MeetingAgendaItemRow = Database["public"]["Tables"]["meeting_agenda_items"]["Row"];
export type MeetingDecisionRow = Database["public"]["Tables"]["meeting_decisions"]["Row"];
export type MeetingNextStepRow = Database["public"]["Tables"]["meeting_next_steps"]["Row"];
export type MeetingParticipantRow = Database["public"]["Tables"]["meeting_participants"]["Row"];
export type MeetingActivityRow = Database["public"]["Tables"]["activity_logs"]["Row"];
export type MeetingDocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type MeetingTaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export interface MeetingOperationalData {
  meeting: MeetingRow;
  agendaItems: MeetingAgendaItemRow[];
  decisions: MeetingDecisionRow[];
  nextSteps: MeetingNextStepRow[];
  participants: MeetingParticipantRow[];
  activities: MeetingActivityRow[];
  documents: MeetingDocumentRow[];
  tasks: MeetingTaskRow[];
}

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

export async function getMeeting(id: string): Promise<MeetingRow> {
  const { data, error } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Reunião não encontrada ou sem permissão de acesso.");
  return data;
}

export async function listMeetingIdsWithActions(): Promise<Set<string>> {
  const [decisions, nextSteps, tasks] = await Promise.all([
    supabase.from("meeting_decisions").select("meeting_id"),
    supabase.from("meeting_next_steps").select("meeting_id"),
    supabase.from("tasks").select("source_meeting_id").not("source_meeting_id", "is", null),
  ]);
  for (const result of [decisions, nextSteps, tasks]) if (result.error) throw result.error;
  return new Set([
    ...(decisions.data ?? []).map((item) => item.meeting_id),
    ...(nextSteps.data ?? []).map((item) => item.meeting_id),
    ...(tasks.data ?? []).map((item) => item.source_meeting_id).filter((value): value is string => Boolean(value)),
  ]);
}

export async function getMeetingOperationalData(id: string): Promise<MeetingOperationalData> {
  const [meeting, agenda, decisions, nextSteps, participants, activities, documents, tasks] = await Promise.all([
    getMeeting(id),
    supabase.from("meeting_agenda_items").select("*").eq("meeting_id", id).order("position").order("created_at"),
    supabase.from("meeting_decisions").select("*").eq("meeting_id", id).order("created_at"),
    supabase.from("meeting_next_steps").select("*").eq("meeting_id", id).order("created_at"),
    supabase.from("meeting_participants").select("*").eq("meeting_id", id).order("created_at"),
    supabase.from("activity_logs").select("*").eq("meeting_id", id).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("meeting_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("source_meeting_id", id).order("created_at", { ascending: false }),
  ]);
  for (const result of [agenda, decisions, nextSteps, participants, activities, documents, tasks]) if (result.error) throw result.error;
  return { meeting, agendaItems: agenda.data ?? [], decisions: decisions.data ?? [], nextSteps: nextSteps.data ?? [], participants: participants.data ?? [], activities: activities.data ?? [], documents: documents.data ?? [], tasks: tasks.data ?? [] };
}

export async function updateMeeting(id: string, meeting: MeetingUpdate, expectedUpdatedAt?: string): Promise<MeetingRow> {
  let query = supabase
    .from("meetings")
    .update({ ...meeting, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("A reunião foi alterada em outra sessão. Recarregue antes de salvar novamente.");
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

export async function createAgendaItem(meetingId: string, title: string, description: string | null, position: number) {
  const { data, error } = await supabase.from("meeting_agenda_items").insert({ meeting_id: meetingId, title, description, position }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAgendaItem(id: string, updates: Database["public"]["Tables"]["meeting_agenda_items"]["Update"]) {
  const { data, error } = await supabase.from("meeting_agenda_items").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function reorderAgendaItems(items: Pick<MeetingAgendaItemRow, "id" | "position">[]) {
  await Promise.all(items.map(async (item) => {
    const { error } = await supabase.from("meeting_agenda_items").update({ position: item.position }).eq("id", item.id);
    if (error) throw error;
  }));
}

export async function deleteAgendaItem(id: string) { const { error } = await supabase.from("meeting_agenda_items").delete().eq("id", id); if (error) throw error; }
export async function createDecision(meetingId: string, description: string, agendaItemId?: string | null) { const { data, error } = await supabase.from("meeting_decisions").insert({ meeting_id: meetingId, description, agenda_item_id: agendaItemId || null }).select().single(); if (error) throw error; return data; }
export async function updateDecision(id: string, description: string) { const { data, error } = await supabase.from("meeting_decisions").update({ description }).eq("id", id).select().single(); if (error) throw error; return data; }
export async function deleteDecision(id: string) { const { error } = await supabase.from("meeting_decisions").delete().eq("id", id); if (error) throw error; }

export async function createNextStep(meetingId: string, input: { description: string; responsibleUserId?: string | null; responsibleName?: string | null; dueDate?: string | null }) {
  const { data, error } = await supabase.from("meeting_next_steps").insert({ meeting_id: meetingId, description: input.description, responsible_user_id: input.responsibleUserId || null, responsible_name: input.responsibleName || null, due_date: input.dueDate || null }).select().single();
  if (error) throw error;
  return data;
}
export async function updateNextStep(id: string, updates: Database["public"]["Tables"]["meeting_next_steps"]["Update"]) { const { data, error } = await supabase.from("meeting_next_steps").update(updates).eq("id", id).select().single(); if (error) throw error; return data; }
export async function deleteNextStep(id: string) { const { error } = await supabase.from("meeting_next_steps").delete().eq("id", id); if (error) throw error; }
export async function addParticipant(meetingId: string, participant: Omit<Database["public"]["Tables"]["meeting_participants"]["Insert"], "meeting_id">) { const { data, error } = await supabase.from("meeting_participants").insert({ ...participant, meeting_id: meetingId }).select().single(); if (error) throw error; return data; }
export async function deleteParticipant(id: string) { const { error } = await supabase.from("meeting_participants").delete().eq("id", id); if (error) throw error; }
export async function syncExternalParticipants(meetingId: string, names: string[]) { const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))]; if (!uniqueNames.length) return; const { error } = await supabase.from("meeting_participants").insert(uniqueNames.map((name) => ({ meeting_id: meetingId, participant_type: "external", name }))); if (error) throw error; }
