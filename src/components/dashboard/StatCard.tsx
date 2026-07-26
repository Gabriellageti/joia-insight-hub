import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  highlight?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, highlight }: StatCardProps) {
  return (
    <Card className={`h-full transition-colors hover:border-accent ${highlight ? "border-accent bg-accent/5" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={`text-xs ${trend.positive ? "text-green-600" : "text-destructive"}`}>
                {trend.positive ? "+" : ""}{trend.value}% em relação ao mês anterior
              </p>
            )}
          </div>
          <div className={`p-2 rounded-md ${highlight ? "bg-accent" : "bg-muted"}`}>
            <Icon className={`h-5 w-5 ${highlight ? "text-accent-foreground" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
