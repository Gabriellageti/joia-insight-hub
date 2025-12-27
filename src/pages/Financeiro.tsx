import { FormEvent, useMemo, useState } from "react";
import {
  CreditCard,
  DollarSign,
  Pencil,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
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
import { useData } from "@/contexts/DataContext";

interface Receivable {
  id: string;
  client: string;
  project: string;
  value: number;
  dueDate: string;
  status: "pending" | "overdue" | "paid";
}

const receivables: Receivable[] = [
  { id: "1", client: "Empresa ABC", project: "Otimização de Compras", value: 8500, dueDate: "20/12/2024", status: "pending" },
  { id: "2", client: "Indústria XYZ", project: "Gestão de Estoque", value: 12000, dueDate: "15/12/2024", status: "overdue" },
  { id: "3", client: "Comércio 123", project: "Controle Financeiro", value: 6500, dueDate: "28/12/2024", status: "pending" },
  { id: "4", client: "Serviços JKL", project: "Processos de Vendas", value: 9500, dueDate: "10/12/2024", status: "paid" },
];

const statusConfig = {
  pending: { label: "A vencer", color: "bg-yellow-100 text-yellow-700" },
  overdue: { label: "Vencido", color: "bg-red-100 text-red-700" },
  paid: { label: "Pago", color: "bg-green-100 text-green-700" },
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
  const { expenses, projects, addExpense, updateExpense, deleteExpense } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    description: "",
    category: "",
    projectId: "",
    value: "",
    date: getTodayIso(),
    receipt: "",
  });

  const totalExpenses = useMemo(
    () => expenses.reduce((total, expense) => total + (Number(expense.value) || 0), 0),
    [expenses]
  );

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      }),
    [expenses]
  );

  const resetForm = () => {
    setFormState({
      description: "",
      category: "",
      projectId: "",
      value: "",
      date: getTodayIso(),
      receipt: "",
    });
    setEditingId(null);
  };

  const resolveProjectName = (projectId?: string) => {
    if (!projectId) return undefined;
    return projects.find((project) => project.id === projectId)?.name;
  };

  const handleEdit = (expense: typeof expenses[number]) => {
    setEditingId(expense.id);
    setFormState({
      description: expense.description,
      category: expense.category,
      projectId: expense.projectId || "",
      value: String(expense.value ?? ""),
      date: formatDateInputValue(expense.date),
      receipt: expense.receipt || "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.description || !formState.category || !formState.value || !formState.date) {
      return;
    }

    const payload = {
      description: formState.description.trim(),
      category: formState.category,
      projectId: formState.projectId || undefined,
      projectName: resolveProjectName(formState.projectId || undefined),
      value: Number(formState.value),
      date: formState.date,
      receipt: formState.receipt.trim() || undefined,
    };

    if (editingId) {
      await updateExpense(editingId, payload);
    } else {
      await addExpense(payload);
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
  };

  const isFormValid = Boolean(formState.description && formState.category && formState.value && formState.date);

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
                <p className="text-2xl font-bold">R$ 45.800</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs mês anterior
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
                <p className="text-2xl font-bold">R$ 36.500</p>
                <p className="text-xs text-muted-foreground mt-1">4 faturas pendentes</p>
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
                <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3" />
                  -5% vs mês anterior
                </p>
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
                <p className="text-2xl font-bold text-accent">42%</p>
                <p className="text-xs text-muted-foreground mt-1">Por projeto</p>
              </div>
              <div className="p-3 bg-accent rounded-lg">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
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
          <TabsTrigger value="margin">Margem por Projeto</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.client}</TableCell>
                      <TableCell>{item.project}</TableCell>
                      <TableCell>{formatCurrency(item.value)}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[item.status].color} variant="outline">
                          {statusConfig[item.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar despesa" : "Registrar nova despesa"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Descrição</Label>
                    <Input
                      id="expense-description"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Ex: Licença de software"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-category">Categoria</Label>
                    <Select
                      value={formState.category}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}
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
                      value={formState.projectId || "none"}
                      onValueChange={(value) =>
                        setFormState((prev) => ({
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
                      value={formState.date}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, date: event.target.value }))
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
                      value={formState.value}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, value: event.target.value }))
                      }
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-receipt">Comprovante (link opcional)</Label>
                  <Input
                    id="expense-receipt"
                    value={formState.receipt}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, receipt: event.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={!isFormValid}>
                    {editingId ? "Salvar alterações" : "Registrar despesa"}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="ghost" onClick={resetForm}>
                      Cancelar edição
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <CardTitle>Despesas registradas</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Total: {formatCurrency(totalExpenses)}
                </span>
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
                      <TableHead>Comprovante</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>
                          {expense.projectName ||
                            projects.find((project) => project.id === expense.projectId)?.name ||
                            "Sem projeto"}
                        </TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{formatCurrency(expense.value)}</TableCell>
                        <TableCell>
                          {expense.receipt ? (
                            <a
                              href={expense.receipt}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline underline-offset-4"
                            >
                              Ver comprovante
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(expense)}
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
                                    Tem certeza que deseja excluir a despesa "{expense.description}"?
                                    Essa ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(expense.id)}>
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
            <CardContent className="p-6 text-center text-muted-foreground">
              Módulo de contratos em desenvolvimento...
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margin" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Análise de margem por projeto em desenvolvimento...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
