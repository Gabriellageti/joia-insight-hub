import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { DiagnosticTemplate, TemplateQuestion } from "@/types";
import { AlertCircle, ArrowLeft, Brain, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AnswerValue, calculateDiagnosticScore, normalizeAnswerForScore } from "@/lib/diagnostic-evaluation";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const statusLabels: Record<DiagnosticTemplate["status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const isAnswered = (value: AnswerValue): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getOptionsWithWeight = (question: TemplateQuestion) => {
  if (question.optionsWithWeight?.length) return question.optionsWithWeight;
  if (question.options?.length) return question.options.map((label) => ({ label, weight: 1 }));
  return [] as { label: string; weight?: number | null }[];
};

const normalizeAnswer = (question: TemplateQuestion, value: AnswerValue): number | null =>
  normalizeAnswerForScore(question, value);

const getValidationMessages = (question: TemplateQuestion, value: AnswerValue): string[] => {
  const messages: string[] = [];

  if (question.required && !isAnswered(value)) {
    messages.push("Resposta obrigatória.");
  }

  if (question.type === "multiple_choice" && getOptionsWithWeight(question).length === 0) {
    messages.push("Inclua opções para múltipla escolha.");
  }

  if (question.type === "scale" || question.type === "number") {
    const hasMin = typeof question.minValue === "number";
    const hasMax = typeof question.maxValue === "number";
    if (hasMin && hasMax && (question.minValue as number) >= (question.maxValue as number)) {
      messages.push("O valor mínimo deve ser menor que o máximo.");
    }
  }

  if (question.type === "attachment" && question.allowedFileTypes?.length === 0) {
    messages.push("Defina tipos de arquivo permitidos.");
  }

  return messages;
};

export default function TemplateDiagnosticPreview() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { templates } = useData();
  const { can } = useAuth();
  const [responses, setResponses] = useState<Record<string, AnswerValue>>({});

  const canUpdate = can("templates.update");

  const template = useMemo(() => templates.find((item) => item.id === templateId), [templateId, templates]);

  const totalQuestions = useMemo(
    () => template?.sections?.reduce((total, section) => total + (section.questions?.length || 0), 0) || 0,
    [template]
  );

  const answeredQuestions = useMemo(() => {
    if (!template) return 0;
    return template.sections.reduce((count, section) => {
      return (
        count +
        (section.questions || []).filter((question) => isAnswered(responses[question.id])).length
      );
    }, 0);
  }, [responses, template]);

  const progress = totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const scoreSummary = useMemo(() => {
    if (!template) return { score: 0, answeredWeight: 0, totalWeight: 0, coverage: 0 };
    return calculateDiagnosticScore(template, responses);
  }, [responses, template]);

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setResponses((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      }
      return { ...prev, [questionId]: current.filter((item) => item !== option) };
    });
  };

  const resetResponses = () => setResponses({});

  const handleBackToEdit = () => {
    if (!canUpdate) {
      toast.error("Você não tem permissão para editar templates.");
      return;
    }
    if (!template) return;
    navigate(`/templates/${template.id}/editar`);
  };

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-lg font-semibold">Template não encontrado</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/templates")}>Voltar</Button>
          <Button onClick={() => navigate("/templates/novo")}>Criar novo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TemplatePageHeader
        eyebrow="Templates"
        title={`Preview como diagnóstico: ${template.name}`}
        description="Simule a aplicação para revisar perguntas, pesos e score. Respostas não são salvas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button variant="secondary" onClick={handleBackToEdit}>
              Voltar para edição
            </Button>
            <Button variant="outline" onClick={resetResponses} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Limpar respostas
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{statusLabels[template.status]}</Badge>
        {template.version && <Badge variant="outline">Versão {template.version}</Badge>}
        {template.revision && <Badge variant="outline">Rev. {template.revision}</Badge>}
        {template.updatedAt && <span>Atualizado em {template.updatedAt}</span>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr,1fr] gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progresso e score simulados</CardTitle>
              <CardDescription>Acompanhe como as respostas impactam o avanço e a nota ponderada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do preenchimento</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {answeredQuestions}/{totalQuestions} perguntas respondidas
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Score parcial</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-foreground">{scoreSummary.score}</span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Considerando peso de {Math.round(scoreSummary.answeredWeight || 0)} de {Math.round(scoreSummary.totalWeight || 0)}
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Cobertura do score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">
                      {scoreSummary.totalWeight ? Math.round((scoreSummary.answeredWeight / scoreSummary.totalWeight) * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Peso de perguntas respondidas que entram no score</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Perguntas com score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">
                      {template.sections.reduce((total, section) =>
                        total + (section.questions?.filter((question) => question.includeInScore !== false).length || 0),
                      0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Perguntas marcadas para contribuir com a nota</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {template.sections.map((section, sectionIndex) => {
            const sectionAnswered = (section.questions || []).filter((question) => isAnswered(responses[question.id])).length;
            const sectionTotal = section.questions?.length || 0;
            const sectionProgress = sectionTotal ? Math.round((sectionAnswered / sectionTotal) * 100) : 0;

            return (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase text-muted-foreground">Seção {sectionIndex + 1}</p>
                      <CardTitle>{section.title}</CardTitle>
                      {section.description && <CardDescription>{section.description}</CardDescription>}
                    </div>
                    <Badge variant="outline">Peso {section.weight ?? 1}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span>{sectionAnswered}/{sectionTotal} respondidas</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span>Progresso {sectionProgress}%</span>
                  </div>
                  <Progress value={sectionProgress} className="h-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.questions?.map((question, questionIndex) => {
                    const currentValue = responses[question.id];
                    const normalized = normalizeAnswer(question, currentValue);
                    const optionsWithWeight = getOptionsWithWeight(question);
                    const validationMessages = getValidationMessages(question, currentValue);
                    const scaleMin = question.minValue ?? 0;
                    const scaleMax = question.maxValue ?? 10;
                    const safeScaleMax = scaleMax > scaleMin ? scaleMax : scaleMin + 10;
                    const sliderValue = typeof currentValue === "number" ? clamp(currentValue as number, scaleMin, safeScaleMax) : scaleMin;
                    const hasScore = question.includeInScore !== false;

                    return (
                      <div key={question.id} className="rounded-md border p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-2">
                              {sectionIndex + 1}.{questionIndex + 1} {question.title}
                              {!hasScore && (
                                <Badge variant="outline" className="text-xs">Não conta no score</Badge>
                              )}
                            </p>
                            {question.description && (
                              <p className="text-sm text-muted-foreground">{question.description}</p>
                            )}
                            {question.helperText && <p className="text-xs text-muted-foreground">{question.helperText}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">{question.type === "yes_no" ? "Sim/Não" : question.type === "scale" ? "Escala" : question.type === "multiple_choice" ? "Múltipla escolha" : question.type === "number" ? "Número" : question.type === "attachment" ? "Evidência" : "Texto"}</Badge>
                            <Badge variant="outline">Criticidade: {question.criticality}</Badge>
                            {question.required && <Badge variant="outline">Obrigatória</Badge>}
                            <Badge variant="outline">Peso {question.weight || 1}</Badge>
                          </div>
                        </div>

                        {question.type === "yes_no" && (
                          <RadioGroup
                            value={typeof currentValue === "string" ? currentValue : undefined}
                            onValueChange={(value) => handleAnswerChange(question.id, value)}
                            className="grid grid-cols-2 gap-3"
                          >
                            <div className="flex items-center space-x-2 rounded-md border px-3 py-2">
                              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                              <Label htmlFor={`${question.id}-yes`}>Sim</Label>
                            </div>
                            <div className="flex items-center space-x-2 rounded-md border px-3 py-2">
                              <RadioGroupItem value="no" id={`${question.id}-no`} />
                              <Label htmlFor={`${question.id}-no`}>Não</Label>
                            </div>
                          </RadioGroup>
                        )}

                        {question.type === "scale" && (
                          <div className="space-y-2">
                            <Slider
                              value={[sliderValue]}
                              onValueChange={(value) => handleAnswerChange(question.id, value[0])}
                              min={scaleMin}
                              max={safeScaleMax}
                              step={1}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Min: {scaleMin}</span>
                              <span>Max: {safeScaleMax}</span>
                              {typeof currentValue === "number" && <span>Resposta: {currentValue}</span>}
                            </div>
                          </div>
                        )}

                        {question.type === "number" && (
                          <Input
                            type="number"
                            value={typeof currentValue === "number" ? currentValue : ""}
                            min={typeof question.minValue === "number" ? question.minValue : undefined}
                            max={typeof question.maxValue === "number" ? question.maxValue : undefined}
                            onChange={(event) =>
                              handleAnswerChange(
                                question.id,
                                event.target.value === "" ? null : Number(event.target.value)
                              )
                            }
                            placeholder={question.placeholder || "Digite um número"}
                          />
                        )}

                        {question.type === "multiple_choice" && (
                          <div className="space-y-2">
                            {(optionsWithWeight.length ? optionsWithWeight : [{ label: "Opção A", weight: 1 }, { label: "Opção B", weight: 1 }]).map((option, optionIndex) => {
                              const isChecked = Array.isArray(currentValue)
                                ? currentValue.includes(option.label)
                                : false;
                              return (
                                <div key={`${option.label}-${optionIndex}`} className="flex items-center space-x-2 rounded-md border px-3 py-2">
                                  <Checkbox
                                    id={`${question.id}-${option.label}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => handleCheckboxChange(question.id, option.label, Boolean(checked))}
                                  />
                                  <Label htmlFor={`${question.id}-${option.label}`} className="flex flex-col gap-1">
                                    <span>{option.label}</span>
                                    <span className="text-xs text-muted-foreground">Peso {option.weight ?? 1}</span>
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {question.type === "text" && (
                          <Textarea
                            value={typeof currentValue === "string" ? currentValue : ""}
                            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                            placeholder={question.placeholder || "Digite uma resposta"}
                          />
                        )}

                        {question.type === "attachment" && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                variant="outline"
                                disabled
                                title="O upload real fica disponível ao aplicar o template a um diagnóstico."
                              >
                                Upload disponível no diagnóstico aplicado
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {question.maxFileSizeMB && <Badge variant="outline">Até {question.maxFileSizeMB} MB</Badge>}
                              {(question.allowedFileTypes || []).length > 0 ? (
                                (question.allowedFileTypes || []).map((type) => (
                                  <Badge key={`${question.id}-${type}`} variant="outline">{type}</Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">Qualquer tipo</Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {validationMessages.length > 0 && (
                          <div className="space-y-1">
                            {validationMessages.map((message, index) => (
                              <p key={`${question.id}-validation-${index}`} className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>{message}</span>
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Brain className="h-4 w-4" />
                            <span>Normalizado: {normalized !== null ? `${Math.round(normalized * 100)}%` : "—"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do template</CardTitle>
              <CardDescription>Metadados principais para a simulação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Seções</span>
                <span className="font-medium text-foreground">{template.sections?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Perguntas</span>
                <span className="font-medium text-foreground">{totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tempo estimado</span>
                <span className="font-medium text-foreground">
                  {template.estimatedTimeMinutes ? `${template.estimatedTimeMinutes} min` : "Não informado"}
                </span>
              </div>
              {template.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
