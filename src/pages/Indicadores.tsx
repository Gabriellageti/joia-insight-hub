import { Plus, Upload, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Indicator {
  id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  target: number;
  trend: "up" | "down" | "stable";
  trendValue: number;
  project: string;
}

const mockIndicators: Indicator[] = [
  { id: "1", name: "Saving em Compras", category: "Compras", value: 125000, unit: "R$", target: 150000, trend: "up", trendValue: 12, project: "Empresa ABC" },
  { id: "2", name: "Giro de Estoque", category: "Estoque", value: 4.2, unit: "x", target: 6, trend: "up", trendValue: 8, project: "Indústria XYZ" },
  { id: "3", name: "Prazo Médio de Pagamento", category: "Financeiro", value: 45, unit: "dias", target: 60, trend: "down", trendValue: 5, project: "Comércio 123" },
  { id: "4", name: "Taxa de Conversão", category: "Vendas", value: 15, unit: "%", target: 20, trend: "stable", trendValue: 0, project: "Serviços JKL" },
];

const categoryColors: Record<string, string> = {
  "Compras": "bg-blue-100 text-blue-700",
  "Estoque": "bg-purple-100 text-purple-700",
  "Financeiro": "bg-green-100 text-green-700",
  "Vendas": "bg-orange-100 text-orange-700",
};

const formatValue = (value: number, unit: string) => {
  if (unit === "R$") {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
  }
  return `${value}${unit}`;
};

export default function Indicadores() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Indicadores</h1>
          <p className="text-muted-foreground">Acompanhe KPIs e prove valor com números</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar Planilha
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Indicador
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockIndicators.map((indicator) => {
          const progress = (indicator.value / indicator.target) * 100;
          const TrendIcon = indicator.trend === "up" ? TrendingUp : indicator.trend === "down" ? TrendingDown : TrendingUp;
          const trendColor = indicator.trend === "up" ? "text-green-600" : indicator.trend === "down" ? "text-red-600" : "text-muted-foreground";

          return (
            <Card key={indicator.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge className={categoryColors[indicator.category]} variant="outline">
                    {indicator.category}
                  </Badge>
                  <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {indicator.trendValue > 0 && "+"}{indicator.trendValue}%
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium text-sm mb-1">{indicator.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{indicator.project}</p>
                
                <div className="text-2xl font-bold mb-2">
                  {formatValue(indicator.value, indicator.unit)}
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Meta: {formatValue(indicator.target, indicator.unit)}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Indicadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Gráficos e visualizações avançadas serão exibidos aqui
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
