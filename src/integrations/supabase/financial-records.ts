import { supabase } from "./client";
import type { Database } from "./types";

export type FinancialRecordRow = Database["public"]["Tables"]["financial_records"]["Row"];
export type FinancialRecordInsert = Database["public"]["Tables"]["financial_records"]["Insert"];
export type FinancialRecordUpdate = Database["public"]["Tables"]["financial_records"]["Update"];

const FINANCIAL_RECORD_COLUMNS = [
  "id",
  "client_id",
  "project_id",
  "type",
  "category",
  "description",
  "amount",
  "date",
  "status",
  "paid_at",
  "payment_method",
  "payment_notes",
  "is_internal",
  "created_at",
].join(",");

export async function listFinancialRecords(): Promise<FinancialRecordRow[]> {
  const { data, error } = await supabase
    .from("financial_records")
    .select(FINANCIAL_RECORD_COLUMNS)
    .order("date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listReceivables(): Promise<FinancialRecordRow[]> {
  const { data, error } = await supabase
    .from("financial_records")
    .select(FINANCIAL_RECORD_COLUMNS)
    .eq("type", "receita")
    .order("date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listExpensesRecords(): Promise<FinancialRecordRow[]> {
  const { data, error } = await supabase
    .from("financial_records")
    .select(FINANCIAL_RECORD_COLUMNS)
    .eq("type", "despesa")
    .order("date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createFinancialRecord(record: FinancialRecordInsert): Promise<FinancialRecordRow> {
  const { data, error } = await supabase
    .from("financial_records")
    .insert(record)
    .select(FINANCIAL_RECORD_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateFinancialRecord(id: string, record: FinancialRecordUpdate): Promise<FinancialRecordRow> {
  const { data, error } = await supabase
    .from("financial_records")
    .update(record)
    .eq("id", id)
    .select(FINANCIAL_RECORD_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFinancialRecord(id: string): Promise<void> {
  const { error } = await supabase.from("financial_records").delete().eq("id", id);
  if (error) throw error;
}

export async function getFinancialSummary() {
  const { data: records, error } = await supabase
    .from("financial_records")
    .select("type,amount,date,status,paid_at");

  if (error) throw error;

  return summarizeFinancialRecords(records ?? []);
}

export async function listOverdueReceivables(limit = 2): Promise<FinancialRecordRow[]> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("financial_records")
    .select(FINANCIAL_RECORD_COLUMNS)
    .eq("type", "receita")
    .neq("status", "Pago")
    .lt("date", today)
    .order("date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export function summarizeFinancialRecords(records: Pick<
  FinancialRecordRow,
  "type" | "amount" | "date" | "status" | "paid_at"
>[]) {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const revenues = records.filter((r) => r.type === "receita");
  const expenses = records.filter(
    (r) => r.type === "despesa" && r.date && r.date >= firstDayOfMonth && r.date <= lastDayOfMonth
  );
  const paidRevenuesThisMonth = revenues.filter((r) => {
    if (r.status !== "Pago") return false;
    const paymentDate = r.paid_at || r.date;
    return Boolean(paymentDate && paymentDate >= firstDayOfMonth && paymentDate <= lastDayOfMonth);
  });

  const totalRevenue = paidRevenuesThisMonth.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const pendingReceivables = revenues.filter((r) => r.status !== "Pago");
  const overdueReceivables = revenues.filter((r) => {
    if (r.status === "Pago") return false;
    if (!r.date) return false;
    return new Date(r.date) < now;
  });

  return {
    totalRevenue,
    totalExpenses,
    pendingCount: pendingReceivables.length,
    overdueCount: overdueReceivables.length,
    pendingAmount: pendingReceivables.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
  };
}
