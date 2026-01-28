import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp } from "lucide-react";
import type { Opportunity } from "@/types";

interface ProjectOpportunitiesListProps {
  opportunities: Opportunity[];
}

const statusConfig = {
  Identificado: { label: "Identificado", color: "bg-muted text-muted-foreground" },
  "Em validação": { label: "Em validação", color: "bg-blue-100 text-blue-700" },
  "Em execução": { label: "Em execução", color: "bg-amber-100 text-amber-700" },
  Resgatado: { label: "Resgatado", color: "bg-green-100 text-green-700" },
};

const typeLabels: Record<string, string> = {
  "Receita incremental": "Receita",
  "Redução de custos": "Custos",
  "Eficiência operacional": "Eficiência",
  "Risco evitado": "Risco",
  Outro: "Outro",
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export function ProjectOpportunitiesList({ opportunities }: ProjectOpportunitiesListProps) {
  const totalValue = useMemo(() => {
    return opportunities.reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);
  }, [opportunities]);

  const opportunitiesByStatus = useMemo(() => {
    const byStatus: Record<string, number> = {};
    opportunities.forEach((opp) => {
      byStatus[opp.status] = (byStatus[opp.status] || 0) + 1;
    });
    return byStatus;
  }, [opportunities]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Oportunidades (Dinheiro na Mesa)</CardTitle>
          {totalValue > 0 && (
            <Badge variant="outline" className="bg-green-100 text-green-700 gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(totalValue)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma oportunidade identificada.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(opportunitiesByStatus).map(([status, count]) => (
                <Badge
                  key={status}
                  variant="outline"
                  className={statusConfig[status as keyof typeof statusConfig]?.color || ""}
                >
                  {statusConfig[status as keyof typeof statusConfig]?.label || status}: {count}
                </Badge>
              ))}
            </div>

            <div className="space-y-2">
              {opportunities.slice(0, 5).map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{opportunity.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[opportunity.type] || opportunity.type}
                      </Badge>
                      {opportunity.estimatedValue && (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(opportunity.estimatedValue)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      statusConfig[opportunity.status as keyof typeof statusConfig]?.color || ""
                    }
                  >
                    {statusConfig[opportunity.status as keyof typeof statusConfig]?.label ||
                      opportunity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
