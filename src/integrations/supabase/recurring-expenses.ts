import { supabase } from "./client";

export type RecurringExpenseFrequency = "monthly" | "quarterly" | "annual";
export interface RecurringExpenseRule { id: string; description: string; category: string; project_id: string | null; amount: number; frequency: RecurringExpenseFrequency; start_date: string; end_date: string | null; day_of_month: number; active: boolean; }

type SupabaseError = { message: string } | null;
const database = supabase as unknown as { rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: SupabaseError }>; from: (table: string) => { select: (columns: string) => { order: (column: string, options: { ascending: boolean }) => Promise<{ data: RecurringExpenseRule[] | null; error: SupabaseError }> } } };

export async function listRecurringExpenseRules(): Promise<RecurringExpenseRule[]> {
  const { data, error } = await database.from("financial_recurring_rules").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createRecurringExpense(input: { description: string; category: string; projectId?: string; amount: number; frequency: RecurringExpenseFrequency; startDate: string; endDate?: string; }) {
  const { error } = await database.rpc("create_financial_recurring_expense", { p_description: input.description, p_category: input.category, p_project_id: input.projectId || null, p_amount: input.amount, p_frequency: input.frequency, p_start_date: input.startDate, p_end_date: input.endDate || null });
  if (error) throw new Error(error.message);
}

export async function setRecurringExpenseActive(id: string, active: boolean) {
  const { error } = await database.rpc("set_financial_recurring_expense_active", { p_rule_id: id, p_active: active });
  if (error) throw new Error(error.message);
}
