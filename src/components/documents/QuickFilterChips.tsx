import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuickFilter } from "@/types/documents";
import { cn } from "@/lib/utils";

interface QuickFilterChipsProps {
  selectedFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  counts: {
    all: number;
    unlinked: number;
    pending: number;
    rejected: number;
  };
}

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "unlinked", label: "Sem vínculo" },
  { id: "pending", label: "Evidências pendentes" },
  { id: "rejected", label: "Evidências rejeitadas" },
];

export function QuickFilterChips({
  selectedFilter,
  onFilterChange,
  counts,
}: QuickFilterChipsProps) {
  const showUnlinkedAlert = counts.unlinked >= 5;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => {
          const count = counts[filter.id];
          const isSelected = selectedFilter === filter.id;
          
          return (
            <Badge
              key={filter.id}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors px-3 py-1",
                isSelected 
                  ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                  : "hover:bg-secondary"
              )}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-75">({count})</span>
              )}
            </Badge>
          );
        })}
      </div>

      {showUnlinkedAlert && selectedFilter !== "unlinked" && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm text-muted-foreground">
            Você tem {counts.unlinked} arquivos sem vínculo. Vincule para não perder rastreabilidade.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
