import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  DollarSign,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Check,
  AlertTriangle,
  BarChart3,
  WalletCards,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useData } from "@/contexts/DataContext";
import { useFinancial, type FinancialRecord } from "@/hooks/useFinancial";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractDialog } from "@/components/dialogs/ContractDialog";
import type { Contract } from "@/types";
import { toast } from "sonner";
import { createRecurringExpense, listRecurringExpenseRules, setRecurringExpenseActive, type RecurringExpenseRule } from "@/integrations/supabase/recurring-expenses";

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
};

const formatDateInputValue = (value?: string) => {
  if (!value) return "";
  if (value.includes("-")) return value;
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return value;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getTodayIso = () => new Date().toISOString().split("T")[0];

export default function Financeiro() {
  const { projects, clients, contracts, deleteContract } = useData();
  const {
    receivables,
    expenses,
    records,
    summary,
    loading,
    error,
    refresh,
    addRecord,
    updateRecord,
    deleteRecord,
    markAsPaid,
    undoPayment,
  } = useFinancial();

  const [editingExpense, setEditingExpense] = useState<FinancialRecord | null>(null);
  const [showReceivableDialog, setShowReceivableDialog] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<FinancialRecord | null>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<FinancialRecord | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paidAt: getTodayIso(),
    paymentMethod: "",
    paymentNotes: "",
  });
  const [receivableSearch, setReceivableSearch] = useState("");
  const [receivableStatusFilter, setReceivableStatusFilter] = useState("all");
  const [payableSearch, setPayableSearch] = useState("");
  const [payableStatusFilter, setPayableStatusFilter] = useState("all");
  const [recurringRules, setRecurringRules] = useState<RecurringExpenseRule[]>([]);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    category: "",
    projectId: "",
    value: "",
    date: getTodayIso(),
    recurring: false,
    frequency: "monthly" as "monthly" | "quarterly" | "annual",
  });

  const loadRecurringRules = async () => {
    try { setRecurringRules(await listRecurringExpenseRules()); } catch (error) { toast.error("Não foi possível carregar as despesas recorrentes.", { description: (error as Error).message }); }
  };

  useEffect(() => { void loadRecurringRules(); }, []);

  // Receivable form state
  const [receivableForm, setReceivableForm] = useState({
    description: "",
    category: "",
    clientId: "",
    projectId: "",
    value: "",
    dueDate: getTodayIso(),
  });

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      }),
    [expenses]
  );

  const filteredExpenses = useMemo(
    () => sortedExpenses.filter((expense) => {
      const search = payableSearch.toLocaleLowerCase("pt-BR");
      const projectName = projects.find((project) => project.id === expense.projectId)?.name;
      const matchesSearch = !search || [expense.description, expense.category, projectName]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(search));
      const matchesStatus = payableStatusFilter === "all" ||
        (payableStatusFilter === "paid" ? expense.status === "Pago" : expense.status !== "Pago");
      return matchesSearch && matchesStatus;
    }),
    [sortedExpenses, payableSearch, payableStatusFilter, projects]
  );

  const sortedReceivables = useMemo(
    () =>
      [...receivables].sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeA - timeB;
      }),
    [receivables]
  );

  const filteredReceivables = useMemo(
    () => sortedReceivables.filter((record) => {
      const search = receivableSearch.toLocaleLowerCase("pt-BR");
      const status = record.status === "Pago" ? "Pago" : record.date && new Date(record.date) < new Date() ? "Vencido" : "Pendente";
      const client = clients.find((item) => item.id === record.clientId);
      const projectName = projects.find((project) => project.id === record.projectId)?.name;
      const matchesSearch = !search || [record.description, client?.nomeFantasia, client?.razaoSocial, projectName]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(search));
      const matchesStatus = receivableStatusFilter === "all" ||
        (receivableStatusFilter === "open" ? status !== "Pago" : status === receivableStatusFilter);
      return matchesSearch && matchesStatus;
    }),
    [sortedReceivables, receivableSearch, receivableStatusFilter, clients, projects]
  );

  const cashFlowRecords = useMemo(
    () => [...records].sort((a, b) => (b.paidAt || b.date || "").localeCompare(a.paidAt || a.date || "")),
    [records]
  );

  const expensesByCategory = useMemo(() => Object.entries(expenses.reduce<Record<string, number>>((totals, expense) => {
    const category = expense.category || "Sem categoria";
    totals[category] = (totals[category] || 0) + expense.amount;
    return totals;
  }, {})).sort(([, a], [, b]) => b - a), [expenses]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const resetExpenseForm = () => {
    setExpenseForm({
      description: "",
      category: "",
      projectId: "",
      value: "",
      date: getTodayIso(),
      recurring: false,
      frequency: "monthly",
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
      recurring: false,
      frequency: "monthly",
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
      status: editingExpense?.status || ("Pendente" as const),
      isInternal: true,
    };

    try {
      if (expenseForm.recurring && !editingExpense) {
        await createRecurringExpense({ description: payload.description, category: payload.category, projectId: payload.projectId, amount: payload.amount, frequency: expenseForm.frequency, startDate: payload.date });
        await Promise.all([refresh(), loadRecurringRules()]);
        toast.success("Despesa recorrente criada com previsão de 12 meses.");
      } else if (editingExpense) {
        await updateRecord(editingExpense.id, payload);
      } else {
        await addRecord(payload);
      }
    } catch (error) {
      toast.error("Não foi possível salvar a despesa.", { description: (error as Error).message });
      return;
    }

    resetExpenseForm();
  };

  const handleToggleRecurringRule = async (rule: RecurringExpenseRule) => {
    try {
      await setRecurringExpenseActive(rule.id, !rule.active);
      await Promise.all([refresh(), loadRecurringRules()]);
      toast.success(rule.active ? "Recorrência pausada e previsões futuras removidas." : "Recorrência reativada.");
    } catch (error) { toast.error("Não foi possível atualizar a recorrência.", { description: (error as Error).message }); }
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
      // Editing the receivable must not implicitly undo an existing payment.
      status: editingReceivable?.status || ("Pendente" as const),
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

  const handleConfirmPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentRecord || !paymentForm.paidAt) return;
    await markAsPaid(paymentRecord.id, {
      paidAt: paymentForm.paidAt,
      paymentMethod: paymentForm.paymentMethod,
      paymentNotes: paymentForm.paymentNotes.trim(),
    });
    setPaymentRecord(null);
  };

  const handleUndoPayment = async () => {
    if (!paymentRecord) return;
    await undoPayment(paymentRecord.id);
    setPaymentRecord(null);
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client?.nomeFantasia || client?.razaoSocial || "-";
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return "-";
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "-";
  };

  const getReceivableStatus = (record: FinancialRecord): FinancialRecord["status"] => {
    if (record.status === "Pago") return "Pago";
    if (!record.date) return "Pendente";
    const dueDate = new Date(record.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today ? "Vencido" : "Pendente";
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Não foi possível carregar o Financeiro</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void refresh()}>Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financeiro JoIA</h1>
        <p className="text-muted-foreground">Controle receitas, despesas e margem por projeto</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="min-w-0 border-accent bg-accent/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Saldo em caixa hoje</p>
                <p className="text-xl font-bold tabular-nums text-foreground">{formatCurrency(summary.cashBalance)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Receitas recebidas − despesas registradas</p>
              </div>
              <div className="shrink-0 rounded-lg bg-accent p-2.5">
                {summary.cashBalance >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-accent-foreground" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-accent-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(summary.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {receivables.filter((r) => r.status === "Pago").length} pagamentos recebidos
                </p>
              </div>
              <div className="shrink-0 rounded-lg bg-accent p-2.5">
                <DollarSign className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(summary.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.pendingCount} faturas pendentes
                  {summary.overdueCount > 0 && (
                    <span className="text-destructive"> ({summary.overdueCount} vencidas)</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 rounded-lg bg-muted p-2.5">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(summary.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">{expenses.length} lançamentos</p>
              </div>
              <div className="shrink-0 rounded-lg bg-muted p-2.5">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <Tabs defaultValue="overview" className="min-w-0">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="expenses">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Próximas ações financeiras</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-4 w-4" /> A receber</div>
                <p className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(summary.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground">{summary.pendingCount} cobrança(s) em aberto</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium"><WalletCards className="h-4 w-4" /> A pagar</div>
                <p className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(summary.payableAmount)}</p>
                <p className="text-xs text-muted-foreground">{summary.payableCount} conta(s) em aberto</p>
              </div>
              {summary.overdueCount > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:col-span-2">
                  <div className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="h-4 w-4" /> Atenção necessária</div>
                  <p className="mt-1 text-sm">Existem {summary.overdueCount} recebimento(s) vencido(s) aguardando regularização.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Saldo projetado</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{formatCurrency(summary.projectedBalance)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Saldo atual + valores a receber − contas a pagar.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables" className="mt-4">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Contas a Receber</CardTitle>
                <Button onClick={() => setShowReceivableDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <Input value={receivableSearch} onChange={(event) => setReceivableSearch(event.target.value)} placeholder="Buscar cliente, projeto ou descrição" className="sm:max-w-sm" />
                <Select value={receivableStatusFilter} onValueChange={setReceivableStatusFilter}>
                  <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem><SelectItem value="open">Em aberto</SelectItem>
                    <SelectItem value="Pendente">A vencer</SelectItem><SelectItem value="Vencido">Vencido</SelectItem><SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredReceivables.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Nenhuma conta a receber cadastrada.
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
                    {filteredReceivables.map((item) => {
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
                                <div>{formatDate(item.paidAt)}</div>
                                {item.paymentMethod && (
                                  <div className="text-xs text-muted-foreground">{item.paymentMethod}</div>
                                )}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[status || "Pendente"].color} variant="outline">
                              {statusConfig[status || "Pendente"].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => openPaymentDialog(item)}
                                title={status === "Pago" ? "Editar pagamento" : "Marcar como pago"}
                              >
                                {status === "Pago" ? (
                                  <Pencil className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
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
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{editingExpense ? "Editar conta" : "Nova conta a pagar"}</CardTitle>
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
                    <Label htmlFor="expense-date">Vencimento</Label>
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

                {!editingExpense && <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="font-medium">Despesa recorrente</p><p className="text-sm text-muted-foreground">Gera contas previstas para os próximos 12 meses.</p></div>
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={expenseForm.recurring} onChange={(event) => setExpenseForm((prev) => ({ ...prev, recurring: event.target.checked }))} />Repetir despesa</label>
                  </div>
                  {expenseForm.recurring && <div className="mt-3 max-w-xs space-y-2"><Label htmlFor="expense-frequency">Frequência</Label><Select value={expenseForm.frequency} onValueChange={(frequency: "monthly" | "quarterly" | "annual") => setExpenseForm((prev) => ({ ...prev, frequency }))}><SelectTrigger id="expense-frequency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem><SelectItem value="annual">Anual</SelectItem></SelectContent></Select></div>}
                </div>}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={!isExpenseFormValid}>
                    {editingExpense ? "Salvar alterações" : "Registrar conta"}
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

          <Card className="min-w-0 overflow-hidden">
            <CardHeader><CardTitle>Despesas recorrentes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recurringRules.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma recorrência cadastrada.</p> : recurringRules.map((rule) => <div key={rule.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{rule.description}</p><p className="text-sm text-muted-foreground">{formatCurrency(Number(rule.amount))} · {{ monthly: "Mensal", quarterly: "Trimestral", annual: "Anual" }[rule.frequency]} · dia {rule.day_of_month}</p></div><Button variant={rule.active ? "outline" : "secondary"} size="sm" onClick={() => void handleToggleRecurringRule(rule)}>{rule.active ? "Pausar" : "Reativar"}</Button></div>)}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <CardTitle>Contas a pagar</CardTitle>
                <span className="text-sm text-muted-foreground">Total: {formatCurrency(totalExpenses)}</span>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <Input value={payableSearch} onChange={(event) => setPayableSearch(event.target.value)} placeholder="Buscar descrição, categoria ou projeto" className="sm:max-w-sm" />
                <Select value={payableStatusFilter} onValueChange={setPayableStatusFilter}>
                  <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="open">Em aberto</SelectItem><SelectItem value="paid">Pagas</SelectItem></SelectContent>
                </Select>
              </div>
              {filteredExpenses.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Nenhuma despesa cadastrada ainda.
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{getProjectName(expense.projectId)}</TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell><Badge variant="outline" className={expense.status === "Pago" ? statusConfig.Pago.color : statusConfig.Pendente.color}>{expense.status === "Pago" ? "Pago" : "A pagar"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="icon" onClick={() => openPaymentDialog(expense)} title={expense.status === "Pago" ? "Editar pagamento" : "Marcar como paga"}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
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

        <TabsContent value="cashflow" className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Movimentações do fluxo de caixa</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Movimentação</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>{cashFlowRecords.map((record) => <TableRow key={record.id}><TableCell>{formatDate(record.paidAt || record.date)}</TableCell><TableCell>{record.type === "receita" ? "Entrada" : "Saída"}</TableCell><TableCell>{record.description || "-"}</TableCell><TableCell>{record.status || "Pendente"}</TableCell><TableCell className={`text-right font-medium ${record.type === "receita" ? "text-green-600" : "text-destructive"}`}>{record.type === "receita" ? "+" : "−"} {formatCurrency(record.amount)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Despesas por categoria</CardTitle></CardHeader><CardContent className="space-y-3">{expensesByCategory.map(([category, amount]) => <div key={category} className="flex items-center justify-between border-b pb-2 text-sm"><span>{category}</span><strong>{formatCurrency(amount)}</strong></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Resumo operacional</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between"><span>Receitas cadastradas</span><strong>{receivables.length}</strong></div><div className="flex justify-between"><span>Despesas cadastradas</span><strong>{expenses.length}</strong></div><div className="flex justify-between"><span>Resultado do mês</span><strong>{formatCurrency(summary.totalRevenue - summary.totalExpenses)}</strong></div><div className="flex justify-between"><span>Margem do mês</span><strong>{summary.margin.toFixed(1)}%</strong></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <CardContent className="min-w-0">
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
                                    <AlertDialogAction onClick={() => void deleteContract(contract.id).catch(() => undefined)}>
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

            {editingReceivable?.status === "Pago" && (
              <div className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Data do pagamento</p>
                    <p className="text-sm text-muted-foreground">{formatDate(editingReceivable.paidAt)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowReceivableDialog(false);
                      openPaymentDialog(editingReceivable);
                    }}
                  >
                    Corrigir detalhes do pagamento
                  </Button>
                </div>
              </div>
            )}

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

      <Dialog open={Boolean(paymentRecord)} onOpenChange={(open) => !open && setPaymentRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paymentRecord?.status === "Pago" ? "Editar pagamento" : paymentRecord?.type === "despesa" ? "Confirmar conta paga" : "Confirmar recebimento"}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleConfirmPayment}>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Data efetiva do pagamento</Label>
              <Input
                id="payment-date"
                type="date"
                required
                value={paymentForm.paidAt}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, paidAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Forma de pagamento (opcional)</Label>
              <Input
                id="payment-method"
                value={paymentForm.paymentMethod}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                placeholder="Ex: PIX, boleto, transferência"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Observações (opcional)</Label>
              <Input
                id="payment-notes"
                value={paymentForm.paymentNotes}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentNotes: event.target.value }))}
                placeholder="Detalhes sobre o recebimento"
              />
            </div>
            <DialogFooter>
              {paymentRecord?.status === "Pago" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive">Desfazer recebimento</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desfazer recebimento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O lançamento voltará para pendente e a data, a forma e as observações do pagamento serão apagadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUndoPayment}>Desfazer recebimento</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="button" variant="ghost" onClick={() => setPaymentRecord(null)}>Cancelar</Button>
              <Button type="submit" disabled={!paymentForm.paidAt}>
                {paymentRecord?.status === "Pago" ? "Salvar detalhes" : paymentRecord?.type === "despesa" ? "Confirmar pagamento" : "Confirmar recebimento"}
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
