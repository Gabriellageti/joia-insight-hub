import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Lightbulb, TrendingUp, ArrowRight, Sparkles, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Opportunity } from "@/types";

interface AreaOpportunity {
  area: string;
  opportunities: Opportunity[];
  totalValue: number;
  count: number;
}

interface AreaSuggestionCardProps {
  opportunities: Opportunity[];
  onCreateProjects?: (areas: string[]) => void;
  onViewOpportunities?: (area: string) => void;
  className?: string;
}

const AREA_KEYWORDS: Record<string, string[]> = {
  Compras: ["compras", "fornecedor", "aquisição", "procurement", "estoque", "supply", "supplier"],
  Vendas: ["vendas", "comercial", "receita", "faturamento", "cliente", "sales", "revenue"],
  Financeiro: ["financeiro", "custo", "margem", "despesa", "lucro", "cash", "budget", "orçamento"],
  Operações: ["operação", "processo", "eficiência", "produção", "logística", "operacional"],
  RH: ["rh", "pessoas", "colaborador", "treinamento", "equipe", "funcionário", "talent"],
  Tecnologia: ["tecnologia", "sistema", "ti", "automação", "digital", "software"],
};

function classifyOpportunityArea(opportunity: Opportunity): string {
  const text = `${opportunity.description || ""} ${opportunity.type || ""}`.toLowerCase();
  
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return area;
    }
  }
  
  // Default classification based on type
  if (opportunity.type === "Redução de custos") return "Financeiro";
  if (opportunity.type === "Receita incremental") return "Vendas";
  if (opportunity.type === "Eficiência operacional") return "Operações";
  
  return "Outros";
}

function groupOpportunitiesByArea(opportunities: Opportunity[]): AreaOpportunity[] {
  const areaMap = new Map<string, AreaOpportunity>();
  
  opportunities.forEach(opp => {
    const area = classifyOpportunityArea(opp);
    const existing = areaMap.get(area);
    
    if (existing) {
      existing.opportunities.push(opp);
      existing.totalValue += opp.estimatedValue || 0;
      existing.count += 1;
    } else {
      areaMap.set(area, {
        area,
        opportunities: [opp],
        totalValue: opp.estimatedValue || 0,
        count: 1,
      });
    }
  });
  
  // Sort by total value descending
  return Array.from(areaMap.values()).sort((a, b) => b.totalValue - a.totalValue);
}

const areaColors: Record<string, string> = {
  Compras: "bg-blue-500/10 text-blue-700 border-blue-200",
  Vendas: "bg-green-500/10 text-green-700 border-green-200",
  Financeiro: "bg-amber-500/10 text-amber-700 border-amber-200",
  Operações: "bg-purple-500/10 text-purple-700 border-purple-200",
  RH: "bg-pink-500/10 text-pink-700 border-pink-200",
  Tecnologia: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  Outros: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export function AreaSuggestionCard({ 
  opportunities, 
  onCreateProjects,
  onViewOpportunities,
  className 
}: AreaSuggestionCardProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  
  const areaGroups = groupOpportunitiesByArea(opportunities);
  
  if (areaGroups.length === 0) {
    return null;
  }
  
  const totalValue = areaGroups.reduce((sum, area) => sum + area.totalValue, 0);
  
  const toggleArea = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };
  
  const handleCreateProjects = () => {
    if (selectedAreas.length > 0 && onCreateProjects) {
      onCreateProjects(selectedAreas);
      setSelectedAreas([]);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Áreas Identificadas no Kickoff</CardTitle>
              <CardDescription className="text-xs">
                Baseado nas oportunidades identificadas no diagnóstico
              </CardDescription>
            </div>
          </div>
          {totalValue > 0 && (
            <Badge variant="secondary" className="gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(totalValue)} potencial
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {areaGroups.map((areaGroup) => {
            const isSelected = selectedAreas.includes(areaGroup.area);
            const colorClass = areaColors[areaGroup.area] || areaColors.Outros;
            
            return (
              <div
                key={areaGroup.area}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer",
                  colorClass,
                  isSelected && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => toggleArea(areaGroup.area)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleArea(areaGroup.area)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      <span className="font-medium text-sm">{areaGroup.area}</span>
                      <Badge variant="outline" className="text-xs">
                        {areaGroup.count} {areaGroup.count === 1 ? "oportunidade" : "oportunidades"}
                      </Badge>
                    </div>
                    
                    {areaGroup.totalValue > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
                        <TrendingUp className="h-3 w-3" />
                        <span>Valor estimado: {formatCurrency(areaGroup.totalValue)}</span>
                      </div>
                    )}
                  </div>
                  
                  {onViewOpportunities && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOpportunities(areaGroup.area);
                      }}
                    >
                      Ver detalhes
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {onCreateProjects && (
          <div className="pt-2 border-t">
            <Button
              className="w-full"
              disabled={selectedAreas.length === 0}
              onClick={handleCreateProjects}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Criar {selectedAreas.length > 0 
                ? `${selectedAreas.length} projeto${selectedAreas.length > 1 ? "s" : ""}`
                : "projetos"
              } para áreas selecionadas
            </Button>
            {selectedAreas.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Projetos serão criados para: {selectedAreas.join(", ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
