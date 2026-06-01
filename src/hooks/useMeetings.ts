import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";
import {
  listMeetings,
  createMeeting as createSupabaseMeeting,
  updateMeeting as updateSupabaseMeeting,
  deleteMeeting as deleteSupabaseMeeting,
  type MeetingRow,
} from "@/integrations/supabase/meetings";
import { parseDatePtBR, formatDatePtBR } from "@/lib/dates";
import { format } from "date-fns";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro inesperado";

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
  status: "scheduled" | "completed" | "cancelled";
  agenda?: string;
  participants: string[];
  hasMinutes: boolean;
  minutes?: string;
  decisions?: string;
  duration?: string;
  createdAt: string;
  // Minutes template
  minutesTemplate?: string;
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

  // Determine type based on presence of location/link in agenda or decisions
  const agendaLower = (row.agenda || "").toLowerCase();
  const type: "online" | "presencial" = agendaLower.includes("http") || agendaLower.includes("meet") || agendaLower.includes("zoom") 
    ? "online" 
    : "presencial";

  const statusMap: Record<string, "scheduled" | "completed" | "cancelled"> = {
    "Agendada": "scheduled",
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
    location: type === "presencial" ? row.decisions || undefined : undefined,
    link: type === "online" ? row.decisions || undefined : undefined,
    status: statusMap[row.status || "Agendada"] || "scheduled",
    agenda: row.agenda || undefined,
    participants: row.participants || [],
    hasMinutes: !!row.minutes,
    minutes: row.minutes || undefined,
    decisions: row.decisions || undefined,
    duration: row.duration || undefined,
    createdAt: row.created_at ? formatDatePtBR(new Date(row.created_at)) : "",
  };
};

export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);
  const { clients, projects } = useData();
  const hasFetched = useRef(false);
  const clientsRef = useRef(clients);
  const projectsRef = useRef(projects);

  clientsRef.current = clients;
  projectsRef.current = projects;

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listMeetings();
      const mapped = data.map((row) =>
        mapDbToMeeting(row, clientsRef.current, projectsRef.current)
      );
      setMeetings(mapped);
    } catch (error: unknown) {
      console.error("Error fetching meetings:", error);
      toast({
        title: "Erro ao carregar reuniões",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchMeetings();
    }
  }, [fetchMeetings]);

  const addMeeting = useCallback(async (meeting: Omit<MeetingData, "id" | "createdAt">) => {
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
        decisions: meeting.type === "online" ? meeting.link : meeting.location,
        duration: meeting.duration || null,
      });

      const newMeeting = mapDbToMeeting(data, clientsRef.current, projectsRef.current);
      setMeetings((prev) => [newMeeting, ...prev]);

      toast({
        title: "Reunião criada",
        description: "A reunião foi agendada com sucesso.",
      });

      return newMeeting;
    } catch (error: unknown) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Erro ao criar reunião",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
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
        };
        updatePayload.status = statusMap[updates.status] || "Agendada";
      }

      if (updates.type !== undefined || updates.link !== undefined || updates.location !== undefined) {
        updatePayload.decisions = updates.type === "online" ? updates.link : updates.location;
      }

      const data = await updateSupabaseMeeting(id, updatePayload);
      const updatedMeeting = mapDbToMeeting(data, clientsRef.current, projectsRef.current);

      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? updatedMeeting : m))
      );

      toast({
        title: "Reunião atualizada",
        description: "As alterações foram salvas.",
      });

      return updatedMeeting;
    } catch (error: unknown) {
      console.error("Error updating meeting:", error);
      toast({
        title: "Erro ao atualizar reunião",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    }
  }, [meetings]);

  const deleteMeetingData = useCallback(async (id: string) => {
    try {
      await deleteSupabaseMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));

      toast({
        title: "Reunião excluída",
        description: "A reunião foi removida.",
      });
    } catch (error: unknown) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Erro ao excluir reunião",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    }
  }, []);

  return {
    meetings,
    loading,
    addMeeting,
    updateMeeting: updateMeetingData,
    deleteMeeting: deleteMeetingData,
    refetch: fetchMeetings,
  };
}
