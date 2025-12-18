import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface Opportunity {
  status: string;
  value: number;
  count: number;
}

const opportunities: Opportunity[] = [
  { status: "Identificado", value: 125000, count: 8 },
  { status: "Em validação", value: 85000, count: 5 },
  { status: "Em execução", value: 62000, count: 4 },
  { status: "Resgatado", value: 198500, count: 12 },
];

const statusColors = [
  "bg-muted",
  "bg-chart-4",
  "bg-chart-3",
  "bg-accent",
];

export function MoneyOnTable() {
  const total = opportunities.reduce((acc, opp) => acc + opp.value, 0);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-accent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Dinheiro na Mesa
          </CardTitle>
          <span className="text-2xl font-bold text-accent">{formatCurrency(total)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {opportunities.map((opp, index) => (
            <div key={opp.status} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColors[index]}`} />
              <span className="text-sm flex-1">{opp.status}</span>
              <span className="text-xs text-muted-foreground">{opp.count} itens</span>
              <span className="text-sm font-medium">{formatCurrency(opp.value)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 italic">
          "Não é sobre gastar mais. É sobre parar de perder."
        </p>
      </CardContent>
    </Card>
  );
}
