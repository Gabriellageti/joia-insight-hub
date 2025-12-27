import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Indicator } from "@/types";
import { cn } from "@/lib/utils";

interface IndicatorCardProps {
  indicator: Indicator;
  onClick?: () => void;
}

const categoryColors: Record<string, string> = {
  "Compras": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Estoque": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Financeiro": "bg-green-500/10 text-green-600 border-green-500/20",
  "Vendas": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Operacional": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  "RH": "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

const formatValue = (value: number | null | undefined, unit: string | null | undefined) => {
  if (value === null || value === undefined) return "—";
  if (unit === "R$" || unit === "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  }
  if (unit === "%") {
    return `${value.toFixed(1)}%`;
  }
  return `${value}${unit ? ` ${unit}` : ""}`;
};

const getTrendIcon = (trend: string | null | undefined) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4" />;
    case "down":
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4" />;
  }
};

const getTrendColor = (trend: string | null | undefined, isHigherBetter = true) => {
  if (trend === "up") return isHigherBetter ? "text-green-600" : "text-red-600";
  if (trend === "down") return isHigherBetter ? "text-red-600" : "text-green-600";
  return "text-muted-foreground";
};

export function IndicatorCard({ indicator, onClick }: IndicatorCardProps) {
  const currentValue = indicator.currentValue ?? 0;
  const targetValue = indicator.targetValue ?? 0;
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const isAlert = indicator.alertEnabled && targetValue > 0 && progress < 80;

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        isAlert && "border-destructive/50 bg-destructive/5"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="outline"
            className={categoryColors[indicator.category || ""] || "bg-muted"}
          >
            {indicator.category || "Geral"}
          </Badge>
          <div className="flex items-center gap-2">
            {isAlert && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                getTrendColor(indicator.trend)
              )}
            >
              {getTrendIcon(indicator.trend)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-medium text-sm line-clamp-1">{indicator.name}</h3>
          {indicator.projectName && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {indicator.projectName}
            </p>
          )}
        </div>

        <div className="text-2xl font-bold">
          {formatValue(currentValue, indicator.unit)}
        </div>

        {targetValue > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Meta: {formatValue(targetValue, indicator.unit)}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress
              value={Math.min(progress, 100)}
              className={cn("h-1.5", isAlert && "[&>div]:bg-destructive")}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
