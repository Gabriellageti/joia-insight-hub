import { supabase } from "./client";
import type { Database } from "./types";

export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];
type ExpenseUpdate = Database["public"]["Tables"]["expenses"]["Update"];

export const isMissingExpensesTableMessage = (message?: string): boolean => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes('relation "expenses" does not exist')
  );
};

export async function listExpenses(): Promise<ExpenseRow[]> {
  const { data, error } = await supabase.from("expenses").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createExpense(expense: ExpenseInsert): Promise<ExpenseRow> {
  const { data, error } = await supabase.from("expenses").insert(expense).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao criar despesa no Supabase");
  }

  return data;
}

export async function updateExpense(id: string, expense: ExpenseUpdate): Promise<ExpenseRow> {
  const { data, error } = await supabase
    .from("expenses")
    .update(expense)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao atualizar despesa no Supabase");
  }

  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
