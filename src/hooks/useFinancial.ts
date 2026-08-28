import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createFinancialRecord,
  deleteFinancialRecord,
  getFinancialSummary,
  listFinancialRecords,
  updateFinancialRecord,
  type FinancialRecordRow,
} from "@/integrations/supabase/financial-records";
import { useToast } from "@/components/ui/use-toast";

export interface FinancialRecord {
  id: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  type: "receita" | "despesa";
  category?: string;
  description?: string;
  amount: number;
  date?: string;
  status?: "Pendente" | "Pago" | "Vencido";
  isInternal?: boolean;
  createdAt: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  pendingCount: number;
  overdueCount: number;
  pendingAmount: number;
  margin: number;
}

const formatDateFromIso = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("pt-BR");
};

const mapRecordToLegacy = (record: FinancialRecordRow): FinancialRecord => ({
  id: record.id,
  clientId: record.client_id || undefined,
  projectId: record.project_id || undefined,
  type: record.type as "receita" | "despesa",
  category: record.category || undefined,
  description: record.description || undefined,
  amount: Number(record.amount || 0),
  date: record.date || undefined,
  status: (record.status as FinancialRecord["status"]) || "Pendente",
  isInternal: record.is_internal || false,
  createdAt: formatDateFromIso(record.created_at),
});

export function useFinancial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    pendingCount: 0,
    overdueCount: 0,
    pendingAmount: 0,
    margin: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [recordsData, summaryData] = await Promise.all([
        listFinancialRecords(),
        getFinancialSummary(),
      ]);
      setRecords(recordsData.map(mapRecordToLegacy));
      setSummary(summaryData);
    } catch (error) {
      setError("Não foi possível carregar os dados financeiros.");
      toast({
        title: "Erro ao carregar dados financeiros",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const receivables = records.filter((r) => r.type === "receita");
  const expenses = records.filter((r) => r.type === "despesa");

  const addRecord = async (record: Omit<FinancialRecord, "id" | "createdAt">) => {
    try {
      const payload = {
        client_id: record.clientId || null,
        project_id: record.projectId || null,
        type: record.type,
        category: record.category || null,
        description: record.description || null,
        amount: record.amount,
        date: record.date || null,
        status: record.status || "Pendente",
        is_internal: record.isInternal ?? true,
      };
      const created = await createFinancialRecord(payload);
      setRecords((prev) => [mapRecordToLegacy(created), ...prev]);
      await fetchData(); // Refresh summary
      return mapRecordToLegacy(created);
    } catch (error) {
      toast({
        title: "Erro ao criar registro",
        description: (error as Error).message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    try {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.clientId !== undefined) payload.client_id = updates.clientId || null;
      if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.status !== undefined) payload.status = updates.status;

      const updated = await updateFinancialRecord(id, payload);
      setRecords((prev) => prev.map((r) => (r.id === id ? mapRecordToLegacy(updated) : r)));
      await fetchData(); // Refresh summary
      return mapRecordToLegacy(updated);
    } catch (error) {
      toast({
        title: "Erro ao atualizar registro",
        description: (error as Error).message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      await deleteFinancialRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      await fetchData(); // Refresh summary
    } catch (error) {
      toast({
        title: "Erro ao excluir registro",
        description: (error as Error).message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const markAsPaid = async (id: string) => {
    return updateRecord(id, { status: "Pago" });
  };

  return {
    records,
    receivables,
    expenses,
    summary,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    markAsPaid,
    refresh: fetchData,
  };
}
