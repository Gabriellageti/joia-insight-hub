import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AssistantScope = { clientId?: string; meetingId?: string; reportId?: string };
export type AssistantCitation = { id: string; label: string; url: string };
export type SuggestedTask = {
  title: string; description: string; priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null; clientId: string | null; projectId: string | null;
  rationale: string; sourceIds: string[];
};
export type AssistantResponse = {
  interactionId: string; answer: string; citations: AssistantCitation[];
  suggestedTasks: SuggestedTask[]; mode: "ai" | "fallback"; model: string;
};
export type AssistantHistoryMessage = { role: "user" | "assistant"; content: string };

export class AssistantDisabledError extends Error {
  constructor() { super("Assistente de IA temporariamente indisponível"); this.name = "AssistantDisabledError"; }
}

export async function getAssistantAvailability(signal: AbortSignal): Promise<boolean> {
  const response = await fetch("/api/assistant", { method: "GET", cache: "no-store", signal });
  const payload = await response.json();
  if (!response.ok || typeof payload?.enabled !== "boolean") throw new Error("Disponibilidade não confirmada");
  return payload.enabled;
}

function citationsFromJson(value: Json): AssistantCitation[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { id: string; label: string; url: string } => Boolean(item && typeof item === "object" && !Array.isArray(item) && typeof item.id === "string" && typeof item.label === "string" && typeof item.url === "string"));
}
function tasksFromJson(value: Json): SuggestedTask[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SuggestedTask => Boolean(item && typeof item === "object" && !Array.isArray(item) && typeof item.title === "string" && typeof item.description === "string"));
}

export async function askAssistant(question: string, scope: AssistantScope, history: AssistantHistoryMessage[]): Promise<AssistantResponse> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
  const response = await fetch("/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ question, scope, history: history.slice(-6) }),
  });
  const payload = await response.json().catch(() => ({})) as Partial<AssistantResponse> & { error?: string; enabled?: boolean; code?: string };
  if (payload.enabled === false || payload.code === "AI_ASSISTANT_DISABLED") throw new AssistantDisabledError();
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o Assistente JoIA.");
  return payload as AssistantResponse;
}

export async function getAssistantInteraction(id: string): Promise<AssistantResponse & { question: string }> {
  const { data, error } = await supabase.from("ai_interactions").select("id,question,answer,citations,suggested_tasks,mode,model,status").eq("id", id).single();
  if (error || !data || data.status !== "success" || !data.answer) throw new Error(error?.message || "Consulta não encontrada.");
  return { interactionId: data.id, question: data.question, answer: data.answer, citations: citationsFromJson(data.citations), suggestedTasks: tasksFromJson(data.suggested_tasks), mode: data.mode as "ai" | "fallback", model: data.model || "", };
}

export async function listAssistantInteractions() {
  const { data, error } = await supabase.from("ai_interactions").select("id,question,mode,status,created_at").order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}
