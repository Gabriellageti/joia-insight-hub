import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type AutomationRule = Database["public"]["Tables"]["automation_rules"]["Row"];
export type AutomationRun = Database["public"]["Tables"]["automation_runs"]["Row"];
export type AutomationConnector = Database["public"]["Tables"]["automation_connectors"]["Row"];

export interface AutomationDashboard {
  rules: AutomationRule[];
  runs: AutomationRun[];
  connectors: AutomationConnector[];
}

export interface ScheduledAutomationResult {
  executed: number;
  deduplicated: number;
  ran_at: string;
}

export async function listAutomationDashboard(): Promise<AutomationDashboard> {
  const [rules, runs, connectors] = await Promise.all([
    supabase.from("automation_rules").select("*").order("name"),
    supabase.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(50),
    supabase.from("automation_connectors").select("*").order("label"),
  ]);
  const error = rules.error ?? runs.error ?? connectors.error;
  if (error) throw new Error(error.message);
  return { rules: rules.data ?? [], runs: runs.data ?? [], connectors: connectors.data ?? [] };
}

export async function setAutomationRuleEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("automation_rules").update({ enabled }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function runScheduledAutomations(): Promise<ScheduledAutomationResult> {
  const { data, error } = await supabase.rpc("run_scheduled_automations");
  if (error) throw new Error(error.message);
  const result = data as Json as unknown as ScheduledAutomationResult;
  return result;
}
