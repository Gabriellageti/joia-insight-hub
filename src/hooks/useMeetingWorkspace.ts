import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  addParticipant,
  createAgendaItem,
  createDecision,
  createNextStep,
  deleteAgendaItem,
  deleteDecision,
  deleteNextStep,
  deleteParticipant,
  getMeetingOperationalData,
  reorderAgendaItems,
  updateAgendaItem,
  updateDecision,
  updateMeeting,
  updateNextStep,
  type MeetingOperationalData,
} from "@/integrations/supabase/meetings";

type NotesSaveState = "saved" | "saving" | "unsaved" | "error" | "conflict";
const NOTES_DRAFT_VERSION = 1;

export function useMeetingWorkspace(meetingId?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<MeetingOperationalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotesState] = useState("");
  const [notesSaveState, setNotesSaveState] = useState<NotesSaveState>("saved");
  const initializedMeetingRef = useRef<string | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (!meetingId) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const next = await getMeetingOperationalData(meetingId);
      setData(next);
      if (initializedMeetingRef.current !== meetingId) {
        const draftKey = `joia:meeting-notes:${meetingId}`;
        let restored = next.meeting.notes || "";
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw) as { version?: number; value?: string; baseUpdatedAt?: string };
            if (draft.version === NOTES_DRAFT_VERSION && typeof draft.value === "string") {
              restored = draft.value;
              setNotesSaveState(draft.baseUpdatedAt === next.meeting.updated_at ? "unsaved" : "conflict");
            }
          }
        } catch {
          localStorage.removeItem(draftKey);
        }
        setNotesState(restored);
        initializedMeetingRef.current = meetingId;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar a reunião.");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => { initializedMeetingRef.current = null; void refresh(true); }, [refresh]);

  useEffect(() => {
    if (!meetingId || !data || notes === (data.meeting.notes || "") || ["conflict", "saving", "error"].includes(notesSaveState)) return;
    setNotesSaveState("unsaved");
    const draftKey = `joia:meeting-notes:${meetingId}`;
    localStorage.setItem(draftKey, JSON.stringify({ version: NOTES_DRAFT_VERSION, value: notes, baseUpdatedAt: data.meeting.updated_at, savedAt: new Date().toISOString() }));
    const timer = window.setTimeout(async () => {
      setNotesSaveState("saving");
      try {
        const stored = await updateMeeting(meetingId, { notes }, data.meeting.updated_at);
        setData((current) => current ? { ...current, meeting: stored } : current);
        localStorage.removeItem(draftKey);
        setNotesSaveState("saved");
      } catch (caught) {
        setNotesSaveState(caught instanceof Error && caught.message.includes("outra sessão") ? "conflict" : "error");
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [data, meetingId, notes, notesSaveState]);

  const setNotes = useCallback((value: string) => {
    setNotesState(value);
    setNotesSaveState("unsaved");
  }, []);

  const discardNotesConflict = useCallback(() => {
    if (!meetingId || !data) return;
    localStorage.removeItem(`joia:meeting-notes:${meetingId}`);
    setNotesState(data.meeting.notes || "");
    setNotesSaveState("saved");
  }, [data, meetingId]);

  const saveNotesOverConflict = useCallback(async () => {
    if (!meetingId) return;
    setNotesSaveState("saving");
    try {
      const stored = await updateMeeting(meetingId, { notes });
      setData((current) => current ? { ...current, meeting: stored } : current);
      localStorage.removeItem(`joia:meeting-notes:${meetingId}`);
      setNotesSaveState("saved");
    } catch {
      setNotesSaveState("error");
    }
  }, [meetingId, notes]);

  const mutate = useCallback(async (operation: () => Promise<unknown>) => {
    await operation();
    await refresh();
    window.dispatchEvent(new Event("joia:meetings-changed"));
  }, [refresh]);

  const finishMeeting = useCallback(async () => {
    if (!meetingId || !data) return;
    let expectedUpdatedAt = data.meeting.updated_at;
    if (notes !== (data.meeting.notes || "")) {
      setNotesSaveState("saving");
      const storedNotes = await updateMeeting(meetingId, { notes }, expectedUpdatedAt);
      expectedUpdatedAt = storedNotes.updated_at;
      localStorage.removeItem(`joia:meeting-notes:${meetingId}`);
      setNotesSaveState("saved");
    }
    await updateMeeting(meetingId, { status: "Realizada" }, expectedUpdatedAt);
    await refresh();
    window.dispatchEvent(new Event("joia:meetings-changed"));
  }, [data, meetingId, notes, refresh]);

  return {
    data, loading, error, notes, notesSaveState, setNotes, refresh,
    discardNotesConflict, saveNotesOverConflict,
    startMeeting: () => mutate(() => updateMeeting(meetingId!, { status: "Em andamento" }, data?.meeting.updated_at)),
    finishMeeting,
    cancelMeeting: () => mutate(() => updateMeeting(meetingId!, { status: "Cancelada" }, data?.meeting.updated_at)),
    addAgendaItem: (title: string, description = "") => mutate(() => createAgendaItem(meetingId!, title, description || null, data?.agendaItems.length || 0)),
    updateAgendaItem: (id: string, updates: Parameters<typeof updateAgendaItem>[1]) => mutate(() => updateAgendaItem(id, updates)),
    deleteAgendaItem: (id: string) => mutate(() => deleteAgendaItem(id)),
    moveAgendaItem: (id: string, direction: -1 | 1) => mutate(async () => {
      const items = data?.agendaItems || [];
      const index = items.findIndex((item) => item.id === id);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return;
      await reorderAgendaItems(items.map((item, itemIndex) => ({ id: item.id, position: itemIndex === index ? swapIndex : itemIndex === swapIndex ? index : itemIndex })));
    }),
    addDecision: (description: string, agendaItemId?: string | null) => mutate(() => createDecision(meetingId!, description, agendaItemId)),
    updateDecision: (id: string, description: string) => mutate(() => updateDecision(id, description)),
    deleteDecision: (id: string) => mutate(() => deleteDecision(id)),
    addNextStep: (input: Parameters<typeof createNextStep>[1]) => mutate(() => createNextStep(meetingId!, input)),
    updateNextStep: (id: string, updates: Parameters<typeof updateNextStep>[1]) => mutate(() => updateNextStep(id, updates)),
    completeNextStep: (id: string, complete: boolean) => mutate(() => updateNextStep(id, { completed_at: complete ? new Date().toISOString() : null, completed_by: complete ? user?.id || null : null })),
    deleteNextStep: (id: string) => mutate(() => deleteNextStep(id)),
    addExternalParticipant: (participant: { name: string; company?: string; email?: string; phone?: string; position?: string }) => mutate(() => addParticipant(meetingId!, { participant_type: "external", ...participant })),
    addInternalParticipant: (userId: string, name: string) => mutate(() => addParticipant(meetingId!, { participant_type: "internal", user_id: userId, name })),
    deleteParticipant: (id: string) => mutate(() => deleteParticipant(id)),
  };
}
