import { supabase } from "./client";
import type { ConsultingDayPlan } from "@/types";
import type { Database } from "./types";

type ConsultingDayRow = Database["public"]["Tables"]["consulting_day_plans"]["Row"];

const mapPlan = (row: ConsultingDayRow): ConsultingDayPlan => ({
  id: row.id,
  projectId: row.project_id,
  dayNumber: row.day_number,
  theme: row.theme,
  objective: row.objective,
  expectedDecisions: row.expected_decisions,
  meetingDate: row.meeting_date || undefined,
});

export async function listConsultingDayPlans(projectId: string): Promise<ConsultingDayPlan[]> {
  const { data, error } = await supabase
    .from("consulting_day_plans")
    .select("*")
    .eq("project_id", projectId)
    .order("day_number");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPlan);
}

export async function listConsultingDayTaskIds(projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId)
    .not("consulting_day", "is", null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}
