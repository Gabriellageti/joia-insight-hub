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
import { DiagnosticTemplate, TemplateOpportunityRule, TemplateQuestion } from "@/types";
import { AlertCircle, ArrowLeft, Brain, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

const statusLabels: Record<DiagnosticTemplate["status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

type AnswerValue = string | number | string[] | null;

const isAnswered = (value: AnswerValue): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatOpportunityCondition = (rule?: TemplateOpportunityRule): string | null => {
  if (!rule?.enabled) return null;

  const condition = rule.condition;
  if (!condition) return "Condição manual";

  switch (condition.type) {
    case "yes_no":
      return condition.expectedAnswer === "yes" ? "Quando a resposta for Sim" : "Quando a resposta for Não";
    case "scale": {
      const min = condition.minValue ?? "0";
      const max = condition.maxValue ?? "10";
      return `Escala entre ${min} e ${max}`;
    }
    case "number": {
      const operators: Record<">" | ">=" | "<" | "<=" | "=", string> = {
        ">": "Maior que",
        ">=": "Maior ou igual a",
        "<": "Menor que",
        "<=": "Menor ou igual a",
        "=": "Igual a",
      };
      const prefix = condition.unit === "moeda" ? "R$ " : "";
      const suffix = condition.unit === "percentual" ? "%" : "";
      const value = condition.value ?? 0;
      return `${operators[condition.operator]} ${prefix}${value}${suffix}`;
    }
    case "multiple_choice": {
      const options = (condition.matchingOptions || []).join(", ");
      if (!options) return "Opções específicas";
      return `${condition.matchStrategy === "all" ? "Todas" : "Qualquer"} das opções: ${options}`;
    }
    case "text":
      return condition.keyword ? `Palavra-chave: ${condition.keyword}` : "Revisar texto manualmente";
    default:
      return "Gera oportunidade";
  }
};

const normalizeAnswer = (question: TemplateQuestion, value: AnswerValue): number | null => {
  if (!isAnswered(value) || question.includeInScore === false) return null;

  switch (question.type) {
    case "yes_no":
      return value === "yes" ? 1 : 0;
    case "scale": {
      const numericValue = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(numericValue)) return null;
      const min = question.minValue ?? 0;
      const max = question.maxValue ?? 10;
      if (max === min) return 0;
      return clamp((numericValue - min) / (max - min), 0, 1);
    }
    case "number": {
      const numericValue = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(numericValue)) return null;
      const min = question.minValue ?? 0;
      const fallbackMax = Math.max(min + 1, Math.abs(numericValue));
      const max = question.maxValue ?? fallbackMax;
      if (max === min) return 0;
      return clamp((numericValue - min) / (max - min), 0, 1);
    }
    case "multiple_choice": {
      if (Array.isArray(value)) {
        const totalOptions = question.options?.length || value.length || 1;
        return totalOptions > 0 ? clamp(value.length / totalOptions, 0, 1) : 1;
      }
      return 1;
    }
    case "text":
      return typeof value === "string" && value.trim().length > 0 ? 1 : null;
    case "attachment":
      return isAnswered(value) ? 1 : null;
    default:
      return null;
  }
};

const matchesOpportunityCondition = (question: TemplateQuestion, value: AnswerValue): boolean => {
  const rule = question.regraOportunidade;
  if (!rule?.enabled) return false;

  const condition = rule.condition;
  if (!condition) return isAnswered(value);

  switch (condition.type) {
    case "yes_no":
      return typeof value === "string" && condition.expectedAnswer === (value === "yes" ? "yes" : "no");
    case "scale": {
      if (typeof value !== "number") return false;
      const min = condition.minValue ?? Number.MIN_SAFE_INTEGER;
      const max = condition.maxValue ?? Number.MAX_SAFE_INTEGER;
      return value >= min && value <= max;
    }
    case "number": {
      if (typeof value !== "number") return false;
      const target = condition.value ?? 0;
      switch (condition.operator) {
        case ">":
          return value > target;
        case ">=":
          return value >= target;
        case "<":
          return value < target;
        case "<=":
          return value <= target;
        case "=":
          return value === target;
        default:
          return false;
      }
    }
    case "multiple_choice": {
      const selected = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
      if (!selected.length) return false;
      const options = condition.matchingOptions || [];
      if (!options.length) return false;
      if (condition.matchStrategy === "all") {
        return options.every((option) => selected.includes(option));
      }
      return options.some((option) => selected.includes(option));
    }
    case "text":
      if (typeof value !== "string") return false;
      if (!condition.keyword) return value.trim().length > 0;
      return value.toLowerCase().includes(condition.keyword.toLowerCase());
    case "always":
      return true;
    default:
      return false;
  }
};

export default function TemplateDiagnosticPreview() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { templates } = useData();
  const [responses, setResponses] = useState<Record<string, AnswerValue>>({});

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
    if (!template) return { score: 0, answeredWeight: 0, totalWeight: 0 };

    let weightedSum = 0;
    let answeredWeight = 0;
    let totalWeight = 0;

    template.sections.forEach((section) => {
      section.questions?.forEach((question) => {
        const weight = question.weight || 1;
        if (question.includeInScore === false) return;
        totalWeight += weight;
        const normalized = normalizeAnswer(question, responses[question.id]);
        if (normalized !== null) {
          weightedSum += normalized * weight;
          answeredWeight += weight;
        }
      });
    });

    const score = answeredWeight > 0 ? Math.round((weightedSum / answeredWeight) * 100) : 0;
    return { score, answeredWeight, totalWeight };
  }, [responses, template]);

  const opportunities = useMemo(() => {
    if (!template) return [] as Array<{
      id: string;
      name: string;
      description?: string;
      questionTitle: string;
      sectionTitle: string;
      type: TemplateOpportunityRule["type"];
      estimatedValue?: number | null;
      autoGenerate: boolean;
      conditionLabel?: string | null;
    }>;

    return template.sections.flatMap((section) =>
      (section.questions || [])
        .filter((question) => matchesOpportunityCondition(question, responses[question.id]))
        .map((question) => ({
          id: question.regraOportunidade?.id || question.id,
          name: question.regraOportunidade?.name || "Oportunidade detectada",
          description: question.regraOportunidade?.description,
          questionTitle: question.title,
          sectionTitle: section.title,
          type: question.regraOportunidade?.type || "Outro",
          estimatedValue: question.regraOportunidade?.estimatedValue,
          autoGenerate: question.regraOportunidade?.autoGenerate ?? true,
          conditionLabel: formatOpportunityCondition(question.regraOportunidade),
        }))
    );
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
        description="Simule a aplicação para revisar peso das perguntas, score e oportunidades geradas. Respostas não são salvas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/templates/${template.id}/editar`)}>
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
                    const triggerOpportunity = matchesOpportunityCondition(question, currentValue);
                    const normalized = normalizeAnswer(question, currentValue);

                    return (
                      <div key={question.id} className="rounded-md border p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-2">
                              {sectionIndex + 1}.{questionIndex + 1} {question.title}
                              {question.includeInScore === false && (
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
                              value={[typeof currentValue === "number" ? (currentValue as number) : question.minValue ?? 0]}
                              onValueChange={(value) => handleAnswerChange(question.id, value[0])}
                              min={question.minValue ?? 0}
                              max={question.maxValue ?? 10}
                              step={1}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Min: {question.minValue ?? 0}</span>
                              <span>Max: {question.maxValue ?? 10}</span>
                              {typeof currentValue === "number" && <span>Resposta: {currentValue}</span>}
                            </div>
                          </div>
                        )}

                        {question.type === "number" && (
                          <Input
                            type="number"
                            value={typeof currentValue === "number" ? currentValue : ""}
                            onChange={(event) =>
                              handleAnswerChange(
                                question.id,
                                event.target.value === "" ? null : Number(event.target.value)
                              )
                            }
                            placeholder="Digite um número"
                          />
                        )}

                        {question.type === "multiple_choice" && (
                          <div className="space-y-2">
                            {(question.options || ["Opção A", "Opção B"]).map((option) => {
                              const isChecked = Array.isArray(currentValue)
                                ? currentValue.includes(option)
                                : false;
                              return (
                                <div key={option} className="flex items-center space-x-2 rounded-md border px-3 py-2">
                                  <Checkbox
                                    id={`${question.id}-${option}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => handleCheckboxChange(question.id, option, Boolean(checked))}
                                  />
                                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {question.type === "text" && (
                          <Textarea
                            value={typeof currentValue === "string" ? currentValue : ""}
                            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                            placeholder="Digite uma resposta"
                          />
                        )}

                        {question.type === "attachment" && (
                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              variant={isAnswered(currentValue) ? "secondary" : "outline"}
                              onClick={() => handleAnswerChange(question.id, isAnswered(currentValue) ? null : "evidencia-mock.pdf")}
                            >
                              {isAnswered(currentValue) ? "Remover evidência mock" : "Simular upload"}
                            </Button>
                            {isAnswered(currentValue) && <span className="text-sm text-muted-foreground">evidencia-mock.pdf</span>}
                          </div>
                        )}

                        {(question.type === "yes_no" || question.type === "scale") && question.helperText && (
                          <p className="text-xs text-muted-foreground">{question.helperText}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Brain className="h-4 w-4" />
                            <span>Normalizado: {normalized !== null ? `${Math.round(normalized * 100)}%` : "—"}</span>
                          </div>
                          {question.regraOportunidade?.enabled && (
                            <div className="flex items-center gap-1">
                              {triggerOpportunity ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                              <span>
                                {triggerOpportunity ? "Regra de oportunidade atendida" : "Aguardando condição"}
                              </span>
                            </div>
                          )}
                        </div>

                        {question.regraOportunidade?.enabled && (
                          <div className="rounded-md border bg-muted/50 p-3 text-xs space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge>Gera oportunidade</Badge>
                              <Badge variant="outline">{question.regraOportunidade.type}</Badge>
                              <Badge variant={question.regraOportunidade.autoGenerate ? "secondary" : "outline"}>
                                {question.regraOportunidade.autoGenerate ? "Automática" : "Revisar"}
                              </Badge>
                              {question.regraOportunidade.estimatedValue && (
                                <Badge variant="outline">R$ {question.regraOportunidade.estimatedValue}</Badge>
                              )}
                              {formatOpportunityCondition(question.regraOportunidade) && (
                                <Badge variant="outline">{formatOpportunityCondition(question.regraOportunidade)}</Badge>
                              )}
                            </div>
                            {question.regraOportunidade.description && (
                              <p className="text-muted-foreground">{question.regraOportunidade.description}</p>
                            )}
                          </div>
                        )}
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
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Oportunidades previstas
              </CardTitle>
              <CardDescription>Regras atendidas com base nas respostas fictícias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunities.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhuma oportunidade seria gerada com as respostas atuais.
                </div>
              ) : (
                opportunities.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sectionTitle} • {item.questionTitle}
                        </p>
                      </div>
                      <Badge variant="secondary">{item.type}</Badge>
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.estimatedValue && <Badge variant="outline">Valor estimado: R$ {item.estimatedValue}</Badge>}
                      <Badge variant={item.autoGenerate ? "secondary" : "outline"}>
                        {item.autoGenerate ? "Automática" : "Revisar"}
                      </Badge>
                      {item.conditionLabel && <Badge variant="outline">{item.conditionLabel}</Badge>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

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
