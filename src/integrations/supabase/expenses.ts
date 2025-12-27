import { supabase } from "./client";

// Tipos definidos manualmente já que a tabela expenses não está no schema atual
export interface ExpenseRow {
  id: string;
  description: string;
  category: string | null;
  project_id: string | null;
  project_name: string | null;
  value: number;
  date: string | null;
  receipt: string | null;
  created_at: string;
  updated_at: string;
}

type ExpenseInsert = Omit<ExpenseRow, "id" | "created_at" | "updated_at">;
type ExpenseUpdate = Partial<ExpenseInsert> & { updated_at?: string };

export const isMissingExpensesTableMessage = (message?: string): boolean => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes('relation "expenses" does not exist') ||
    normalized.includes("does not exist")
  );
};

export async function listExpenses(): Promise<ExpenseRow[]> {
  const { data, error } = await supabase.from("financial_records").select("*").eq("type", "expense");

  if (error) {
    throw new Error(error.message);
  }

  // Map financial_records to ExpenseRow format
  return (data ?? []).map((record) => ({
    id: record.id,
    description: record.description || "",
    category: record.category,
    project_id: record.project_id,
    project_name: null,
    value: Number(record.amount),
    date: record.date,
    receipt: null,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }));
}

export async function createExpense(expense: ExpenseInsert): Promise<ExpenseRow> {
  const { data, error } = await supabase.from("financial_records").insert({
    type: "expense",
    amount: expense.value,
    description: expense.description,
    category: expense.category,
    project_id: expense.project_id,
    date: expense.date,
  }).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao criar despesa no Supabase");
  }

  return {
    id: data.id,
    description: data.description || "",
    category: data.category,
    project_id: data.project_id,
    project_name: expense.project_name,
    value: Number(data.amount),
    date: data.date,
    receipt: expense.receipt,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updateExpense(id: string, expense: ExpenseUpdate): Promise<ExpenseRow> {
  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  
  if (expense.value !== undefined) updatePayload.amount = expense.value;
  if (expense.description !== undefined) updatePayload.description = expense.description;
  if (expense.category !== undefined) updatePayload.category = expense.category;
  if (expense.project_id !== undefined) updatePayload.project_id = expense.project_id;
  if (expense.date !== undefined) updatePayload.date = expense.date;

  const { data, error } = await supabase
    .from("financial_records")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao atualizar despesa no Supabase");
  }

  return {
    id: data.id,
    description: data.description || "",
    category: data.category,
    project_id: data.project_id,
    project_name: expense.project_name || null,
    value: Number(data.amount),
    date: data.date,
    receipt: expense.receipt || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("financial_records").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
