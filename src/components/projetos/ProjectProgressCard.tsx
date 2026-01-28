import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import type { Project } from "@/types";

interface ProjectProgressCardProps {
  project: Project;
}

export function ProjectProgressCard({ project }: ProjectProgressCardProps) {
  const isManual = project.progressOverrideEnabled;
  const progressValue = Math.round(project.progress);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Progresso</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  {isManual
                    ? `Progresso definido manualmente${project.progressJustification ? `: ${project.progressJustification}` : ""}`
                    : "Calculado automaticamente por tarefas (70%), entregáveis (20%) e fases (10%)"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-foreground">{progressValue}%</span>
          <Badge variant="outline" className="text-xs">
            {isManual ? "Manual" : "Automático"}
          </Badge>
        </div>
        <Progress value={progressValue} className="h-3" />
      </CardContent>
    </Card>
  );
}
