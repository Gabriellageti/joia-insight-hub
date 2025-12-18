import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { DiagnosticTemplateStatus, TemplateOpportunityRule, TemplateQuestion, TemplateSection } from "@/types";
import { AlarmClock, BookOpenText, Layers } from "lucide-react";

interface TemplatePreviewPanelProps {
  name: string;
  description?: string;
  status: DiagnosticTemplateStatus;
  tags: string[];
  sections: TemplateSection[];
  questionCount: number;
  condensed?: boolean;
}

const questionTypeLabels: Record<TemplateQuestion["type"], string> = {
  yes_no: "Sim/Não",
  scale: "Escala",
  text: "Texto",
  number: "Número",
  multiple_choice: "Múltipla escolha",
  attachment: "Evidência",
};

const criticalityVariants: Record<TemplateQuestion["criticality"], "outline" | "secondary" | "destructive"> = {
  baixa: "outline",
  media: "secondary",
  alta: "destructive",
};

const statusVariant: Record<DiagnosticTemplateStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

const getOptionsWithWeight = (question: TemplateQuestion) => {
  if (question.optionsWithWeight?.length) return question.optionsWithWeight;
  if (question.options?.length) return question.options.map((label) => ({ label, weight: 1 }));
  return [] as { label: string; weight?: number | null }[];
};

const getValidationMessages = (question: TemplateQuestion): string[] => {
  const messages: string[] = [];

  if (question.required) {
    messages.push("Resposta obrigatória para o diagnóstico.");
  }

  if (question.type === "scale" || question.type === "number") {
    const hasMin = typeof question.minValue === "number";
    const hasMax = typeof question.maxValue === "number";
    if (hasMin && hasMax && (question.minValue as number) >= (question.maxValue as number)) {
      messages.push("O valor mínimo deve ser menor que o máximo.");
    }
  }

  if (question.type === "multiple_choice" && getOptionsWithWeight(question).length === 0) {
    messages.push("Adicione ao menos uma opção para múltipla escolha.");
  }

  if (question.type === "attachment" && question.allowedFileTypes?.length === 0) {
    messages.push("Defina ao menos um tipo de arquivo permitido.");
  }

  return messages;
};

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

export function TemplatePreviewPanel({
  name,
  description,
  status,
  tags,
  sections,
  questionCount,
  condensed,
}: TemplatePreviewPanelProps) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Preview rápido</p>
            <CardTitle className="text-lg leading-tight">{name || "Template sem nome"}</CardTitle>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <Badge variant={statusVariant[status]}>{status === "draft" ? "Rascunho" : status === "published" ? "Publicado" : "Arquivado"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {tags.length ? (
            tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Sem tags
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Seções</p>
              <p className="font-medium">{sections.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <BookOpenText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Perguntas</p>
              <p className="font-medium">{questionCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <AlarmClock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tempo</p>
              <p className="font-medium">Estimado</p>
            </div>
          </div>
        </div>

        <ScrollArea className={condensed ? "h-[320px]" : "h-[520px]"}>
          <div className="space-y-4 pr-2">
            {!sections.length ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
                Nenhuma seção adicionada ainda.
              </div>
            ) : (
              sections.map((section, sectionIndex) => (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Seção {sectionIndex + 1}</p>
                      <p className="font-semibold">{section.title}</p>
                      {section.description && (
                        <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">Peso {section.weight ?? 1}</Badge>
                  </div>
                  <div className="space-y-2">
                    {section.questions?.length ? (
                      section.questions.map((question, questionIndex) => {
                        const conditionLabel = formatOpportunityCondition(question.regraOportunidade);
                        const optionsWithWeight = getOptionsWithWeight(question);
                        const validationMessages = getValidationMessages(question);
                        const scaleMin = question.minValue ?? 0;
                        const scaleMax = question.maxValue ?? 10;
                        const safeScaleMax = scaleMax > scaleMin ? scaleMax : scaleMin + 10;
                        const hasScore = question.includeInScore !== false;

                        const renderFieldPreview = () => {
                          switch (question.type) {
                            case "yes_no":
                              return (
                                <RadioGroup value="yes" className="grid grid-cols-2 gap-2" disabled>
                                  <div className="flex items-center space-x-2 rounded-md border px-3 py-2">
                                    <RadioGroupItem value="yes" id={`${question.id}-yes-static`} />
                                    <Label htmlFor={`${question.id}-yes-static`}>Sim</Label>
                                  </div>
                                  <div className="flex items-center space-x-2 rounded-md border px-3 py-2">
                                    <RadioGroupItem value="no" id={`${question.id}-no-static`} />
                                    <Label htmlFor={`${question.id}-no-static`}>Não</Label>
                                  </div>
                                </RadioGroup>
                              );
                            case "scale":
                              return (
                                <div className="space-y-2">
                                  <Slider value={[scaleMin]} min={scaleMin} max={safeScaleMax} step={1} disabled />
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Mín: {scaleMin}</span>
                                    <span>Máx: {safeScaleMax}</span>
                                  </div>
                                </div>
                              );
                            case "number":
                              return (
                                <Input
                                  type="number"
                                  value=""
                                  placeholder={question.placeholder || "Digite um número"}
                                  disabled
                                />
                              );
                            case "text":
                              return (
                                <Textarea
                                  placeholder={question.placeholder || "Descreva sua resposta"}
                                  disabled
                                  rows={3}
                                />
                              );
                            case "multiple_choice":
                              return (
                                <div className="space-y-2">
                                  {optionsWithWeight.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Nenhuma opção configurada.</p>
                                  ) : (
                                    optionsWithWeight.map((option, optionIndex) => (
                                      <div key={`${question.id}-${option.label}-${optionIndex}`} className="flex items-center space-x-2 rounded-md border px-3 py-2">
                                        <Checkbox disabled id={`${question.id}-${option.label}-preview`} />
                                        <Label htmlFor={`${question.id}-${option.label}-preview`} className="flex flex-col gap-1">
                                          <span>{option.label}</span>
                                          <span className="text-xs text-muted-foreground">Peso {option.weight ?? 1}</span>
                                        </Label>
                                      </div>
                                    ))
                                  )}
                                </div>
                              );
                            case "attachment":
                              return (
                                <div className="space-y-2">
                                  <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">Selecione ou arraste um arquivo.</div>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {question.maxFileSizeMB && <Badge variant="outline">Até {question.maxFileSizeMB} MB</Badge>}
                                    {(question.allowedFileTypes || []).length > 0 ? (
                                      (question.allowedFileTypes || []).map((type) => (
                                        <Badge key={type} variant="outline">{type}</Badge>
                                      ))
                                    ) : (
                                      <Badge variant="outline" className="text-muted-foreground">Qualquer tipo</Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            default:
                              return null;
                          }
                        };

                        return (
                          <div key={question.id} className="rounded-md border p-3 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold">
                                  {sectionIndex + 1}.{questionIndex + 1} {question.title}
                                </p>
                                {question.description && (
                                  <p className="text-xs text-muted-foreground">{question.description}</p>
                                )}
                                {question.helperText && (
                                  <p className="text-xs text-primary mt-1">{question.helperText}</p>
                                )}
                              </div>
                              <Badge variant="outline">{questionTypeLabels[question.type]}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant={criticalityVariants[question.criticality]}>Criticidade: {question.criticality}</Badge>
                              {question.required && <Badge variant="secondary">Obrigatória</Badge>}
                              {!hasScore && <Badge variant="outline">Não conta no score</Badge>}
                              {question.type === "attachment" && <Badge variant="outline">Evidência</Badge>}
                            </div>

                            <div className="space-y-2">{renderFieldPreview()}</div>

                            {validationMessages.length > 0 && (
                              <div className="space-y-1">
                                {validationMessages.map((message, index) => (
                                  <p key={`${question.id}-validation-${index}`} className="text-xs text-destructive">
                                    {message}
                                  </p>
                                ))}
                              </div>
                            )}

                            {question.regraOportunidade?.enabled && (
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <Badge>Gera oportunidade</Badge>
                                <Badge variant="outline">{question.regraOportunidade.type}</Badge>
                                <Badge variant={question.regraOportunidade.autoGenerate ? "secondary" : "outline"}>
                                  {question.regraOportunidade.autoGenerate ? "Automática" : "Revisar"}
                                </Badge>
                                {conditionLabel && <Badge variant="outline">{conditionLabel}</Badge>}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                        Nenhuma pergunta cadastrada.
                      </div>
                    )}
                  </div>
                  <Separator />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
