import { FormEvent, useMemo, useState } from "react";
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
import { useData } from "@/contexts/DataContext";
import { useFinancial, type FinancialRecord } from "@/hooks/useFinancial";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractDialog } from "@/components/dialogs/ContractDialog";
import type { Contract } from "@/types";

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
    summary,
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

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      }),
    [expenses]
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

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financeiro JoIA</h1>
        <p className="text-muted-foreground">Controle receitas, despesas e margem por projeto</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {receivables.filter((r) => r.status === "Pago").length} pagamentos recebidos
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
                <p className="text-2xl font-bold">{formatCurrency(summary.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.pendingCount} faturas pendentes
                  {summary.overdueCount > 0 && (
                    <span className="text-destructive"> ({summary.overdueCount} vencidas)</span>
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
                <p className="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">{expenses.length} lançamentos</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margem Média</p>
                <p className="text-2xl font-bold text-accent">{summary.margin.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Receita - Despesas</p>
              </div>
              <div className="p-3 bg-accent rounded-lg">
                {summary.margin >= 0 ? (
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

        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contas a Receber</CardTitle>
                <Button onClick={() => setShowReceivableDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedReceivables.length === 0 ? (
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
                <span className="text-sm text-muted-foreground">Total: {formatCurrency(totalExpenses)}</span>
              </div>
            </CardHeader>
            <CardContent>
              {sortedExpenses.length === 0 ? (
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
