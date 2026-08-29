import type { MeetingOperationalData } from "@/integrations/supabase/meetings";

export const MEETING_STATUS_LABELS: Record<string, string> = {
  Agendada: "Agendada",
  "Em andamento": "Em andamento",
  Realizada: "Concluída",
  Cancelada: "Cancelada",
};

export function getMeetingCompletionWarnings(data: MeetingOperationalData): string[] {
  const warnings: string[] = [];
  if (!data.meeting.notes?.trim()) warnings.push("A reunião ainda não possui notas.");
  if (!data.decisions.length) warnings.push("Nenhuma decisão foi registrada.");
  if (!data.nextSteps.length && !data.tasks.length) warnings.push("Nenhum próximo passo ou tarefa foi definido.");
  if (data.agendaItems.some((item) => !item.discussed)) warnings.push("Há itens de pauta não marcados como discutidos.");
  return warnings;
}

export function isMeetingStale(input: { status: string | null; date: string | null }, now = new Date()): boolean {
  if (input.status !== "Agendada" || !input.date) return false;
  const scheduled = new Date(input.date);
  return !Number.isNaN(scheduled.getTime()) && scheduled.getTime() < now.getTime();
}

export function hasMeetingWithoutActions(data: Pick<MeetingOperationalData, "meeting" | "decisions" | "nextSteps" | "tasks">): boolean {
  return data.meeting.status === "Realizada" && data.decisions.length === 0 && data.nextSteps.length === 0 && data.tasks.length === 0;
}

export function buildMeetingSummary(data: MeetingOperationalData): string {
  const meetingDate = data.meeting.date ? new Date(data.meeting.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Data não informada";
  const lines = [
    data.meeting.title,
    meetingDate,
    "",
    "Participantes:",
    ...(data.participants.length ? data.participants.map((item) => `- ${item.name}${item.company ? ` (${item.company})` : ""}`) : ["- Nenhum participante registrado"]),
    "",
    "Decisões:",
    ...(data.decisions.length ? data.decisions.map((item) => `- ${item.description}`) : ["- Nenhuma decisão registrada"]),
    "",
    "Próximos passos:",
    ...(data.nextSteps.length ? data.nextSteps.map((item) => `- ${item.description}${item.responsible_name ? ` — ${item.responsible_name}` : ""}${item.due_date ? ` — prazo ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}`) : ["- Nenhum próximo passo registrado"]),
    "",
    "Tarefas geradas:",
    ...(data.tasks.length ? data.tasks.map((item) => `- ${item.title} [${item.status}]`) : ["- Nenhuma tarefa gerada"]),
  ];
  return lines.join("\n");
}
