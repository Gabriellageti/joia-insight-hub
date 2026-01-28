import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, User } from "lucide-react";
import { isPastDate } from "@/lib/dates";
import type { Project } from "@/types";

interface ProjectStatusCardProps {
  project: Project;
}

const statusColors = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const statusLabels = {
  green: "Em dia",
  yellow: "Atenção",
  red: "Crítico",
};

const getInitials = (value?: string) =>
  value
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "--";

export function ProjectStatusCard({ project }: ProjectStatusCardProps) {
  const forecastEndDate = project.forecastEndDate || project.endDate || "";
  const overdue = forecastEndDate ? isPastDate(forecastEndDate) : false;
  const responsibleName = project.responsible || project.responsibleNameLegacy || "Responsável pendente";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Status e Datas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${statusColors[project.status]}`} />
          <div className="flex-1">
            <span className="font-medium">{statusLabels[project.status]}</span>
            {project.statusReason && (
              <p className="text-sm text-muted-foreground">{project.statusReason}</p>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {project.statusSource === "manual" ? "Manual" : "Automático"}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Início:</span>
              <span className="font-medium">{project.startDate || "Não definido"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Previsão:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{forecastEndDate || "Não definido"}</span>
                {overdue && <Badge variant="destructive">Atrasado</Badge>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(responsibleName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{responsibleName}</p>
              <p className="text-xs text-muted-foreground">Responsável</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
