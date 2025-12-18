import { DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt } from "lucide-react";
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function Financeiro() {
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
                <p className="text-2xl font-bold">R$ 18.200</p>
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

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Módulo de despesas em desenvolvimento...
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
