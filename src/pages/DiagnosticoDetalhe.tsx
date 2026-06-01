import { useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/contexts/DataContext";
import { formatRelativeUpdate, resolveStatusLabel, getDefaultDiagnosticName } from "@/lib/diagnostics";
import { DiagnosticExecution } from "@/components/diagnostico/execution";
import { DiagnosticAnswer } from "@/types/diagnostic-execution";
import { toast } from "sonner";
import {
  Play,
  FileBarChart2,
  ArrowLeft,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  calculateDiagnosticScore,
  resolveAnswerValue,
} from "@/lib/diagnostic-evaluation";
import { buildActionPlan, generateRecommendations } from "@/lib/recommendations";
import { DiagnosticReportPayload, ImpactProjection, Task } from "@/types";
import { NextStepsSuggestionModal, SuggestedNextStep } from "@/components/plano-acao";
import { generateNextStepsSuggestions, isKickoffTemplate } from "@/lib/next-steps";

export default function DiagnosticoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { diagnostics, templates, updateDiagnostic, createActionPlan, applyDiagnostic, addTask } = useData();
  const [isExecuting, setIsExecuting] = useState(false);
  const [showNextStepsModal, setShowNextStepsModal] = useState(false);
  const [nextStepsSuggestions, setNextStepsSuggestions] = useState<SuggestedNextStep[]>([]);

  const diagnostic = useMemo(
    () => diagnostics.find((item) => item.id === id),
    [diagnostics, id]
  );

  const template = useMemo(
    () => {
      if (!diagnostic) return null;
      // Tentar encontrar por templateId primeiro
      if (diagnostic.templateId) {
        const found = templates.find((t) => t.id === diagnostic.templateId);
        if (found) return found;
      }
      // Fallback: tentar encontrar por templateName
      if (diagnostic.templateName) {
        const foundByName = templates.find((t) => t.name === diagnostic.templateName);
        if (foundByName) return foundByName;
      }
      // Fallback final: extrair nome do template do nome do diagnóstico (formato: "Template • Projeto • MM/AAAA")
      const diagnosticNameParts = diagnostic.name.split(" • ");
      if (diagnosticNameParts.length >= 1) {
        const possibleTemplateName = diagnosticNameParts[0].trim();
        const foundByDiagName = templates.find((t) => 
          t.name === possibleTemplateName || 
          t.name.includes(possibleTemplateName) ||
          possibleTemplateName.includes(t.name)
        );
        if (foundByDiagName) return foundByDiagName;
      }
      return null;
    },
    [diagnostic, templates]
  );

  const handleConfirmNextSteps = useCallback(
    async (selectedIds: string[]) => {
      if (!diagnostic) return;

      const selectedSuggestions = nextStepsSuggestions.filter((s) =>
        selectedIds.includes(s.id)
      );

      let createdCount = 0;

      for (const suggestion of selectedSuggestions) {
        try {
          if (suggestion.type === "diagnostic" && suggestion.templateId) {
            // Criar novo diagnóstico
            const selectedTemplate = templates.find(
              (t) => t.id === suggestion.templateId
            );
            if (selectedTemplate) {
              await applyDiagnostic({
                projectId: diagnostic.projectId,
                projectName: diagnostic.projectName,
                clientId: diagnostic.clientId,
                clientName: diagnostic.clientName,
                templateId: suggestion.templateId,
                templateName: suggestion.templateName || selectedTemplate.name,
                responsibleName: diagnostic.responsibleName,
                responsibleId: diagnostic.responsibleId,
                name: getDefaultDiagnosticName(
                  suggestion.templateName || selectedTemplate.name,
                  diagnostic.projectName
                ),
              });
              createdCount++;
            }
          } else if (suggestion.type === "task") {
            // Criar nova tarefa
            const newTask: Omit<Task, "id" | "createdAt"> = {
              title: suggestion.title,
              description: suggestion.description,
              projectId: diagnostic.projectId,
              projectName: diagnostic.projectName,
              clientId: diagnostic.clientId,
              clientName: diagnostic.clientName,
              type: "processo",
              responsible: diagnostic.responsibleName || "Equipe JoIA",
              priority: suggestion.priority === "alta" ? "high" : suggestion.priority === "media" ? "medium" : "low",
              dueDate: "",
              status: "backlog",
              evidenceRequired: false,
              sourceDiagnosticId: diagnostic.id,
            };
            addTask(newTask as Task);
            createdCount++;
          }
        } catch (error) {
          console.error("[next-steps:error]", error);
        }
      }

      if (createdCount > 0) {
        toast.success(`${createdCount} ${createdCount === 1 ? "item criado" : "itens criados"} com sucesso!`);
      }
    },
    [diagnostic, nextStepsSuggestions, templates, applyDiagnostic, addTask]
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

  const handleSaveProgress = async (
    answers: Record<string, DiagnosticAnswer>,
    progress: number
  ) => {
    const answeredCount = Object.keys(answers).length;
    updateDiagnostic(diagnostic.id, {
      progress,
      answeredQuestions: answeredCount,
      status: progress > 0 ? "in_progress" : diagnostic.status,
      hasResponses: answeredCount > 0,
    });
  };

  const handleComplete = async (answers: Record<string, DiagnosticAnswer>) => {
    if (!template) return;

    const answeredCount = Object.keys(answers).length;
    const answerValues = Object.fromEntries(
      Object.entries(answers).map(([id, answer]) => [id, resolveAnswerValue(answer)])
    );

    try {
      const scoreSummary = calculateDiagnosticScore(template, answerValues);
      const recommendations = generateRecommendations({
        template,
        answers: answerValues,
        score: scoreSummary.score,
        responsibleName: diagnostic.responsibleName,
      });

      const actionPlan = buildActionPlan({
        diagnostic,
        recommendations,
        score: scoreSummary.score,
      });

      let createdTasks: ReturnType<typeof createActionPlan> = [];
      let kanbanError: string | null = null;

      try {
        createdTasks = createActionPlan({ diagnostic, actionPlan });
      } catch (error) {
        kanbanError = error instanceof Error ? error.message : "Erro ao criar cards no Kanban.";
        console.error("[diagnostic:kanban:error]", {
          diagnosticId: diagnostic.id,
          error: kanbanError,
        });
      }

      const reportPayload: DiagnosticReportPayload = {
        diagnosticId: diagnostic.id,
        generatedAt: new Date().toISOString(),
        score: scoreSummary.score,
        recommendations,
        actionPlanSummary: {
          title: actionPlan.title,
          actions: actionPlan.actions.length,
          taskIds: createdTasks.map((task) => task.id),
        },
      };

      updateDiagnostic(diagnostic.id, {
        progress: 100,
        answeredQuestions: answeredCount,
        status: "completed",
        hasResponses: true,
        score: scoreSummary.score,
        actionPlan,
        reportPayload,
      });

      console.info("[diagnostic:completed]", {
        diagnosticId: diagnostic.id,
        score: scoreSummary.score,
        kanbanTaskIds: reportPayload.actionPlanSummary?.taskIds || [],
      });

      const toastMessage = kanbanError
        ? "Diagnóstico concluído com ressalvas"
        : createdTasks.length
          ? `Diagnóstico concluído! ${createdTasks.length} ações foram enviadas para o Kanban.`
          : "Diagnóstico concluído!";

      const toastDescription = kanbanError
        ? "Relatório disponível, mas não foi possível enviar as ações para o Kanban. Tente novamente mais tarde."
        : undefined;

      toast.success(toastMessage, { description: toastDescription });

      const suggestions = generateNextStepsSuggestions(
        { ...diagnostic, score: scoreSummary.score, opportunities: diagnostic.opportunities ?? 0 },
        template,
        diagnostics
      );

      if (suggestions.length > 0) {
        setNextStepsSuggestions(suggestions);
        setShowNextStepsModal(true);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExitExecution = () => {
    setIsExecuting(false);
  };

  const handleExportReport = (format: "html" | "pdf") => {
    const payload = diagnostic.reportPayload;

    const generatedAt = payload
      ? new Date(payload.generatedAt).toLocaleString("pt-BR")
      : new Date().toLocaleString("pt-BR");

    const actionPlanStatus = diagnostic.actionPlan
      ? `Gerado em ${diagnostic.actionPlan.generatedAt}`
      : payload?.actionPlanSummary
        ? `Pendente no Kanban (${payload.actionPlanSummary.actions} ações)`
        : "Não gerado";

    // Preferir payload (mais fiel ao momento de geração), com fallback para actionPlan
    const recommendations = payload?.recommendations || diagnostic.actionPlan?.actions || [];

    const planPositiveImpact = diagnostic.actionPlan?.positiveImpact;
    const planNegativeImpact = diagnostic.actionPlan?.negativeImpact;

    const formatImpact = (label: string, impact?: ImpactProjection) =>
      impact
        ? `<p><strong>${label} - Benefício:</strong> ${impact.expectedBenefit}</p>
            <p class="muted"><strong>${label} - Risco evitado:</strong> ${impact.avoidedRisk}</p>
            ${
              impact.estimatedCostOrTime
                ? `<p class="muted"><strong>${label} - Custo/tempo:</strong> ${impact.estimatedCostOrTime}</p>`
                : ""
            }`
        : `<p class="muted">${label}: impacto não informado.</p>`;

    const formatRecommendationImpact = (impact?: ImpactProjection) =>
      impact
        ? `${impact.expectedBenefit} <span class="muted">${impact.avoidedRisk}${
            impact.estimatedCostOrTime ? ` • ${impact.estimatedCostOrTime}` : ""
          }</span>`
        : "Impacto não informado.";

    const htmlContent = `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Relatório do diagnóstico - ${diagnostic.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0 auto; padding: 24px; color: #0f172a; max-width: 960px; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { font-size: 18px; margin-top: 24px; margin-bottom: 8px; }
            p { margin: 6px 0; line-height: 1.5; }
            .meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 14px; color: #475569; }
            .badge { display: inline-block; padding: 6px 10px; border-radius: 8px; background: #ecfdf3; color: #047857; font-weight: 600; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 12px; }
            .list { padding-left: 18px; }
            .muted { color: #475569; }
          </style>
        </head>
        <body>
          <h1>Relatório do diagnóstico</h1>
          <p class="muted">${generatedAt}</p>
          <div class="card">
            <h2>Metadados</h2>
            <p><strong>Diagnóstico:</strong> ${diagnostic.name}</p>
            <p><strong>Projeto:</strong> ${diagnostic.projectName} (${diagnostic.clientName})</p>
            <p><strong>Autor:</strong> ${diagnostic.responsibleName || "Equipe JoIA"}</p>
            <p><strong>Data:</strong> ${diagnostic.updatedAt}</p>
            <p><strong>Score:</strong> ${diagnostic.score ?? "N/A"}</p>
            <p><strong>Status do plano de ação:</strong> ${actionPlanStatus}</p>
          </div>
          <div class="card">
            <h2>Recomendações prioritárias</h2>
            ${
              recommendations.length
                ? `<ol class="list">${recommendations
                    .map(
                      (rec) => `<li><strong>${rec.title}</strong> — ${rec.description} (Impacto ${rec.impact}, Responsável: ${rec.responsible}, Prazo: ${rec.dueDate})
                        <div style="margin-top:4px">
                          <em>Executar:</em> ${formatRecommendationImpact(rec.positiveImpact)}
                        </div>
                        <div>
                          <em>Não executar:</em> ${formatRecommendationImpact(rec.negativeImpact)}
                        </div>
                      </li>`
                    )
                    .join("")}</ol>`
                : '<p class="muted">Nenhuma recomendação registrada.</p>'
            }
          </div>
          <div class="card">
            <h2>Impacto</h2>
            ${formatImpact("Executar plano", planPositiveImpact)}
            ${formatImpact("Não executar", planNegativeImpact)}
          </div>
        </body>
      </html>`;

    if (format === "html") {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `diagnostico-${diagnostic.id}-relatorio.html`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      toast.error("Não foi possível abrir o relatório. Verifique o bloqueador de pop-up.");
      return;
    }

    reportWindow.document.write(htmlContent);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
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
  const ctaLabel =
    diagnostic.status === "draft"
      ? "Iniciar diagnóstico"
      : diagnostic.status === "in_progress"
        ? "Continuar diagnóstico"
        : "Ver respostas";

  const isCompleted = diagnostic.status === "completed";
  const recommendations = diagnostic.actionPlan?.actions || [];
  const planPositiveImpact = diagnostic.actionPlan?.positiveImpact;
  const planNegativeImpact = diagnostic.actionPlan?.negativeImpact;

  const renderImpactList = (impact?: ImpactProjection) => (
    <ul className="text-sm text-muted-foreground space-y-1">
      <li>
        <strong>Benefício esperado:</strong> {impact?.expectedBenefit || "Não informado."}
      </li>
      <li>
        <strong>Risco evitado:</strong> {impact?.avoidedRisk || "Não informado."}
      </li>
      {impact?.estimatedCostOrTime && (
        <li>
          <strong>Custo/tempo:</strong> {impact.estimatedCostOrTime}
        </li>
      )}
    </ul>
  );

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
            <p className="text-muted-foreground">
              {diagnostic.projectName} • {diagnostic.clientName}
            </p>
          </div>
        </div>
        <Badge variant="outline">{resolveStatusLabel(diagnostic.status)}</Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>
              Template: {diagnostic.templateName}
              {template?.estimatedTimeMinutes && ` • Tempo estimado: ~${template.estimatedTimeMinutes} min`}
            </CardDescription>
          </div>
          {isCompleted && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleExportReport("html")}>
                Exportar HTML
              </Button>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => handleExportReport("pdf")}
              >
                <Download className="h-4 w-4 mr-2" />
                Salvar relatório
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Responsável: {diagnostic.responsibleName || "Não definido"}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{formatRelativeUpdate(diagnostic)}</span>
            {isCompleted && diagnostic.score !== undefined && (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>Score final: {diagnostic.score}</span>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span className="font-medium">{diagnostic.progress}%</span>
            </div>
            <Progress value={diagnostic.progress} className="h-3" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileBarChart2 className="h-4 w-4" />
              <span>
                {diagnostic.answeredQuestions}/{diagnostic.totalQuestions} perguntas respondidas
              </span>
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
              <Badge className="bg-emerald-100 text-emerald-700">Score: {diagnostic.score}</Badge>
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

      {isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle>Entrega final</CardTitle>
            <CardDescription>
              Consolidado do diagnóstico com plano de ação, recomendações e impactos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Score final</p>
                  <Badge className="bg-emerald-100 text-emerald-700" variant="outline">
                    {diagnostic.score ?? "N/A"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Avaliação consolidada para {diagnostic.projectName}. Última atualização em{" "}
                  {diagnostic.updatedAt}.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Plano de ação</p>
                  <Badge variant="outline">{diagnostic.actionPlan?.actions.length || 0} ações</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Status:{" "}
                  {diagnostic.actionPlan ? `Gerado em ${diagnostic.actionPlan.generatedAt}` : "Não gerado"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`/plano-acao?diagnostico=${diagnostic.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Kanban
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleExportReport("pdf")}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar relatório
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Recomendações priorizadas</p>
                <Badge variant="outline">{recommendations.length} itens</Badge>
              </div>

              {recommendations.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {recommendations.slice(0, 4).map((rec) => (
                    <div key={rec.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">
                            Prioridade {rec.priority}
                          </p>
                          <h4 className="text-base font-semibold leading-tight">{rec.title}</h4>
                        </div>
                        <Badge variant="outline">Impacto {rec.impact}</Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">{rec.description}</p>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          <strong>Executar:</strong>{" "}
                          {rec.positiveImpact?.expectedBenefit || "Impacto não informado."}
                        </p>
                        <p className="text-[11px]">
                          Risco evitado: {rec.positiveImpact?.avoidedRisk || "Não informado."}
                          {rec.positiveImpact?.estimatedCostOrTime
                            ? ` • ${rec.positiveImpact.estimatedCostOrTime}`
                            : ""}
                        </p>
                        <p>
                          <strong>Não executar:</strong>{" "}
                          {rec.negativeImpact?.expectedBenefit || "Impacto não informado."}
                        </p>
                        <p className="text-[11px]">
                          Risco: {rec.negativeImpact?.avoidedRisk || "Não informado."}
                          {rec.negativeImpact?.estimatedCostOrTime
                            ? ` • ${rec.negativeImpact.estimatedCostOrTime}`
                            : ""}
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Responsável: {rec.responsible} • Prazo: {rec.dueDate}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma recomendação registrada.</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-2 bg-emerald-50">
                <p className="text-sm font-semibold text-emerald-900">Impacto de executar</p>
                <div className="text-emerald-800">{renderImpactList(planPositiveImpact)}</div>
              </div>
              <div className="rounded-lg border p-4 space-y-2 bg-amber-50">
                <p className="text-sm font-semibold text-amber-900">Impacto de não executar</p>
                <div className="text-amber-800">{renderImpactList(planNegativeImpact)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {diagnostic.actionPlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Plano de ação</CardTitle>
            <CardDescription>{diagnostic.actionPlan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Gerado em {diagnostic.actionPlan.generatedAt}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>{diagnostic.actionPlan.actions.length} ações priorizadas</span>
            </div>

            <div className="space-y-3">
              {diagnostic.actionPlan.actions.map((action) => (
                <div key={action.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Prioridade {action.priority}</p>
                      <h4 className="text-base font-semibold leading-tight">{action.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Badge variant="outline">Impacto {action.impact}</Badge>
                      <Badge variant="outline">Prazo sugerido: {action.dueDate}</Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{action.description}</p>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <strong>Executar:</strong>{" "}
                      {action.positiveImpact?.expectedBenefit || "Impacto não informado."}
                    </p>
                    <p className="text-[11px]">
                      Risco evitado: {action.positiveImpact?.avoidedRisk || "Não informado."}
                      {action.positiveImpact?.estimatedCostOrTime
                        ? ` • ${action.positiveImpact.estimatedCostOrTime}`
                        : ""}
                    </p>
                    <p>
                      <strong>Não executar:</strong>{" "}
                      {action.negativeImpact?.expectedBenefit || "Impacto não informado."}
                    </p>
                    <p className="text-[11px]">
                      Risco: {action.negativeImpact?.avoidedRisk || "Não informado."}
                      {action.negativeImpact?.estimatedCostOrTime
                        ? ` • ${action.negativeImpact.estimatedCostOrTime}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Responsável: {action.responsible}</span>
                    {action.rationale && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>{action.rationale}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plano de ação</CardTitle>
            <CardDescription>Finalize o diagnóstico para gerar recomendações automáticas.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Modal de sugestões de próximos passos */}
      <NextStepsSuggestionModal
        open={showNextStepsModal}
        onOpenChange={setShowNextStepsModal}
        diagnosticName={diagnostic.name}
        projectName={diagnostic.projectName}
        clientName={diagnostic.clientName}
        suggestions={nextStepsSuggestions}
        onConfirm={handleConfirmNextSteps}
      />
    </div>
  );
}
