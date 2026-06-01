import { FormEvent, useCallback, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Download,
  DollarSign,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Check,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/contexts/DataContext";
import { useFinancial, type FinancialRecord } from "@/hooks/useFinancial";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractDialog } from "@/components/dialogs/ContractDialog";
import type { Contract } from "@/types";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const statusConfig = {
  Pendente: { label: "A vencer", color: "bg-yellow-100 text-yellow-700" },
  Vencido: { label: "Vencido", color: "bg-red-100 text-red-700" },
  Pago: { label: "Pago", color: "bg-green-100 text-green-700" },
};

const expenseCategories = [
  "Folha de pagamento",
  "Impostos",
  "Infraestrutura",
  "Ferramentas",
  "Operações",
  "Marketing",
  "Viagens",
  "Outros",
];

const revenueCategories = [
  "Consultoria",
  "Projeto",
  "Diagnóstico",
  "Treinamento",
  "Recorrente",
  "Outros",
];

const paymentMethods = [
  "Pix",
  "Transferência",
  "Boleto",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Outro",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCsvCell = (value: unknown) => {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
};

const downloadTextFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const isoDate = value.split("T")[0];
  const [year, month, day] = isoDate.split("-");
  if (year && month && day) return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  return value;
};

const formatDateInputValue = (value?: string) => {
  if (!value) return "";
  if (value.includes("-")) return value.split("T")[0];
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return value;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getTodayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

type PeriodFilter = "all" | "current_month" | "last_30" | "year" | "custom";

const parseDateValue = (value?: string) => {
  if (!value) return null;
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const parsed =
    year && month && day
      ? new Date(year, month - 1, day)
      : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getPeriodRange = (filter: PeriodFilter, customStart?: string, customEnd?: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "all") return { start: undefined, end: undefined, label: "Todo período" };
  if (filter === "current_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: toIsoDate(start), end: toIsoDate(end), label: "Mês atual" };
  }
  if (filter === "last_30") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start: toIsoDate(start), end: toIsoDate(today), label: "Últimos 30 dias" };
  }
  if (filter === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    return { start: toIsoDate(start), end: toIsoDate(end), label: "Ano atual" };
  }
  return { start: customStart || undefined, end: customEnd || undefined, label: "Personalizado" };
};

const isDateInRange = (value: string | undefined, start?: string, end?: string) => {
  if (!value) return false;
  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
};

const getReceivableReferenceDate = (record: FinancialRecord) => record.paidAt || record.date;

const parseInstallmentDescription = (description?: string) => {
  if (!description) return null;
  const match = description.match(/^(Mensalidade|Semanalidade|Parcela)\s+(\d+)\/(\d+)\s+-\s+(.+)$/i);
  if (!match) return null;
  return {
    recurrenceLabel: match[1],
    installmentNumber: Number(match[2]),
    installmentTotal: Number(match[3]),
    title: match[4].trim(),
  };
};

export default function Financeiro() {
  const { projects, clients, contracts, deleteContract } = useData();
  const {
    receivables,
    expenses,
    loading,
    addRecord,
    updateRecord,
    deleteRecord,
    markAsPaid,
  } = useFinancial();

  const [editingExpense, setEditingExpense] = useState<FinancialRecord | null>(null);
  const [showReceivableDialog, setShowReceivableDialog] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<FinancialRecord | null>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<FinancialRecord | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [detailClientFilter, setDetailClientFilter] = useState("all");
  const [detailStatusFilter, setDetailStatusFilter] = useState("all");
  const [detailContractFilter, setDetailContractFilter] = useState("all");
  const [detailSearch, setDetailSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseProjectFilter, setExpenseProjectFilter] = useState("all");

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    category: "",
    projectId: "",
    value: "",
    date: getTodayIso(),
  });

  // Receivable form state
  const [receivableForm, setReceivableForm] = useState({
    description: "",
    category: "",
    clientId: "",
    projectId: "",
    value: "",
    dueDate: getTodayIso(),
  });

  const [paymentForm, setPaymentForm] = useState({
    paidAt: getTodayIso(),
    paymentMethod: "",
    paymentNotes: "",
  });

  const getClientName = useCallback((clientId?: string) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client?.nomeFantasia || client?.razaoSocial || "-";
  }, [clients]);

  const getProjectName = useCallback((projectId?: string) => {
    if (!projectId) return "-";
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "-";
  }, [projects]);

  const getReceivableStatus = useCallback((record: FinancialRecord): FinancialRecord["status"] => {
    if (record.status === "Pago") return "Pago";
    if (!record.date) return "Pendente";
    const dueDate = parseDateValue(record.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate && dueDate < today ? "Vencido" : "Pendente";
  }, []);

  const selectedRange = useMemo(
    () => getPeriodRange(periodFilter, customStart, customEnd),
    [periodFilter, customStart, customEnd]
  );

  const periodReceivables = useMemo(
    () =>
      receivables.filter((record) =>
        selectedRange.start || selectedRange.end
          ? isDateInRange(getReceivableReferenceDate(record), selectedRange.start, selectedRange.end)
          : true
      ),
    [receivables, selectedRange]
  );

  const periodExpenses = useMemo(
    () =>
      expenses.filter((record) =>
        selectedRange.start || selectedRange.end
          ? isDateInRange(record.date, selectedRange.start, selectedRange.end)
          : true
      ),
    [expenses, selectedRange]
  );

  const expenseProjectOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const expense of periodExpenses) {
      if (expense.projectId) options.set(expense.projectId, getProjectName(expense.projectId));
    }
    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [getProjectName, periodExpenses]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = expenseSearch.trim().toLowerCase();

    return periodExpenses.filter((expense) => {
      if (expenseCategoryFilter !== "all" && expense.category !== expenseCategoryFilter) return false;
      if (expenseProjectFilter === "internal" && expense.projectId) return false;
      if (expenseProjectFilter !== "all" && expenseProjectFilter !== "internal" && expense.projectId !== expenseProjectFilter) {
        return false;
      }
      if (normalizedSearch) {
        const searchable = [expense.description, expense.category, getProjectName(expense.projectId)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [expenseCategoryFilter, expenseProjectFilter, expenseSearch, getProjectName, periodExpenses]);

  const sortedExpenses = useMemo(
    () =>
      [...filteredExpenses].sort((a, b) => {
        const timeA = parseDateValue(a.date)?.getTime() || 0;
        const timeB = parseDateValue(b.date)?.getTime() || 0;
        return timeB - timeA;
      }),
    [filteredExpenses]
  );

  const dashboardSummary = useMemo(() => {
    const today = getTodayIso();
    const paidReceivables = periodReceivables.filter((r) => r.status === "Pago");
    const openReceivables = periodReceivables.filter((r) => r.status !== "Pago");
    const overdueReceivables = openReceivables.filter((r) => Boolean(r.date && r.date < today));
    const totalRevenue = paidReceivables.reduce((sum, r) => sum + r.amount, 0);
    const pendingAmount = openReceivables.reduce((sum, r) => sum + r.amount, 0);
    const totalExpensesPeriod = periodExpenses.reduce((sum, r) => sum + r.amount, 0);
    const balance = totalRevenue - totalExpensesPeriod;
    const margin = totalRevenue > 0 ? ((totalRevenue - totalExpensesPeriod) / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      pendingAmount,
      totalExpenses: totalExpensesPeriod,
      balance,
      margin,
      paidCount: paidReceivables.length,
      pendingCount: openReceivables.length,
      overdueCount: overdueReceivables.length,
    };
  }, [periodExpenses, periodReceivables]);

  const expenseSummary = useMemo(() => {
    const total = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const average = periodExpenses.length > 0 ? total / periodExpenses.length : 0;
    const internal = periodExpenses.filter((expense) => !expense.projectId).reduce((sum, expense) => sum + expense.amount, 0);
    const projectLinked = total - internal;
    const topExpense = [...periodExpenses].sort((a, b) => b.amount - a.amount)[0];

    return {
      total,
      average,
      internal,
      projectLinked,
      count: periodExpenses.length,
      topExpense,
    };
  }, [periodExpenses]);

  const expenseCategoryData = useMemo(() => {
    const groups = new Map<string, { category: string; total: number; count: number }>();

    for (const expense of periodExpenses) {
      const category = expense.category || "Sem categoria";
      if (!groups.has(category)) groups.set(category, { category, total: 0, count: 0 });
      const group = groups.get(category)!;
      group.total += expense.amount;
      group.count += 1;
    }

    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [periodExpenses]);

  const expenseProjectData = useMemo(() => {
    const groups = new Map<string, { project: string; total: number; count: number }>();

    for (const expense of periodExpenses) {
      const key = expense.projectId || "internal";
      const project = expense.projectId ? getProjectName(expense.projectId) : "Interno / sem projeto";
      if (!groups.has(key)) groups.set(key, { project, total: 0, count: 0 });
      const group = groups.get(key)!;
      group.total += expense.amount;
      group.count += 1;
    }

    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [getProjectName, periodExpenses]);

  const contractGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        clientId?: string;
        clientName: string;
        projectId?: string;
        projectName: string;
        recurrenceLabel: string;
        expectedInstallments: number;
        records: FinancialRecord[];
      }
    >();

    for (const record of periodReceivables) {
      const parsed = parseInstallmentDescription(record.description);
      const title = parsed?.title || record.description || "Receita avulsa";
      const recurrenceLabel = parsed?.recurrenceLabel || record.category || "Avulso";
      const key = `${record.clientId || "sem-cliente"}|${record.projectId || "sem-projeto"}|${title}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title,
          clientId: record.clientId,
          clientName: getClientName(record.clientId),
          projectId: record.projectId,
          projectName: getProjectName(record.projectId),
          recurrenceLabel,
          expectedInstallments: parsed?.installmentTotal || 0,
          records: [],
        });
      }

      const group = groups.get(key)!;
      group.records.push(record);
      group.expectedInstallments = Math.max(group.expectedInstallments, parsed?.installmentTotal || group.records.length);
    }

    return Array.from(groups.values())
      .map((group) => {
        const records = [...group.records].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        const paidRecords = records.filter((record) => record.status === "Pago");
        const received = paidRecords.reduce((sum, record) => sum + record.amount, 0);
        const total = records.reduce((sum, record) => sum + record.amount, 0);
        const overdue = records.filter((record) => getReceivableStatus(record) === "Vencido").length;
        const paymentOffsets = paidRecords
          .map((record) => {
            const dueDate = parseDateValue(record.date);
            const paidDate = parseDateValue(record.paidAt);
            if (!dueDate || !paidDate) return null;
            return Math.round((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          })
          .filter((value): value is number => value !== null);
        const averageOffset =
          paymentOffsets.length > 0
            ? Math.round(paymentOffsets.reduce((sum, value) => sum + value, 0) / paymentOffsets.length)
            : 0;

        return {
          ...group,
          records,
          total,
          received,
          pending: total - received,
          paidCount: paidRecords.length,
          overdue,
          progress: total > 0 ? Math.round((received / total) * 100) : 0,
          firstDueDate: records[0]?.date,
          lastDueDate: records[records.length - 1]?.date,
          averageOffset,
        };
      })
      .sort((a, b) => (a.firstDueDate || "").localeCompare(b.firstDueDate || ""));
  }, [getClientName, getProjectName, getReceivableStatus, periodReceivables]);

  const receivableGroupKeyById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of contractGroups) {
      for (const record of group.records) {
        map.set(record.id, group.key);
      }
    }
    return map;
  }, [contractGroups]);

  const detailClientOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const record of periodReceivables) {
      if (record.clientId) options.set(record.clientId, getClientName(record.clientId));
    }
    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [getClientName, periodReceivables]);

  const detailedReceivables = useMemo(() => {
    const normalizedSearch = detailSearch.trim().toLowerCase();

    return periodReceivables.filter((record) => {
      const status = getReceivableStatus(record);
      const groupKey = receivableGroupKeyById.get(record.id);

      if (detailClientFilter !== "all" && record.clientId !== detailClientFilter) return false;
      if (detailStatusFilter !== "all" && status !== detailStatusFilter) return false;
      if (detailContractFilter !== "all" && groupKey !== detailContractFilter) return false;
      if (normalizedSearch) {
        const searchable = [
          record.description,
          getClientName(record.clientId),
          getProjectName(record.projectId),
          record.paymentMethod,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [
    detailClientFilter,
    detailContractFilter,
    detailSearch,
    detailStatusFilter,
    getClientName,
    getProjectName,
    getReceivableStatus,
    periodReceivables,
    receivableGroupKeyById,
  ]);

  const sortedReceivables = useMemo(
    () =>
      [...detailedReceivables].sort((a, b) => {
        const timeA = parseDateValue(a.date)?.getTime() || 0;
        const timeB = parseDateValue(b.date)?.getTime() || 0;
        return timeA - timeB;
      }),
    [detailedReceivables]
  );

  const cashFlowData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
    const groups = new Map<string, { label: string; recebido: number; despesas: number }>();

    const ensureMonth = (dateValue?: string) => {
      const date = parseDateValue(dateValue);
      if (!date) return null;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups.has(key)) {
        groups.set(key, { label: formatter.format(date), recebido: 0, despesas: 0 });
      }
      return groups.get(key)!;
    };

    periodReceivables
      .filter((record) => record.status === "Pago")
      .forEach((record) => {
        const bucket = ensureMonth(record.paidAt || record.date);
        if (bucket) bucket.recebido += record.amount;
      });

    periodExpenses.forEach((record) => {
      const bucket = ensureMonth(record.date);
      if (bucket) bucket.despesas += record.amount;
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [periodExpenses, periodReceivables]);

  const clientSummaries = useMemo(() => {
    const groups = new Map<string, { clientName: string; received: number; pending: number; overdue: number; count: number }>();

    for (const record of periodReceivables) {
      const key = record.clientId || record.clientName || "sem-cliente";
      if (!groups.has(key)) {
        groups.set(key, { clientName: getClientName(record.clientId), received: 0, pending: 0, overdue: 0, count: 0 });
      }
      const group = groups.get(key)!;
      group.count += 1;
      if (record.status === "Pago") {
        group.received += record.amount;
      } else {
        group.pending += record.amount;
      }
      if (getReceivableStatus(record) === "Vencido") {
        group.overdue += record.amount;
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.received + b.pending - (a.received + a.pending));
  }, [getClientName, getReceivableStatus, periodReceivables]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      description: "",
      category: "",
      projectId: "",
      value: "",
      date: getTodayIso(),
    });
    setEditingExpense(null);
  };

  const resetReceivableForm = () => {
    setReceivableForm({
      description: "",
      category: "",
      clientId: "",
      projectId: "",
      value: "",
      dueDate: getTodayIso(),
    });
    setEditingReceivable(null);
    setShowReceivableDialog(false);
  };

  const handleEditExpense = (expense: FinancialRecord) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description || "",
      category: expense.category || "",
      projectId: expense.projectId || "",
      value: String(expense.amount ?? ""),
      date: formatDateInputValue(expense.date),
    });
  };

  const handleEditReceivable = (receivable: FinancialRecord) => {
    setEditingReceivable(receivable);
    setReceivableForm({
      description: receivable.description || "",
      category: receivable.category || "",
      clientId: receivable.clientId || "",
      projectId: receivable.projectId || "",
      value: String(receivable.amount ?? ""),
      dueDate: formatDateInputValue(receivable.date),
    });
    setShowReceivableDialog(true);
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!expenseForm.description || !expenseForm.category || !expenseForm.value || !expenseForm.date) {
      return;
    }

    const project = projects.find((p) => p.id === expenseForm.projectId);

    const payload = {
      type: "despesa" as const,
      description: expenseForm.description.trim(),
      category: expenseForm.category,
      projectId: expenseForm.projectId || undefined,
      projectName: project?.name,
      amount: Number(expenseForm.value),
      date: expenseForm.date,
      status: "Pago" as const,
      isInternal: true,
    };

    if (editingExpense) {
      await updateRecord(editingExpense.id, payload);
    } else {
      await addRecord(payload);
    }

    resetExpenseForm();
  };

  const handleReceivableSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!receivableForm.description || !receivableForm.value || !receivableForm.dueDate) {
      return;
    }

    const client = clients.find((c) => c.id === receivableForm.clientId);
    const project = projects.find((p) => p.id === receivableForm.projectId);

    const payload = {
      type: "receita" as const,
      description: receivableForm.description.trim(),
      category: receivableForm.category || "Projeto",
      clientId: receivableForm.clientId || undefined,
      clientName: client?.nomeFantasia || client?.razaoSocial,
      projectId: receivableForm.projectId || undefined,
      projectName: project?.name,
      amount: Number(receivableForm.value),
      date: receivableForm.dueDate,
      status: "Pendente" as const,
      isInternal: false,
    };

    if (editingReceivable) {
      await updateRecord(editingReceivable.id, payload);
    } else {
      await addRecord(payload);
    }

    resetReceivableForm();
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteRecord(id);
  };

  const handleDeleteReceivable = async (id: string) => {
    await deleteRecord(id);
  };

  const openPaymentDialog = (record: FinancialRecord) => {
    setPaymentRecord(record);
    setPaymentForm({
      paidAt: formatDateInputValue(record.paidAt) || getTodayIso(),
      paymentMethod: record.paymentMethod || "",
      paymentNotes: record.paymentNotes || "",
    });
  };

  const resetPaymentDialog = () => {
    setPaymentRecord(null);
    setPaymentForm({
      paidAt: getTodayIso(),
      paymentMethod: "",
      paymentNotes: "",
    });
  };

  const handlePaymentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentRecord || !paymentForm.paidAt) return;

    await markAsPaid(paymentRecord.id, {
      paidAt: paymentForm.paidAt,
      paymentMethod: paymentForm.paymentMethod || undefined,
      paymentNotes: paymentForm.paymentNotes.trim() || undefined,
    });
    resetPaymentDialog();
  };

  const handleGenerateReport = () => {
    const generatedAt = new Date().toLocaleString("pt-BR");
    const fileDate = getTodayIso();
    const topClients = clientSummaries.slice(0, 10);
    const topGroups = contractGroups.slice(0, 10);
    const reportReceivables = sortedReceivables.slice(0, 80);
    const reportExpenses = sortedExpenses.slice(0, 80);

    const csvRows = [
      ["Tipo", "Cliente/Projeto", "Descrição", "Categoria/Status", "Data", "Pagamento", "Valor"],
      ...reportReceivables.map((record) => [
        "Receita",
        `${getClientName(record.clientId)} / ${getProjectName(record.projectId)}`,
        record.description || "",
        getReceivableStatus(record) || "Pendente",
        formatDate(record.date),
        record.paidAt ? `${formatDate(record.paidAt)} ${record.paymentMethod || ""}`.trim() : "",
        record.amount.toFixed(2),
      ]),
      ...reportExpenses.map((expense) => [
        "Despesa",
        getProjectName(expense.projectId),
        expense.description || "",
        expense.category || "",
        formatDate(expense.date),
        "",
        expense.amount.toFixed(2),
      ]),
    ];

    const csv = csvRows.map((row) => row.map(formatCsvCell).join(";")).join("\n");
    downloadTextFile(`relatorio-financeiro-joia-labs-${fileDate}.csv`, csv, "text/csv;charset=utf-8");

    const summaryCards = [
      ["Recebido", formatCurrency(dashboardSummary.totalRevenue), `${dashboardSummary.paidCount} pagamento(s)`],
      ["A receber", formatCurrency(dashboardSummary.pendingAmount), `${dashboardSummary.pendingCount} pendência(s)`],
      ["Despesas", formatCurrency(dashboardSummary.totalExpenses), `${periodExpenses.length} lançamento(s)`],
      ["Saldo", formatCurrency(dashboardSummary.balance), "Recebido - despesas"],
      ["Margem", `${dashboardSummary.margin.toFixed(0)}%`, "Receita - despesas"],
    ];

    const buildRows = (rows: string[][]) =>
      rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
        )
        .join("");

    const reportWindow = window.open("", "_blank", "width=1100,height=800");
    if (!reportWindow) return;

    reportWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório Financeiro - JoIA Labs</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
            header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #f4b000; padding-bottom: 18px; margin-bottom: 24px; }
            h1 { margin: 0; font-size: 28px; }
            h2 { margin: 28px 0 12px; font-size: 18px; }
            p { margin: 4px 0; color: #555; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo { width: 42px; height: 42px; border-radius: 10px; background: #f4b000; color: #111; display: grid; place-items: center; font-weight: 800; }
            .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
            .card span { display: block; color: #666; font-size: 12px; }
            .card strong { display: block; margin: 6px 0; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border-bottom: 1px solid #e5e5e5; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f6f6f6; color: #333; }
            .right { text-align: right; }
            .muted { color: #666; font-size: 12px; }
            .print { margin: 24px 0; }
            button { background: #111; color: #fff; border: 0; border-radius: 6px; padding: 10px 14px; cursor: pointer; }
            @media print {
              body { margin: 18mm; }
              .print { display: none; }
              .cards { grid-template-columns: repeat(3, 1fr); }
            }
          </style>
        </head>
        <body>
          <header>
            <div class="brand">
              <div class="logo">J</div>
              <div>
                <h1>Relatório Financeiro</h1>
                <p>JoIA Labs · ${escapeHtml(selectedRange.label)}</p>
              </div>
            </div>
            <div class="right">
              <p class="muted">Gerado em</p>
              <strong>${escapeHtml(generatedAt)}</strong>
            </div>
          </header>

          <section class="cards">
            ${summaryCards
              .map(
                ([label, value, detail]) =>
                  `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(detail)}</span></div>`
              )
              .join("")}
          </section>

          <h2>Clientes no período</h2>
          <table>
            <thead><tr><th>Cliente</th><th>Recebido</th><th>A receber</th><th>Vencido</th><th>Lançamentos</th></tr></thead>
            <tbody>
              ${buildRows(
                topClients.map((client) => [
                  client.clientName,
                  formatCurrency(client.received),
                  formatCurrency(client.pending),
                  formatCurrency(client.overdue),
                  String(client.count),
                ])
              ) || '<tr><td colspan="5">Nenhum cliente com lançamentos.</td></tr>'}
            </tbody>
          </table>

          <h2>Contratos e ciclos</h2>
          <table>
            <thead><tr><th>Ciclo</th><th>Cliente</th><th>Recebido</th><th>A receber</th><th>Progresso</th><th>Período</th></tr></thead>
            <tbody>
              ${buildRows(
                topGroups.map((group) => [
                  group.title,
                  group.clientName,
                  formatCurrency(group.received),
                  formatCurrency(group.pending),
                  `${group.progress}%`,
                  `${formatDate(group.firstDueDate)} a ${formatDate(group.lastDueDate)}`,
                ])
              ) || '<tr><td colspan="6">Nenhum ciclo financeiro no período.</td></tr>'}
            </tbody>
          </table>

          <h2>Contas a receber</h2>
          <table>
            <thead><tr><th>Cliente</th><th>Descrição</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Valor</th></tr></thead>
            <tbody>
              ${buildRows(
                reportReceivables.map((record) => [
                  getClientName(record.clientId),
                  record.description || "-",
                  formatDate(record.date),
                  record.paidAt ? `${formatDate(record.paidAt)} ${record.paymentMethod || ""}`.trim() : "-",
                  statusConfig[getReceivableStatus(record) || "Pendente"].label,
                  formatCurrency(record.amount),
                ])
              ) || '<tr><td colspan="6">Nenhuma conta a receber para os filtros atuais.</td></tr>'}
            </tbody>
          </table>

          <h2>Despesas</h2>
          <table>
            <thead><tr><th>Descrição</th><th>Categoria</th><th>Projeto</th><th>Data</th><th>Valor</th></tr></thead>
            <tbody>
              ${buildRows(
                reportExpenses.map((expense) => [
                  expense.description || "-",
                  expense.category || "-",
                  getProjectName(expense.projectId),
                  formatDate(expense.date),
                  formatCurrency(expense.amount),
                ])
              ) || '<tr><td colspan="5">Nenhuma despesa para os filtros atuais.</td></tr>'}
            </tbody>
          </table>

          <div class="print">
            <button onclick="window.print()">Imprimir ou salvar em PDF</button>
            <p class="muted">O CSV com os lançamentos detalhados foi baixado automaticamente.</p>
          </div>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  const isExpenseFormValid = Boolean(
    expenseForm.description && expenseForm.category && expenseForm.value && expenseForm.date
  );

  const isReceivableFormValid = Boolean(
    receivableForm.description && receivableForm.value && receivableForm.dueDate
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financeiro JoIA</h1>
          <p className="text-muted-foreground">Controle receitas, despesas e margem por projeto</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financeiro JoIA</h1>
          <p className="text-muted-foreground">Controle receitas, despesas e margem por projeto</p>
        </div>
        <Button type="button" variant="outline" onClick={handleGenerateReport}>
          <Download className="mr-2 h-4 w-4" />
          Gerar relatório
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium">Período financeiro</p>
          <p className="text-xs text-muted-foreground">
            Os indicadores consideram recebimentos por data de pagamento e despesas por data de lançamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-44">
            <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="current_month">Mês atual</SelectItem>
                <SelectItem value="last_30">Últimos 30 dias</SelectItem>
                <SelectItem value="year">Ano atual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodFilter === "custom" && (
            <>
              <Input
                className="w-40"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
              <Input
                className="w-40"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardSummary.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardSummary.paidCount} pagamentos em {selectedRange.label.toLowerCase()}
                </p>
              </div>
              <div className="p-3 bg-accent rounded-lg">
                <DollarSign className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardSummary.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardSummary.pendingCount} faturas pendentes
                  {dashboardSummary.overdueCount > 0 && (
                    <span className="text-destructive"> ({dashboardSummary.overdueCount} vencidas)</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardSummary.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">{periodExpenses.length} lançamentos no período</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={dashboardSummary.balance >= 0 ? "border-emerald-200" : "border-destructive/40"}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${dashboardSummary.balance >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                  {formatCurrency(dashboardSummary.balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Recebido - Despesas</p>
              </div>
              <div className={`p-3 rounded-lg ${dashboardSummary.balance >= 0 ? "bg-emerald-100" : "bg-destructive/10"}`}>
                <Wallet className={`h-5 w-5 ${dashboardSummary.balance >= 0 ? "text-emerald-700" : "text-destructive"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margem Média</p>
                <p className="text-2xl font-bold text-accent">{dashboardSummary.margin.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Receita - Despesas</p>
              </div>
              <div className="p-3 bg-accent rounded-lg">
                {dashboardSummary.margin >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-accent-foreground" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-accent-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Fluxo de recebimentos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {cashFlowData.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    Nenhum recebimento no período selecionado.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Number(value) / 1000}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="recebido" name="Recebido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clientes no período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {clientSummaries.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Nenhum cliente com lançamentos.</div>
                ) : (
                  clientSummaries.slice(0, 5).map((client) => (
                    <div key={client.clientName} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{client.clientName}</p>
                          <p className="text-xs text-muted-foreground">{client.count} lançamento(s)</p>
                        </div>
                        {client.overdue > 0 && <Badge className="bg-red-100 text-red-700">Atraso</Badge>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Recebido</p>
                          <p className="font-semibold">{formatCurrency(client.received)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">A receber</p>
                          <p className="font-semibold">{formatCurrency(client.pending)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contratos e ciclos</CardTitle>
                <Button onClick={() => setShowReceivableDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {contractGroups.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Nenhum contrato ou ciclo financeiro no período selecionado.
                </div>
              ) : (
                contractGroups.map((group) => {
                  const expanded = expandedGroups.has(group.key);
                  const isSettled = group.pending <= 0 && group.records.length > 0;
                  return (
                    <div key={group.key} className="rounded-md border border-border">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 p-4 text-left"
                        onClick={() => toggleGroup(group.key)}
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{group.title}</p>
                            <Badge variant="outline">{group.recurrenceLabel}</Badge>
                            {isSettled && <Badge className="bg-green-100 text-green-700">Quitado</Badge>}
                            {group.overdue > 0 && <Badge className="bg-red-100 text-red-700">{group.overdue} atraso(s)</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {group.clientName} · {group.projectName} · {formatDate(group.firstDueDate)} a {formatDate(group.lastDueDate)}
                          </p>
                        </div>
                        <div className="hidden w-72 shrink-0 md:block">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span>{group.paidCount}/{group.expectedInstallments || group.records.length} pagos</span>
                            <span className="font-semibold">{group.progress}%</span>
                          </div>
                          <Progress value={group.progress} className="h-2" />
                        </div>
                        <div className="w-40 shrink-0 text-right">
                          <p className="font-semibold">{formatCurrency(group.received)}</p>
                          <p className="text-xs text-muted-foreground">de {formatCurrency(group.total)}</p>
                        </div>
                      </button>

                      <div className="grid gap-3 border-t border-border px-4 py-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Recebido</p>
                          <p className="font-semibold">{formatCurrency(group.received)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">A receber</p>
                          <p className="font-semibold">{formatCurrency(group.pending)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ticket</p>
                          <p className="font-semibold">{formatCurrency(group.records[0]?.amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pontualidade média</p>
                          <p className="font-semibold">
                            {group.averageOffset === 0
                              ? "No vencimento"
                              : group.averageOffset > 0
                                ? `${group.averageOffset} dia(s) após`
                                : `${Math.abs(group.averageOffset)} dia(s) antes`}
                          </p>
                        </div>
                      </div>

                      {expanded && (
                        <div className="border-t border-border p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Parcela</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.records.map((record) => {
                                const status = getReceivableStatus(record);
                                return (
                                  <TableRow key={record.id}>
                                    <TableCell>{record.description || "-"}</TableCell>
                                    <TableCell>{formatCurrency(record.amount)}</TableCell>
                                    <TableCell>{formatDate(record.date)}</TableCell>
                                    <TableCell>
                                      {record.paidAt ? (
                                        <div>
                                          <p>{formatDate(record.paidAt)}</p>
                                          {record.paymentMethod && (
                                            <p className="text-xs text-muted-foreground">{record.paymentMethod}</p>
                                          )}
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={statusConfig[status || "Pendente"].color} variant="outline">
                                        {statusConfig[status || "Pendente"].label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {status !== "Pago" ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => openPaymentDialog(record)}
                                        >
                                          <Check className="mr-2 h-4 w-4" />
                                          Registrar
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openPaymentDialog(record)}
                                          title="Editar baixa"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lançamentos detalhados</CardTitle>
                <Button onClick={() => setShowReceivableDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 md:grid-cols-5">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="receivable-search">Buscar</Label>
                  <Input
                    id="receivable-search"
                    value={detailSearch}
                    onChange={(event) => setDetailSearch(event.target.value)}
                    placeholder="Cliente, contrato, parcela..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={detailClientFilter} onValueChange={setDetailClientFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {detailClientOptions.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={detailStatusFilter} onValueChange={setDetailStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Pendente">A vencer</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contrato/ciclo</Label>
                  <Select value={detailContractFilter} onValueChange={setDetailContractFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {contractGroups.map((group) => (
                        <SelectItem key={group.key} value={group.key}>
                          {group.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end md:col-span-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDetailSearch("");
                      setDetailClientFilter("all");
                      setDetailStatusFilter("all");
                      setDetailContractFilter("all");
                    }}
                  >
                    Limpar filtros
                  </Button>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {sortedReceivables.length} de {periodReceivables.length} lançamento(s)
                  </span>
                </div>
              </div>

              {sortedReceivables.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Nenhuma conta a receber encontrada para os filtros selecionados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReceivables.map((item) => {
                      const status = getReceivableStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{getClientName(item.clientId)}</TableCell>
                          <TableCell>{getProjectName(item.projectId)}</TableCell>
                          <TableCell>{item.description || "-"}</TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{formatDate(item.date)}</TableCell>
                          <TableCell>
                            {item.paidAt ? (
                              <div>
                                <p>{formatDate(item.paidAt)}</p>
                                {item.paymentMethod && (
                                  <p className="text-xs text-muted-foreground">{item.paymentMethod}</p>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[status || "Pendente"].color} variant="outline">
                              {statusConfig[status || "Pendente"].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {status !== "Pago" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openPaymentDialog(item)}
                                  title="Registrar pagamento"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditReceivable(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir receita</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir esta receita? Essa ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteReceivable(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Despesas no período</p>
                <p className="text-2xl font-bold">{formatCurrency(expenseSummary.total)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{expenseSummary.count} lançamento(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Ticket médio</p>
                <p className="text-2xl font-bold">{formatCurrency(expenseSummary.average)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Média por despesa</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Vinculado a projetos</p>
                <p className="text-2xl font-bold">{formatCurrency(expenseSummary.projectLinked)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Custos alocados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Maior despesa</p>
                <p className="truncate text-2xl font-bold">
                  {expenseSummary.topExpense ? formatCurrency(expenseSummary.topExpense.amount) : formatCurrency(0)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {expenseSummary.topExpense?.description || "Sem lançamento"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Despesas por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseCategoryData.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    Nenhuma despesa no período selecionado.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseCategoryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="category" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Number(value) / 1000}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="total" name="Total" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alocação por projeto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenseProjectData.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma alocação no período.</div>
                ) : (
                  expenseProjectData.slice(0, 5).map((item) => (
                    <div key={item.project} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.project}</p>
                          <p className="text-xs text-muted-foreground">{item.count} despesa(s)</p>
                        </div>
                        <p className="shrink-0 font-semibold">{formatCurrency(item.total)}</p>
                      </div>
                      <Progress
                        value={expenseSummary.total > 0 ? Math.round((item.total / expenseSummary.total) * 100) : 0}
                        className="mt-3 h-2"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{editingExpense ? "Editar despesa" : "Registrar nova despesa"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleExpenseSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Descrição</Label>
                    <Input
                      id="expense-description"
                      value={expenseForm.description}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Ex: Licença de software"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-category">Categoria</Label>
                    <Select
                      value={expenseForm.category}
                      onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger id="expense-category">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="expense-project">Projeto (opcional)</Label>
                    <Select
                      value={expenseForm.projectId || "none"}
                      onValueChange={(value) =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          projectId: value === "none" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger id="expense-project">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem projeto</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-date">Data</Label>
                    <Input
                      id="expense-date"
                      type="date"
                      value={expenseForm.date}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, date: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-value">Valor</Label>
                    <Input
                      id="expense-value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={expenseForm.value}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, value: event.target.value }))
                      }
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={!isExpenseFormValid}>
                    {editingExpense ? "Salvar alterações" : "Registrar despesa"}
                  </Button>
                  {editingExpense && (
                    <Button type="button" variant="ghost" onClick={resetExpenseForm}>
                      Cancelar edição
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <CardTitle>Despesas registradas</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Total filtrado: {formatCurrency(sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 md:grid-cols-5">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="expense-search">Buscar</Label>
                  <Input
                    id="expense-search"
                    value={expenseSearch}
                    onChange={(event) => setExpenseSearch(event.target.value)}
                    placeholder="Descrição, categoria, projeto..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select value={expenseProjectFilter} onValueChange={setExpenseProjectFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="internal">Interno / sem projeto</SelectItem>
                      {expenseProjectOptions.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setExpenseSearch("");
                      setExpenseCategoryFilter("all");
                      setExpenseProjectFilter("all");
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
                <div className="md:col-span-5">
                  <span className="text-sm text-muted-foreground">
                    {sortedExpenses.length} de {periodExpenses.length} despesa(s)
                  </span>
                </div>
              </div>

              {sortedExpenses.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Nenhuma despesa encontrada para os filtros selecionados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{getProjectName(expense.projectId)}</TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditExpense(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir despesa</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a despesa "{expense.description}"? Essa ação não pode
                                    ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contratos Ativos</CardTitle>
                <Button
                  onClick={() => {
                    setEditingContract(null);
                    setShowContractDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Contrato
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Nenhum contrato cadastrado. Crie um para gerar cobranças automaticamente.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => {
                      const total = contract.installments?.length || 0;
                      const paid = contract.installments?.filter((i) => i.status === "paid").length || 0;
                      return (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            {contract.clientName || getClientName(contract.clientId)}
                          </TableCell>
                          <TableCell>{contract.projectName || getProjectName(contract.projectId)}</TableCell>
                          <TableCell>{formatCurrency(contract.value)}</TableCell>
                          <TableCell>{formatDate(contract.startDate)}</TableCell>
                          <TableCell>{formatDate(contract.endDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {contract.billingType === "mensal"
                                ? "Mensal"
                                : contract.billingType === "semanal"
                                  ? "Semanal"
                                : contract.billingType === "parcela"
                                  ? "Parcelado"
                                  : "Projeto"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {total > 0 ? `${paid}/${total}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingContract(contract);
                                  setShowContractDialog(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir contrato</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Isso remove o contrato. As cobranças já geradas em Contas a Receber permanecem — exclua-as manualmente se necessário.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteContract(contract.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for adding/editing receivable */}
      <Dialog open={showReceivableDialog} onOpenChange={setShowReceivableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReceivable ? "Editar Receita" : "Nova Receita"}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleReceivableSubmit}>
            <div className="space-y-2">
              <Label htmlFor="receivable-description">Descrição</Label>
              <Input
                id="receivable-description"
                value={receivableForm.description}
                onChange={(e) => setReceivableForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Parcela 1/3 do projeto"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="receivable-client">Cliente</Label>
                <Select
                  value={receivableForm.clientId || "none"}
                  onValueChange={(value) =>
                    setReceivableForm((prev) => ({ ...prev, clientId: value === "none" ? "" : value }))
                  }
                >
                  <SelectTrigger id="receivable-client">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cliente</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nomeFantasia || client.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivable-project">Projeto</Label>
                <Select
                  value={receivableForm.projectId || "none"}
                  onValueChange={(value) =>
                    setReceivableForm((prev) => ({ ...prev, projectId: value === "none" ? "" : value }))
                  }
                >
                  <SelectTrigger id="receivable-project">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem projeto</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="receivable-category">Categoria</Label>
                <Select
                  value={receivableForm.category || "Projeto"}
                  onValueChange={(value) => setReceivableForm((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="receivable-category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {revenueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivable-value">Valor</Label>
                <Input
                  id="receivable-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivableForm.value}
                  onChange={(e) => setReceivableForm((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivable-dueDate">Vencimento</Label>
                <Input
                  id="receivable-dueDate"
                  type="date"
                  value={receivableForm.dueDate}
                  onChange={(e) => setReceivableForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetReceivableForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isReceivableFormValid}>
                {editingReceivable ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(paymentRecord)}
        onOpenChange={(open) => {
          if (!open) resetPaymentDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento recebido</DialogTitle>
            <DialogDescription>
              Informe a data em que o valor entrou para concluir a baixa da receita.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handlePaymentSubmit}>
            {paymentRecord && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{paymentRecord.description || "Receita"}</p>
                <p className="text-muted-foreground">
                  {getClientName(paymentRecord.clientId)} · {formatCurrency(paymentRecord.amount)}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment-paidAt">Data do pagamento *</Label>
                <Input
                  id="payment-paidAt"
                  type="date"
                  required
                  value={paymentForm.paidAt}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, paidAt: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Forma de pagamento</Label>
                <Select
                  value={paymentForm.paymentMethod || "none"}
                  onValueChange={(value) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      paymentMethod: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Observações</Label>
              <Input
                id="payment-notes"
                value={paymentForm.paymentNotes}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, paymentNotes: event.target.value }))
                }
                placeholder="Ex: Pago no Pix da conta PJ"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetPaymentDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!paymentForm.paidAt}>
                Confirmar pagamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ContractDialog
        open={showContractDialog}
        onOpenChange={(open) => {
          setShowContractDialog(open);
          if (!open) setEditingContract(null);
        }}
        contract={editingContract}
      />
    </div>
  );
}
