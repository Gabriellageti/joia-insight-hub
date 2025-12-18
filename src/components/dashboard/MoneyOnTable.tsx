import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { Opportunity } from "@/types";

const STATUSES: Opportunity["status"][] = ["Identificado", "Em validação", "Em execução", "Resgatado"];
const statusColors = {
  Identificado: "bg-muted",
  "Em validação": "bg-chart-4",
  "Em execução": "bg-chart-3",
  Resgatado: "bg-accent",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);

export function MoneyOnTable() {
  const { opportunities } = useData();

  const grouped = STATUSES.map((status) => {
    const items = opportunities.filter((opportunity) => opportunity.status === status);
    const totalValue = items.reduce((acc, opportunity) => acc + (opportunity.estimatedValue || 0), 0);
    return { status, totalValue, count: items.length };
  });

  const total = grouped.reduce((acc, item) => acc + item.totalValue, 0);
  const hasData = opportunities.length > 0;

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
        {hasData ? (
          <div className="space-y-3">
            {grouped.map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${statusColors[item.status]}`} />
                <span className="text-sm flex-1">{item.status}</span>
                <span className="text-xs text-muted-foreground">{item.count} itens</span>
                <span className="text-sm font-medium">{formatCurrency(item.totalValue)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma oportunidade cadastrada ainda.</p>
        )}
        <p className="text-xs text-muted-foreground mt-4 italic">
          "Não é sobre gastar mais. É sobre parar de perder."
        </p>
      </CardContent>
    </Card>
  );
}
