import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/contexts/DataContext";
import { formatRelativeUpdate, resolveStatusLabel } from "@/lib/diagnostics";
import { DiagnosticExecution } from "@/components/diagnostico/execution";
import { DiagnosticAnswer } from "@/types/diagnostic-execution";
import { toast } from "sonner";
import { Play, FileBarChart2, ArrowLeft } from "lucide-react";

export default function DiagnosticoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { diagnostics, templates, updateDiagnostic } = useData();
  const [isExecuting, setIsExecuting] = useState(false);

  const diagnostic = useMemo(() => diagnostics.find((item) => item.id === id), [diagnostics, id]);
  const template = useMemo(
    () => (diagnostic ? templates.find((t) => t.id === diagnostic.templateId) : null),
    [diagnostic, templates]
  );

  if (!diagnostic) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-lg font-semibold">Diagnóstico não encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  const handleStartExecution = () => {
    if (!template) {
      toast.error("Template não encontrado para este diagnóstico");
      return;
    }
    setIsExecuting(true);
  };

  const handleSaveProgress = async (answers: Record<string, DiagnosticAnswer>, progress: number) => {
    const answeredCount = Object.keys(answers).length;
    updateDiagnostic(diagnostic.id, {
      progress,
      answeredQuestions: answeredCount,
      status: progress > 0 ? "in_progress" : diagnostic.status,
      hasResponses: answeredCount > 0,
    });
  };

  const handleComplete = async (answers: Record<string, DiagnosticAnswer>) => {
    const answeredCount = Object.keys(answers).length;
    updateDiagnostic(diagnostic.id, {
      progress: 100,
      answeredQuestions: answeredCount,
      status: "completed",
      hasResponses: true,
      score: Math.round(Math.random() * 30 + 70), // Mock score
    });
    toast.success("Diagnóstico concluído!");
    setIsExecuting(false);
  };

  const handleExitExecution = () => {
    setIsExecuting(false);
  };

  // If in execution mode, show the wizard
  if (isExecuting && template) {
    return (
      <DiagnosticExecution
        diagnostic={diagnostic}
        template={template}
        onSave={handleSaveProgress}
        onComplete={handleComplete}
        onExit={handleExitExecution}
      />
    );
  }

  // Summary view
  const ctaLabel = diagnostic.status === "draft" 
    ? "Iniciar diagnóstico" 
    : diagnostic.status === "in_progress" 
      ? "Continuar diagnóstico" 
      : "Ver respostas";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Diagnóstico</p>
            <h1 className="text-2xl font-semibold">{diagnostic.name}</h1>
            <p className="text-muted-foreground">{diagnostic.projectName} • {diagnostic.clientName}</p>
          </div>
        </div>
        <Badge variant="outline">{resolveStatusLabel(diagnostic.status)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>
            Template: {diagnostic.templateName}
            {template?.estimatedTimeMinutes && ` • Tempo estimado: ~${template.estimatedTimeMinutes} min`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Responsável: {diagnostic.responsibleName || "Não definido"}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{formatRelativeUpdate(diagnostic)}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span className="font-medium">{diagnostic.progress}%</span>
            </div>
            <Progress value={diagnostic.progress} className="h-3" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileBarChart2 className="h-4 w-4" />
              <span>{diagnostic.answeredQuestions}/{diagnostic.totalQuestions} perguntas respondidas</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {diagnostic.dueDate && <Badge variant="outline">Data alvo: {diagnostic.dueDate}</Badge>}
            {diagnostic.opportunities > 0 && (
              <Badge className="bg-accent/10 text-accent-foreground">
                {diagnostic.opportunities} oportunidades identificadas
              </Badge>
            )}
            {diagnostic.score !== undefined && diagnostic.status === "completed" && (
              <Badge className="bg-emerald-100 text-emerald-700">
                Score: {diagnostic.score}
              </Badge>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleStartExecution}
            >
              <Play className="h-4 w-4 mr-2" />
              {ctaLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
