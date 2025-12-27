import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryPoint {
  id: string;
  indicator_id: string;
  value: number;
  recorded_at: string;
  notes?: string;
}

interface IndicatorChartProps {
  title: string;
  history: HistoryPoint[];
  targetValue?: number | null;
  unit?: string | null;
}

export function IndicatorChart({
  title,
  history,
  targetValue,
  unit,
}: IndicatorChartProps) {
  const chartData = useMemo(() => {
    return history
      .map((point) => ({
        date: point.recorded_at,
        value: point.value,
        label: format(parseISO(point.recorded_at), "dd/MM", { locale: ptBR }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [history]);

  const formatValue = (value: number) => {
    if (unit === "R$" || unit === "BRL") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
      }).format(value);
    }
    if (unit === "%") return `${value.toFixed(1)}%`;
    return `${value}`;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum histórico registrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={60}
            />
            <Tooltip
              formatter={(value: number) => [formatValue(value), "Valor"]}
              labelFormatter={(label) => `Data: ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            {targetValue && (
              <ReferenceLine
                y={targetValue}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                label={{
                  value: "Meta",
                  position: "right",
                  fill: "hsl(var(--primary))",
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--accent))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
