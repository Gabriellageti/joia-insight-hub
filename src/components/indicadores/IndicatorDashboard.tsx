import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Indicator } from "@/types";

interface IndicatorDashboardProps {
  indicators: Indicator[];
  groupBy: "category" | "project" | "status";
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function IndicatorDashboard({
  indicators,
  groupBy,
}: IndicatorDashboardProps) {
  const chartData = useMemo(() => {
    const groups = new Map<string, { total: number; onTrack: number; count: number }>();

    indicators.forEach((ind) => {
      const key =
        groupBy === "category"
          ? ind.category || "Sem categoria"
          : groupBy === "project"
          ? ind.projectName || "Sem projeto"
          : ind.status || "Ativo";

      const current = groups.get(key) || { total: 0, onTrack: 0, count: 0 };
      const progress =
        ind.targetValue && ind.targetValue > 0
          ? ((ind.currentValue || 0) / ind.targetValue) * 100
          : 100;

      groups.set(key, {
        total: current.total + (ind.currentValue || 0),
        onTrack: current.onTrack + (progress >= 80 ? 1 : 0),
        count: current.count + 1,
      });
    });

    return Array.from(groups.entries())
      .map(([name, data]) => ({
        name,
        value: data.count,
        onTrack: data.onTrack,
        offTrack: data.count - data.onTrack,
        percentage: data.count > 0 ? Math.round((data.onTrack / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [indicators, groupBy]);

  const summary = useMemo(() => {
    const total = indicators.length;
    const onTrack = indicators.filter((ind) => {
      if (!ind.targetValue || ind.targetValue === 0) return true;
      return ((ind.currentValue || 0) / ind.targetValue) * 100 >= 80;
    }).length;
    const offTrack = total - onTrack;
    const avgProgress =
      total > 0
        ? indicators.reduce((acc, ind) => {
            if (!ind.targetValue || ind.targetValue === 0) return acc + 100;
            return acc + ((ind.currentValue || 0) / ind.targetValue) * 100;
          }, 0) / total
        : 0;

    return { total, onTrack, offTrack, avgProgress: Math.round(avgProgress) };
  }, [indicators]);

  const groupLabel =
    groupBy === "category"
      ? "Categoria"
      : groupBy === "project"
      ? "Projeto"
      : "Status";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary Cards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Indicadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{summary.total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            No Caminho (≥80%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{summary.onTrack}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Precisam Atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">{summary.offTrack}</div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">
            Indicadores por {groupLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Nenhum indicador cadastrado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    name === "onTrack" ? "No caminho" : "Atenção",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="onTrack" stackId="a" fill="hsl(var(--chart-2))" name="No caminho" />
                <Bar dataKey="offTrack" stackId="a" fill="hsl(var(--destructive))" name="Atenção" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
