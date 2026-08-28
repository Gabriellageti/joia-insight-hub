import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OperationalHealth } from "@/types/operations";

const healthConfig: Record<OperationalHealth, { label: string; className: string }> = {
  healthy: { label: "Saudável", className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" },
  attention: { label: "Atenção", className: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" },
  risk: { label: "Em risco", className: "border-orange-300 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200" },
  critical: { label: "Crítico", className: "border-red-300 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200" },
  completed: { label: "Concluído", className: "border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200" },
};

export function HealthBadge({ health, score, className }: { health: OperationalHealth; score?: number; className?: string }) {
  const config = healthConfig[health];
  return <Badge variant="outline" className={cn(config.className, className)}>{config.label}{typeof score === "number" ? ` · ${score} pts` : ""}</Badge>;
}
