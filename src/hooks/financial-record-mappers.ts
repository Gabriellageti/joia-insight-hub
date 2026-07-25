import type { FinancialRecordRow } from "@/integrations/supabase/financial-records";

import type { FinancialRecord, FinancialRecordInput } from "./useFinancial";

const formatDateFromIso = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("pt-BR");
};

export const mapRecordToLegacy = (record: FinancialRecordRow): FinancialRecord => ({
  id: record.id,
  clientId: record.client_id || undefined,
  projectId: record.project_id || undefined,
  contractId: record.contract_id || undefined,
  installmentId: record.installment_id || undefined,
  // Older screens persisted the English aliases. Keep those records visible
  // without rewriting or deleting any financial data in the database.
  type: record.type === "expense" || record.type === "despesa" ? "despesa" : "receita",
  category: record.category || undefined,
  description: record.description || undefined,
  amount: Number(record.amount || 0),
  date: record.date || undefined,
  status: (record.status as FinancialRecord["status"]) || "Pendente",
  paidAt: record.paid_at || undefined,
  paymentMethod: record.payment_method || undefined,
  paymentNotes: record.payment_notes || undefined,
  isInternal: record.is_internal || false,
  createdAt: formatDateFromIso(record.created_at),
});

export const mapRecordToInsert = (record: FinancialRecordInput) => ({
  client_id: record.clientId || null,
  project_id: record.projectId || null,
  contract_id: record.contractId || null,
  installment_id: record.installmentId || null,
  type: record.type,
  category: record.category || null,
  description: record.description || null,
  amount: record.amount,
  date: record.date || null,
  status: record.status || "Pendente",
  paid_at: record.paidAt || null,
  payment_method: record.paymentMethod || null,
  payment_notes: record.paymentNotes || null,
  is_internal: record.isInternal ?? true,
});

export const mapRecordToUpdate = (updates: Partial<FinancialRecord>) => {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.clientId !== undefined) payload.client_id = updates.clientId || null;
  if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
  if (updates.contractId !== undefined) payload.contract_id = updates.contractId || null;
  if (updates.installmentId !== undefined) payload.installment_id = updates.installmentId || null;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.paidAt !== undefined) payload.paid_at = updates.paidAt || null;
  if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod || null;
  if (updates.paymentNotes !== undefined) payload.payment_notes = updates.paymentNotes || null;
  return payload;
};

export const getPaidRecordUpdate = (
  payment: Pick<FinancialRecord, "paidAt" | "paymentMethod" | "paymentNotes">
): Partial<FinancialRecord> => ({ status: "Pago", ...payment });
