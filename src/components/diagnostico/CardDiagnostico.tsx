import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Play, FileBarChart2, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Diagnostic } from "@/types";
import { calculatePendingQuestions, formatRelativeUpdate, isDiagnosticStalled, resolveStatusLabel } from "@/lib/diagnostics";
import { cn } from "@/lib/utils";

interface CardDiagnosticoProps {
  diagnostic: Diagnostic;
  onEdit: (diagnostic: Diagnostic) => void;
  onDelete: (diagnostic: Diagnostic) => void;
  onDuplicate: (diagnostic: Diagnostic) => void;
}

const statusStyles: Record<Diagnostic["status"], string> = {
  draft: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export function CardDiagnostico({ diagnostic, onEdit, onDelete, onDuplicate }: CardDiagnosticoProps) {
  const navigate = useNavigate();
  const pendingQuestions = calculatePendingQuestions(diagnostic);
  const stalled = isDiagnosticStalled(diagnostic);
  const statusLabel = resolveStatusLabel(diagnostic.status);

  const ctaLabel = useMemo(() => {
    if (diagnostic.status === "draft") return "Iniciar";
    if (diagnostic.status === "in_progress") return "Continuar";
    return "Ver resultado";
  }, [diagnostic.status]);

  const handlePrimaryAction = () => {
    navigate(`/diagnosticos/${diagnostic.id}`);
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case "details":
        navigate(`/diagnosticos/${diagnostic.id}`);
        break;
      case "edit":
        onEdit(diagnostic);
        break;
      case "duplicate":
        onDuplicate(diagnostic);
        break;
      case "delete":
        onDelete(diagnostic);
        break;
      default:
        break;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">{diagnostic.clientName}</p>
            <CardTitle className="text-lg leading-tight">{diagnostic.projectName}</CardTitle>
            <p className="text-sm text-muted-foreground">{diagnostic.templateName}</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge className={cn("border", statusStyles[diagnostic.status])} variant="outline">
              {statusLabel}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleMenuAction("details")}>Ver detalhes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction("edit")}>Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction("duplicate")}>Duplicar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => alert("PDF exportado (mock)")}>Exportar PDF</DropdownMenuItem>
                {diagnostic.status === "completed" && (
                  <DropdownMenuItem onClick={() => alert("Oportunidades geradas (mock)")}>Gerar oportunidades</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => handleMenuAction("delete")}>
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Responsável: {diagnostic.responsibleName || "Não definido"}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>Oportunidades: {diagnostic.opportunities}</span>
          {diagnostic.score !== undefined && diagnostic.status === "completed" && (
            <span className="font-semibold text-emerald-700">Score: {diagnostic.score}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatRelativeUpdate(diagnostic)}</span>
          {stalled && <Badge variant="secondary">Parado</Badge>}
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>Faltam {pendingQuestions} perguntas</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{diagnostic.progress}%</span>
          </div>
          <Progress value={diagnostic.progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Template: {diagnostic.templateName}</span>
            {diagnostic.dueDate && <span>Data alvo: {diagnostic.dueDate}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline">Última atualização</Badge>
          <span className="text-muted-foreground">{diagnostic.updatedAt}</span>
          {diagnostic.opportunities > 0 && (
            <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">
              {diagnostic.opportunities} oportunidades
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileBarChart2 className="h-4 w-4" />
          <span>
            {diagnostic.answeredQuestions}/{diagnostic.totalQuestions} respondidas
          </span>
        </div>
        <Button onClick={handlePrimaryAction} className="gap-2">
          {diagnostic.status === "completed" ? <ArrowRight className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
