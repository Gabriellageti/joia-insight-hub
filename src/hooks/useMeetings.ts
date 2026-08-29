import { useState, useEffect, useCallback, useRef } from "react";
import { useData } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";
import {
  listMeetings,
  createMeeting as createSupabaseMeeting,
  updateMeeting as updateSupabaseMeeting,
  deleteMeeting as deleteSupabaseMeeting,
  syncExternalParticipants,
  listMeetingIdsWithActions,
  type MeetingRow,
} from "@/integrations/supabase/meetings";
import { parseDatePtBR, formatDatePtBR } from "@/lib/dates";
import { format } from "date-fns";

export interface MeetingData {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string;
  clientId: string | null;
  clientName: string;
  date: string;
  time: string;
  type: "online" | "presencial";
  location?: string;
  link?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  agenda?: string;
  participants: string[];
  hasMinutes: boolean;
  minutes?: string;
  decisions?: string;
  duration?: string;
  endTime?: string;
  responsibleUserId?: string | null;
  notes?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  updatedAt?: string;
  createdAt: string;
  // Minutes template
  minutesTemplate?: string;
  hasActions?: boolean;
}

const mapDbToMeeting = (
  row: MeetingRow,
  clients: { id: string; name?: string; razaoSocial?: string }[],
  projects: { id: string; name: string; clientId: string }[]
): MeetingData => {
  const project = projects.find((p) => p.id === row.project_id);
  const client = clients.find((c) => c.id === row.client_id);

  // Parse date and time from timestamp
  let dateStr = "";
  let timeStr = "";
  if (row.date) {
    const dateObj = new Date(row.date);
    if (!isNaN(dateObj.getTime())) {
      dateStr = formatDatePtBR(dateObj);
      timeStr = format(dateObj, "HH:mm");
    }
  }

  const type: "online" | "presencial" = row.meeting_link ? "online" : "presencial";

  const statusMap: Record<string, MeetingData["status"]> = {
    "Agendada": "scheduled",
    "Em andamento": "in_progress",
    "Realizada": "completed",
    "Cancelada": "cancelled",
  };

  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    projectName: project?.name || "",
    clientId: row.client_id,
    clientName: client?.name || client?.razaoSocial || "",
    date: dateStr,
    time: timeStr,
    type,
    location: row.location || undefined,
    link: row.meeting_link || undefined,
    status: statusMap[row.status || "Agendada"] || "scheduled",
    agenda: row.agenda || undefined,
    participants: row.participants || [],
    hasMinutes: !!row.minutes,
    minutes: row.minutes || undefined,
    decisions: row.decisions || undefined,
    duration: row.duration || undefined,
    endTime: row.end_date ? format(new Date(row.end_date), "HH:mm") : undefined,
    responsibleUserId: row.responsible_user_id,
    notes: row.notes || undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at ? formatDatePtBR(new Date(row.created_at)) : "",
  };
};

export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { clients, projects } = useData();
  const hasFetched = useRef(false);
  const clientsRef = useRef(clients);
  const projectsRef = useRef(projects);

  clientsRef.current = clients;
  projectsRef.current = projects;

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, meetingsWithActions] = await Promise.all([listMeetings(), listMeetingIdsWithActions()]);
      const mapped = data.map((row) =>
        ({ ...mapDbToMeeting(row, clientsRef.current, projectsRef.current), hasActions: meetingsWithActions.has(row.id) })
      );
      setMeetings(mapped);
    } catch {
      setError("Não foi possível carregar as reuniões.");
      toast({
        title: "Erro ao carregar reuniões",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      void fetchMeetings();
    }
    window.addEventListener("joia:meetings-changed", fetchMeetings);
    return () => window.removeEventListener("joia:meetings-changed", fetchMeetings);
  }, [fetchMeetings]);

  const addMeeting = useCallback(async (meeting: Omit<MeetingData, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Parse date and time to ISO timestamp
      const dateParsed = parseDatePtBR(meeting.date);
      let dateTime: Date | null = null;
      if (dateParsed && meeting.time) {
        const [hours, minutes] = meeting.time.split(":").map(Number);
        dateTime = new Date(dateParsed);
        dateTime.setHours(hours || 0, minutes || 0, 0, 0);
      }

      const statusMap: Record<string, string> = {
        scheduled: "Agendada",
        in_progress: "Em andamento",
        completed: "Realizada",
        cancelled: "Cancelada",
      };

      const data = await createSupabaseMeeting({
        title: meeting.title,
        project_id: meeting.projectId || null,
        client_id: meeting.clientId || null,
        date: dateTime ? dateTime.toISOString() : null,
        status: statusMap[meeting.status] || "Agendada",
        agenda: meeting.agenda || null,
        participants: meeting.participants,
        minutes: meeting.minutes || null,
        decisions: null,
        meeting_link: meeting.type === "online" ? meeting.link || null : null,
        location: meeting.type === "presencial" ? meeting.location || null : null,
        end_date: meeting.endTime && dateParsed ? (() => { const value = new Date(dateParsed); const [hours, minutes] = meeting.endTime.split(":").map(Number); value.setHours(hours || 0, minutes || 0, 0, 0); return value.toISOString(); })() : null,
        responsible_user_id: meeting.responsibleUserId || null,
        notes: meeting.notes || meeting.minutes || null,
        duration: meeting.duration || null,
      });

      const newMeeting = mapDbToMeeting(data, clientsRef.current, projectsRef.current);
      try {
        await syncExternalParticipants(data.id, meeting.participants);
      } catch {
        toast({ title: "Reunião criada com participantes pendentes", description: "Abra a reunião para completar os participantes que não foram vinculados.", variant: "destructive" });
      }
      setMeetings((prev) => [newMeeting, ...prev]);
      window.dispatchEvent(new Event("joia:meetings-changed"));

      toast({
        title: "Reunião criada",
        description: "A reunião foi agendada com sucesso.",
      });

      return newMeeting;
    } catch (caughtError: unknown) {
      toast({
        title: "Erro ao criar reunião",
        description: "A reunião não foi salva.",
        variant: "destructive",
      });
      throw caughtError;
    }
  }, []);

  const updateMeetingData = useCallback(async (id: string, updates: Partial<MeetingData>) => {
    try {
      const updatePayload: Record<string, unknown> = {};

      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.projectId !== undefined) updatePayload.project_id = updates.projectId;
      if (updates.clientId !== undefined) updatePayload.client_id = updates.clientId;
      if (updates.agenda !== undefined) updatePayload.agenda = updates.agenda;
      if (updates.participants !== undefined) updatePayload.participants = updates.participants;
      if (updates.minutes !== undefined) updatePayload.minutes = updates.minutes;
      if (updates.duration !== undefined) updatePayload.duration = updates.duration;
      if (updates.responsibleUserId !== undefined) updatePayload.responsible_user_id = updates.responsibleUserId || null;
      if (updates.notes !== undefined) updatePayload.notes = updates.notes || null;

      if (updates.date || updates.time) {
        const existingMeeting = meetings.find((m) => m.id === id);
        const dateStr = updates.date || existingMeeting?.date;
        const timeStr = updates.time || existingMeeting?.time;
        
        const dateParsed = parseDatePtBR(dateStr);
        if (dateParsed && timeStr) {
          const [hours, minutes] = timeStr.split(":").map(Number);
          const dateTime = new Date(dateParsed);
          dateTime.setHours(hours || 0, minutes || 0, 0, 0);
          updatePayload.date = dateTime.toISOString();
        }
      }

      if (updates.status !== undefined) {
        const statusMap: Record<string, string> = {
          scheduled: "Agendada",
          completed: "Realizada",
          cancelled: "Cancelada",
          in_progress: "Em andamento",
        };
        updatePayload.status = statusMap[updates.status] || "Agendada";
      }

      if (updates.type !== undefined || updates.link !== undefined || updates.location !== undefined) {
        updatePayload.meeting_link = updates.type === "online" ? updates.link || null : null;
        updatePayload.location = updates.type === "presencial" ? updates.location || null : null;
      }

      if (updates.endTime !== undefined) {
        const existingMeeting = meetings.find((meeting) => meeting.id === id);
        const dateParsed = parseDatePtBR(updates.date || existingMeeting?.date);
        if (dateParsed && updates.endTime) { const [hours, minutes] = updates.endTime.split(":").map(Number); dateParsed.setHours(hours || 0, minutes || 0, 0, 0); updatePayload.end_date = dateParsed.toISOString(); }
      }

      const data = await updateSupabaseMeeting(id, updatePayload);
      const updatedMeeting = mapDbToMeeting(data, clientsRef.current, projectsRef.current);

      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? updatedMeeting : m))
      );
      window.dispatchEvent(new Event("joia:meetings-changed"));

      toast({
        title: "Reunião atualizada",
        description: "As alterações foram salvas.",
      });

      return updatedMeeting;
    } catch (caughtError: unknown) {
      toast({
        title: "Erro ao atualizar reunião",
        description: "As alterações não foram salvas.",
        variant: "destructive",
      });
      throw caughtError;
    }
  }, [meetings]);

  const deleteMeetingData = useCallback(async (id: string) => {
    try {
      await deleteSupabaseMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      window.dispatchEvent(new Event("joia:meetings-changed"));

      toast({
        title: "Reunião excluída",
        description: "A reunião foi removida.",
      });
    } catch (caughtError: unknown) {
      toast({
        title: "Erro ao excluir reunião",
        description: "A reunião foi mantida. Tente novamente.",
        variant: "destructive",
      });
      throw caughtError;
    }
  }, []);

  return {
    meetings,
    loading,
    error,
    addMeeting,
    updateMeeting: updateMeetingData,
    deleteMeeting: deleteMeetingData,
    refetch: fetchMeetings,
  };
}
