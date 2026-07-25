import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createFinancialRecord,
  deleteFinancialRecord,
  getFinancialSummary,
  listFinancialRecords,
  updateFinancialRecord,
} from "@/integrations/supabase/financial-records";
import { useToast } from "@/components/ui/use-toast";

export {
  getPaidRecordUpdate,
  mapRecordToInsert,
  mapRecordToLegacy,
  mapRecordToUpdate,
} from "./financial-record-mappers";
import {
  getPaidRecordUpdate,
  mapRecordToInsert,
  mapRecordToLegacy,
  mapRecordToUpdate,
} from "./financial-record-mappers";


export interface FinancialRecord {
  id: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  contractId?: string;
  installmentId?: string;
  type: "receita" | "despesa";
  category?: string;
  description?: string;
  amount: number;
  date?: string;
  status?: "Pendente" | "Pago" | "Vencido";
  paidAt?: string;
  paymentMethod?: string;
  paymentNotes?: string;
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

export type FinancialRecordInput = Omit<FinancialRecord, "id" | "createdAt">;

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

  const fetchData = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [recordsData, summaryData] = await Promise.all([
        listFinancialRecords(),
        getFinancialSummary(),
      ]);
      setRecords(recordsData.map(mapRecordToLegacy));
      setSummary(summaryData);
    } catch (error) {
      console.error("Error fetching financial data:", error);
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

  const addRecord = async (record: FinancialRecordInput) => {
    try {
      const payload = mapRecordToInsert(record);
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
      const payload = mapRecordToUpdate(updates);

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

  const markAsPaid = async (
    id: string,
    payment: Pick<FinancialRecord, "paidAt" | "paymentMethod" | "paymentNotes">
  ) => {
    return updateRecord(id, getPaidRecordUpdate(payment));
  };

  return {
    records,
    receivables,
    expenses,
    summary,
    loading,
    addRecord,
    updateRecord,
    deleteRecord,
    markAsPaid,
    refresh: fetchData,
  };
}
