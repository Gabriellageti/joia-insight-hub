import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileSearch, ExternalLink } from "lucide-react";
import { DiagnosticDialog } from "@/components/dialogs/DiagnosticDialog";
import type { Diagnostic, Project } from "@/types";

interface ProjectDiagnosticsListProps {
  diagnostics: Diagnostic[];
  project: Project;
}

const statusConfig = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700" },
};

export function ProjectDiagnosticsList({ diagnostics, project }: ProjectDiagnosticsListProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Diagnósticos</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Novo
        </Button>
      </CardHeader>
      <CardContent>
        {diagnostics.length === 0 ? (
          <div className="text-center py-6">
            <FileSearch className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum diagnóstico vinculado.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Criar diagnóstico
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {diagnostics.slice(0, 5).map((diagnostic) => (
              <div
                key={diagnostic.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/diagnosticos/${diagnostic.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{diagnostic.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {diagnostic.templateName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {diagnostic.score !== undefined && diagnostic.status === "completed" && (
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      Score: {diagnostic.score}%
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={statusConfig[diagnostic.status]?.color || ""}
                  >
                    {statusConfig[diagnostic.status]?.label || diagnostic.status}
                  </Badge>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <DiagnosticDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
