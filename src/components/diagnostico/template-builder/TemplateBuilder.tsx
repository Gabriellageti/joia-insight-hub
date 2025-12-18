import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertCircle,
  BadgeCheck,
  BookOpenText,
  Copy,
  Eye,
  GripVertical,
  Layers,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import {
  DiagnosticTemplate,
  DiagnosticTemplateStatus,
  Opportunity,
  OpportunityRuleCondition,
  TemplateOpportunityRule,
  TemplateQuestion,
  TemplateSection,
} from "@/types";
import { toast } from "sonner";
import { formatDatePtBR } from "@/lib/dates";
import { TemplatePreviewPanel } from "./TemplatePreviewPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { calculateNextTemplateVersion } from "@/lib/diagnostics";
import { useAuth } from "@/contexts/AuthContext";

export type TemplateBuilderAction = "draft" | "publish" | "preview" | "duplicate";

interface TemplateBuilderProps {
  initialTemplate?: DiagnosticTemplate;
  onSubmit: (template: Omit<DiagnosticTemplate, "id"> & { id?: string }, action: TemplateBuilderAction) => void;
}

type TemplateFormState = {
  name: string;
  description: string;
  tags: string;
  status: DiagnosticTemplateStatus;
  version: string;
  estimatedTimeMinutes: number | null;
  sections: TemplateSection[];
  lastPublishedAt?: string;
};

const createSection = (order: number): TemplateSection => ({
  id: `section-${crypto.randomUUID()}`,
  title: `Seção ${order}`,
  description: "",
  order,
  weight: 1,
  questions: [],
});

const createQuestion = (order: number): TemplateQuestion => ({
  id: `question-${crypto.randomUUID()}`,
  title: `Pergunta ${order}`,
  type: "yes_no",
  weight: 1,
  includeInScore: true,
  criticality: "media",
  required: true,
  order,
  helperText: "",
  description: "",
  options: [],
});

const opportunityTypes: Opportunity["type"][] = [
  "Receita incremental",
  "Redução de custos",
  "Eficiência operacional",
  "Risco evitado",
  "Outro",
];

const defaultOpportunityCondition = (type: TemplateQuestion["type"]): OpportunityRuleCondition => {
  switch (type) {
    case "yes_no":
      return { type: "yes_no", expectedAnswer: "no" };
    case "scale":
      return { type: "scale", minValue: 0, maxValue: 10 };
    case "number":
      return { type: "number", operator: "<=", value: 0, unit: "numero" };
    case "multiple_choice":
      return { type: "multiple_choice", matchingOptions: [], matchStrategy: "any" };
    case "text":
      return { type: "text", keyword: "" };
    default:
      return { type: "always" };
  }
};

const syncConditionWithType = (
  condition: OpportunityRuleCondition | undefined,
  type: TemplateQuestion["type"]
): OpportunityRuleCondition => {
  if (!condition || condition.type !== type) {
    return defaultOpportunityCondition(type);
  }
  return condition;
};

const buildOpportunityRule = (
  question: TemplateQuestion,
  overrides?: Partial<TemplateOpportunityRule>
): TemplateOpportunityRule => ({
  id: overrides?.id || question.regraOportunidade?.id || `opp-${crypto.randomUUID()}`,
  name: overrides?.name ?? question.regraOportunidade?.name ?? `Oportunidade para ${question.title}`,
  description: overrides?.description ?? question.regraOportunidade?.description ?? "",
  type: overrides?.type || question.regraOportunidade?.type || "Eficiência operacional",
  estimatedValue: overrides?.estimatedValue ?? question.regraOportunidade?.estimatedValue ?? null,
  confidence: overrides?.confidence || question.regraOportunidade?.confidence || "media",
  evidenceType: overrides?.evidenceType || question.regraOportunidade?.evidenceType || "a_coletar",
  enabled: overrides?.enabled ?? question.regraOportunidade?.enabled ?? true,
  autoGenerate: overrides?.autoGenerate ?? question.regraOportunidade?.autoGenerate ?? true,
  condition: syncConditionWithType(overrides?.condition ?? question.regraOportunidade?.condition, question.type),
  audit: question.regraOportunidade?.audit,
});

const parseNumericInput = (value: string) => (value === "" ? null : Number(value));

export function TemplateBuilder({ initialTemplate, onSubmit }: TemplateBuilderProps) {
  const { user } = useAuth();
  const userRole = (user?.user_metadata as Record<string, string | undefined> | undefined)?.role;
  const canArchive = Boolean(userRole && (userRole.toLowerCase().includes("admin") || userRole.toLowerCase().includes("gestor")));
  const isAnalyst = (userRole || "").toLowerCase().includes("analista");
  const [formState, setFormState] = useState<TemplateFormState>({
    name: initialTemplate?.name || "",
    description: initialTemplate?.description || "",
    tags: initialTemplate?.tags?.join(", ") || "",
    status: initialTemplate?.status || "draft",
    version: initialTemplate?.version || "v1.0",
    estimatedTimeMinutes: initialTemplate?.estimatedTimeMinutes ?? 30,
    sections: initialTemplate?.sections || [],
    lastPublishedAt: initialTemplate?.lastPublishedAt,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingQuestion, setDraggingQuestion] = useState<{ sectionId: string; questionId: string } | null>(null);
  const [questionDropTargets, setQuestionDropTargets] = useState<Record<string, string | null>>({});
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishChangeType, setPublishChangeType] = useState<"minor" | "major">("minor");

  const questionCount = useMemo(
    () => formState.sections.reduce((total, section) => total + (section.questions?.length || 0), 0),
    [formState.sections]
  );

  const buildPayload = (status: DiagnosticTemplateStatus): Omit<DiagnosticTemplate, "id"> & { id?: string } => {
    const normalizedSections = formState.sections.map((section, index) => ({
      ...section,
      order: index + 1,
      weight: section.weight || 1,
      questions: (section.questions || []).map((question, questionIndex) => ({
        ...question,
        order: questionIndex + 1,
        weight: question.weight || 1,
        criticality: question.criticality || "media",
        type: question.type || "yes_no",
        required: question.required ?? true,
      })),
    }));

    return {
      id: initialTemplate?.id,
      name: formState.name.trim() || "Template sem nome",
      description: formState.description.trim() || undefined,
      tags: formState.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status,
      version: formState.version || "v1.0",
      revision: initialTemplate ? (initialTemplate.revision || 1) + 1 : 1,
      sections: normalizedSections,
      sectionsCount: normalizedSections.length,
      questionCount,
      estimatedTimeMinutes: formState.estimatedTimeMinutes ?? undefined,
      lastPublishedAt: formState.lastPublishedAt,
      updatedAt: formatDatePtBR(new Date()),
      createdAt: initialTemplate?.createdAt || formatDatePtBR(new Date()),
      audit: initialTemplate?.audit,
    };
  };

  const addSection = () => {
    setFormState((prev) => ({
      ...prev,
      sections: [...prev.sections, createSection(prev.sections.length + 1)],
    }));
  };

  const updateSection = (sectionId: string, partial: Partial<TemplateSection>) => {
    setFormState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, ...partial } : section)),
    }));
  };

  const removeSection = (sectionId: string) => {
    setFormState((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const addQuestion = (sectionId: string) => {
    setFormState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...(section.questions || []), createQuestion((section.questions || []).length + 1)] }
          : section
      ),
    }));
  };

  const updateQuestion = (sectionId: string, questionId: string, partial: Partial<TemplateQuestion>) => {
    setFormState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          questions: section.questions?.map((question) =>
            question.id === questionId ? { ...question, ...partial } : question
          ),
        };
      }),
    }));
  };

  const updateQuestionRule = (
    sectionId: string,
    questionId: string,
    updater: (question: TemplateQuestion) => TemplateOpportunityRule | undefined
  ) => {
    setFormState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          questions: section.questions?.map((question) =>
            question.id === questionId ? { ...question, regraOportunidade: updater(question) } : question
          ),
        };
      }),
    }));
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setFormState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: section.questions?.filter((question) => question.id !== questionId) || [] }
          : section
      ),
    }));
  };

  const handleOpportunityToggle = (
    sectionId: string,
    questionId: string,
    enabled: boolean
  ) => {
    updateQuestionRule(sectionId, questionId, (question) => buildOpportunityRule(question, { enabled }));
  };

  const handleOpportunityFieldChange = (
    sectionId: string,
    questionId: string,
    updater: (rule: TemplateOpportunityRule, question: TemplateQuestion) => TemplateOpportunityRule
  ) => {
    updateQuestionRule(sectionId, questionId, (question) => {
      const baseRule = buildOpportunityRule(question);
      return updater(baseRule, question);
    });
  };

  const handleOpportunityConditionChange = (
    sectionId: string,
    questionId: string,
    updater: (condition: OpportunityRuleCondition, question: TemplateQuestion) => OpportunityRuleCondition
  ) => {
    updateQuestionRule(sectionId, questionId, (question) => {
      const baseRule = buildOpportunityRule(question);
      const nextCondition = updater(baseRule.condition || defaultOpportunityCondition(question.type), question);
      return { ...baseRule, condition: nextCondition };
    });
  };

  const renderOpportunityConditionFields = (sectionId: string, question: TemplateQuestion) => {
    const condition = question.regraOportunidade?.condition || defaultOpportunityCondition(question.type);

    if (question.type === "yes_no") {
      return (
        <div className="space-y-2">
          <Label>Condição</Label>
          <Select
            value={condition.type === "yes_no" ? condition.expectedAnswer : "no"}
            onValueChange={(value) =>
              handleOpportunityConditionChange(sectionId, question.id, () => ({
                type: "yes_no",
                expectedAnswer: value as "yes" | "no",
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Quando a resposta for Não</SelectItem>
              <SelectItem value="yes">Quando a resposta for Sim</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (question.type === "scale") {
      const current = condition.type === "scale" ? condition : { type: "scale", minValue: null, maxValue: null };
      return (
        <div className="space-y-2">
          <Label>Faixa de escala que gera oportunidade</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              value={current.minValue ?? ""}
              onChange={(event) =>
                handleOpportunityConditionChange(sectionId, question.id, (previous) => ({
                  type: "scale",
                  minValue: parseNumericInput(event.target.value),
                  maxValue: previous.type === "scale" ? previous.maxValue ?? null : null,
                }))
              }
              placeholder="Mínimo"
            />
            <Input
              type="number"
              min={0}
              value={current.maxValue ?? ""}
              onChange={(event) =>
                handleOpportunityConditionChange(sectionId, question.id, (previous) => ({
                  type: "scale",
                  minValue: previous.type === "scale" ? previous.minValue ?? null : null,
                  maxValue: parseNumericInput(event.target.value),
                }))
              }
              placeholder="Máximo"
            />
          </div>
          <p className="text-xs text-muted-foreground">Use para escalas de 1 a 5 ou 0 a 10.</p>
        </div>
      );
    }

    if (question.type === "number") {
      const current = condition.type === "number" ? condition : { type: "number", operator: "<=", value: null };
      return (
        <div className="space-y-2">
          <Label>Condição numérica</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={current.operator}
              onValueChange={(value) =>
                handleOpportunityConditionChange(sectionId, question.id, (previous) => ({
                  type: "number",
                  operator: value as ">" | ">=" | "<" | "<=" | "=",
                  value: previous.type === "number" ? previous.value ?? null : null,
                  unit: previous.type === "number" ? previous.unit || "numero" : "numero",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=">">Maior que</SelectItem>
                <SelectItem value=">=">Maior ou igual a</SelectItem>
                <SelectItem value="<">Menor que</SelectItem>
                <SelectItem value="<=">Menor ou igual a</SelectItem>
                <SelectItem value="=">Igual a</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={current.value ?? ""}
              onChange={(event) =>
                handleOpportunityConditionChange(sectionId, question.id, (previous) => ({
                  type: "number",
                  operator: previous.type === "number" ? previous.operator : "<=",
                  value: parseNumericInput(event.target.value),
                  unit: previous.type === "number" ? previous.unit || "numero" : "numero",
                }))
              }
              placeholder="Valor"
            />
            <Select
              value={current.unit || "numero"}
              onValueChange={(value) =>
                handleOpportunityConditionChange(sectionId, question.id, (previous) => ({
                  type: "number",
                  operator: previous.type === "number" ? previous.operator : "<=",
                  value: previous.type === "number" ? previous.value ?? null : null,
                  unit: value as "numero" | "moeda" | "percentual",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numero">Número</SelectItem>
                <SelectItem value="moeda">Moeda</SelectItem>
                <SelectItem value="percentual">Percentual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Configure para perguntas de número, moeda ou %.</p>
        </div>
      );
    }

    if (question.type === "multiple_choice") {
      const current =
        condition.type === "multiple_choice"
          ? condition
          : { type: "multiple_choice", matchingOptions: [], matchStrategy: "any" };
      return (
        <div className="space-y-2">
          <Label>Opções que geram oportunidade</Label>
          <Input
            value={(current.matchingOptions || []).join(", ")}
            onChange={(event) =>
              handleOpportunityConditionChange(sectionId, question.id, (previous) => ({
                type: "multiple_choice",
                matchingOptions: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
                matchStrategy: previous.type === "multiple_choice" ? previous.matchStrategy || "any" : "any",
              }))
            }
            placeholder="Separe por vírgula"
          />
          <Select
            value={current.matchStrategy || "any"}
            onValueChange={(value) =>
              handleOpportunityConditionChange(sectionId, question.id, (previous) => ({
                type: "multiple_choice",
                matchingOptions:
                  previous.type === "multiple_choice" ? previous.matchingOptions || [] : current.matchingOptions || [],
                matchStrategy: value as "any" | "all",
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer opção listada</SelectItem>
              <SelectItem value="all">Todas as opções listadas</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Use as mesmas opções configuradas na pergunta.</p>
        </div>
      );
    }

    if (question.type === "text") {
      const keyword = condition.type === "text" ? condition.keyword || "" : "";
      return (
        <div className="space-y-2">
          <Label>Palavra-chave ou marcador</Label>
          <Input
            value={keyword}
            onChange={(event) =>
              handleOpportunityConditionChange(sectionId, question.id, () => ({
                type: "text",
                keyword: event.target.value,
              }))
            }
            placeholder="Ex.: risco, atraso, falta de processo"
          />
          <p className="text-xs text-muted-foreground">
            Referência para revisão manual da resposta.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Configure o tipo da pergunta para habilitar regras de oportunidade.
      </div>
    );
  };

  const handleSectionDragStart = (sectionId: string) => setDraggingSectionId(sectionId);

  const handleSectionDrop = (targetSectionId: string) => {
    if (!draggingSectionId || draggingSectionId === targetSectionId) return;
    setFormState((prev) => {
      const sections = [...prev.sections];
      const fromIndex = sections.findIndex((section) => section.id === draggingSectionId);
      const toIndex = sections.findIndex((section) => section.id === targetSectionId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      return { ...prev, sections };
    });
    setDraggingSectionId(null);
  };

  const handleQuestionDragStart = (sectionId: string, questionId: string) =>
    setDraggingQuestion({ sectionId, questionId });

  const handleQuestionDrop = (sectionId: string, targetQuestionId?: string) => {
    if (!draggingQuestion || draggingQuestion.sectionId !== sectionId) return;
    const { questionId } = draggingQuestion;

    setFormState((prev) => {
      const sections = [...prev.sections];
      const sectionIndex = sections.findIndex((section) => section.id === sectionId);
      if (sectionIndex === -1) return prev;
      const questions = [...(sections[sectionIndex].questions || [])];
      const fromIndex = questions.findIndex((question) => question.id === questionId);
      const toIndex = targetQuestionId ? questions.findIndex((question) => question.id === targetQuestionId) : questions.length;
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = questions.splice(fromIndex, 1);
      questions.splice(toIndex, 0, moved);
      sections[sectionIndex] = { ...sections[sectionIndex], questions };
      return { ...prev, sections };
    });

    setDraggingQuestion(null);
    setQuestionDropTargets((prev) => ({ ...prev, [sectionId]: null }));
  };

  const validateBeforeAction = (action: TemplateBuilderAction) => {
    const errors: string[] = [];
    if (!formState.name.trim()) errors.push("Informe o nome do template.");
    if (action === "publish") {
      if (!formState.sections.length) {
        errors.push("Adicione pelo menos uma seção para publicar.");
      }
      const emptySections = formState.sections.filter((section) => !section.questions?.length);
      if (emptySections.length) {
        errors.push("Cada seção precisa ter pelo menos uma pergunta para publicar.");
      }
      if (questionCount === 0) {
        errors.push("Inclua ao menos uma pergunta antes de publicar.");
      }
    }

    if (errors.length) {
      setValidationErrors(errors);
      toast.error("Revise os campos obrigatórios antes de continuar.");
      return false;
    }

    setValidationErrors([]);
    return true;
  };

  const handleAction = (action: TemplateBuilderAction) => {
    if (isAnalyst) {
      toast.error("Analistas não podem criar, editar ou publicar templates.");
      return;
    }

    if (!validateBeforeAction(action)) return;

    if (action === "publish") {
      setPublishDialogOpen(true);
      return;
    }

    const status: DiagnosticTemplateStatus = action === "draft" ? "draft" : formState.status || "draft";
    const payload = buildPayload(status);
    onSubmit(payload, action);
  };

  const handlePublishConfirm = () => {
    if (isAnalyst) {
      toast.error("Analistas não podem criar, editar ou publicar templates.");
      setPublishDialogOpen(false);
      return;
    }

    const payload = buildPayload("published");
    const nextVersion = calculateNextTemplateVersion(payload.version, publishChangeType);
    const publishedAt = formatDatePtBR(new Date());

    const publishedPayload = {
      ...payload,
      status: "published" as DiagnosticTemplateStatus,
      version: nextVersion,
      lastPublishedAt: publishedAt,
      updatedAt: publishedAt,
    };

    setFormState((prev) => ({ ...prev, status: "published", version: nextVersion, lastPublishedAt: publishedAt }));
    onSubmit(publishedPayload, "publish");
    setPublishDialogOpen(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.75fr,1fr] gap-6 items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do template</CardTitle>
            <CardDescription>Defina nome, status e metadados antes de publicar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ex.: Diagnóstico de Operações"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value as DiagnosticTemplateStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived" disabled={!canArchive}>
                      Arquivado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Versão</Label>
                <Input
                  value={formState.version}
                  onChange={(event) => setFormState((prev) => ({ ...prev, version: event.target.value }))}
                  placeholder="v1.0"
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo estimado (min)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formState.estimatedTimeMinutes ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      estimatedTimeMinutes: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={formState.tags}
                  onChange={(event) => setFormState((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="Separadas por vírgula"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Explique quando e como usar este template"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estrutura</CardTitle>
            <CardDescription>Liste seções e perguntas, arrastando para reordenar quando necessário.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formState.sections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground space-y-3">
                <p className="font-medium text-foreground">Nenhuma seção adicionada</p>
                <p>Use o botão abaixo para começar pelo título da primeira seção.</p>
                <Button variant="outline" size="sm" onClick={addSection} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar seção
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {formState.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`rounded-lg border p-4 space-y-4 ${
                      draggingSectionId === section.id ? "ring-2 ring-primary/50" : ""
                    }`}
                    draggable
                    onDragStart={() => handleSectionDragStart(section.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleSectionDrop(section.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        <p className="text-sm uppercase">Seção {index + 1}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remover seção</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr,1fr] gap-3">
                      <div className="space-y-2">
                        <Label>Título da seção</Label>
                        <Input
                          value={section.title}
                          onChange={(event) => updateSection(section.id, { title: event.target.value })}
                          placeholder={`Seção ${index + 1}`}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Peso</Label>
                        <Input
                          type="number"
                          min={1}
                          value={section.weight ?? 1}
                          onChange={(event) =>
                            updateSection(section.id, { weight: Number(event.target.value) || 1 })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={section.description || ""}
                        onChange={(event) => updateSection(section.id, { description: event.target.value })}
                        placeholder="Contexto sobre o que deve ser avaliado nesta seção."
                      />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">Perguntas</p>
                          <p className="text-sm text-muted-foreground">
                            Arraste para reordenar ou clique para editar detalhes.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => addQuestion(section.id)} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Adicionar pergunta
                        </Button>
                      </div>
                      {section.questions?.length ? (
                        <div
                          className="space-y-3"
                          onDragOver={(event) => {
                            event.preventDefault();
                            setQuestionDropTargets((prev) => ({ ...prev, [section.id]: null }));
                          }}
                          onDrop={() => handleQuestionDrop(section.id)}
                        >
                          {section.questions.map((question, questionIndex) => (
                            <div
                              key={question.id}
                              className={`rounded-md border p-3 space-y-3 ${
                                questionDropTargets[section.id] === question.id ? "ring-2 ring-primary/50" : ""
                              }`}
                              draggable
                              onDragStart={() => handleQuestionDragStart(section.id, question.id)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setQuestionDropTargets((prev) => ({ ...prev, [section.id]: question.id }));
                              }}
                              onDrop={() => handleQuestionDrop(section.id, question.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <GripVertical className="h-4 w-4" />
                                  <p className="text-sm font-medium">Pergunta {questionIndex + 1}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => removeQuestion(section.id, question.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Remover pergunta</span>
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                  value={question.title}
                                  onChange={(event) =>
                                    updateQuestion(section.id, question.id, { title: event.target.value })
                                  }
                                  placeholder="Pergunta objetiva e clara"
                                  required
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                <div className="space-y-2">
                                  <Label>Tipo</Label>
                                  <Select
                                    value={question.type}
                                    onValueChange={(value) => {
                                      const nextType = value as TemplateQuestion["type"];
                                      const nextRule = question.regraOportunidade
                                        ? buildOpportunityRule({ ...question, type: nextType }, {
                                            condition: syncConditionWithType(question.regraOportunidade.condition, nextType),
                                          })
                                        : undefined;

                                      updateQuestion(section.id, question.id, {
                                        type: nextType,
                                        regraOportunidade: nextRule,
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes_no">Sim/Não</SelectItem>
                                      <SelectItem value="scale">Escala</SelectItem>
                                      <SelectItem value="text">Texto</SelectItem>
                                      <SelectItem value="number">Número</SelectItem>
                                      <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                                      <SelectItem value="attachment">Evidência</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Criticidade</Label>
                                  <Select
                                    value={question.criticality}
                                    onValueChange={(value) =>
                                      updateQuestion(section.id, question.id, {
                                        criticality: value as TemplateQuestion["criticality"],
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="baixa">Baixa</SelectItem>
                                      <SelectItem value="media">Média</SelectItem>
                                      <SelectItem value="alta">Alta</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                  <div>
                                    <p className="text-sm font-medium">Obrigatória</p>
                                    <p className="text-xs text-muted-foreground">
                                      Marque para exigir resposta durante o diagnóstico.
                                    </p>
                                  </div>
                                  <Switch
                                    checked={question.required}
                                    onCheckedChange={(checked) =>
                                      updateQuestion(section.id, question.id, { required: checked })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                  <div>
                                    <p className="text-sm font-medium">Entra no score</p>
                                    <p className="text-xs text-muted-foreground">
                                      Desative para perguntas que não devem impactar a nota.
                                    </p>
                                  </div>
                                  <Switch
                                    checked={question.includeInScore ?? true}
                                    onCheckedChange={(checked) =>
                                      updateQuestion(section.id, question.id, { includeInScore: checked })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Descrição ou instrução</Label>
                                <Textarea
                                  value={question.description || ""}
                                  onChange={(event) =>
                                    updateQuestion(section.id, question.id, { description: event.target.value })
                                  }
                                  placeholder="Explique o contexto ou dê exemplos de resposta."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Texto auxiliar</Label>
                                <Input
                                  value={question.helperText || ""}
                                  onChange={(event) =>
                                    updateQuestion(section.id, question.id, { helperText: event.target.value })
                                  }
                                  placeholder="Dica rápida para quem está respondendo"
                                />
                              </div>
                              {question.type === "multiple_choice" && (
                                <div className="space-y-2">
                                  <Label>Opções de resposta</Label>
                                  <Textarea
                                    value={(question.options || []).join("\n")}
                                    onChange={(event) =>
                                      updateQuestion(section.id, question.id, {
                                        options: event.target.value
                                          .split("\n")
                                          .map((item) => item.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    placeholder={"Uma opção por linha"}
                                    rows={3}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    As opções listadas serão usadas no preview e na condição de oportunidade.
                                  </p>
                                </div>
                              )}
                              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium">Gerar oportunidade</p>
                                    <p className="text-xs text-muted-foreground">
                                      Ative para criar uma regra automática vinculada à resposta.
                                    </p>
                                  </div>
                                  <Switch
                                    checked={question.regraOportunidade?.enabled ?? false}
                                    onCheckedChange={(checked) => handleOpportunityToggle(section.id, question.id, checked)}
                                  />
                                </div>

                                {question.regraOportunidade?.enabled && (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label>Nome da regra</Label>
                                        <Input
                                          value={question.regraOportunidade.name}
                                          onChange={(event) =>
                                            handleOpportunityFieldChange(section.id, question.id, (rule) => ({
                                              ...rule,
                                              name: event.target.value,
                                            }))
                                          }
                                          placeholder="Descreva a oportunidade gerada"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Tipo de oportunidade</Label>
                                        <Select
                                          value={question.regraOportunidade.type}
                                          onValueChange={(value) =>
                                            handleOpportunityFieldChange(section.id, question.id, (rule) => ({
                                              ...rule,
                                              type: value as Opportunity["type"],
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {opportunityTypes.map((type) => (
                                              <SelectItem key={type} value={type}>
                                                {type}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="space-y-2">
                                        <Label>Valor estimado (R$)</Label>
                                        <Input
                                          type="number"
                                          value={question.regraOportunidade.estimatedValue ?? ""}
                                          onChange={(event) =>
                                            handleOpportunityFieldChange(section.id, question.id, (rule) => ({
                                              ...rule,
                                              estimatedValue: parseNumericInput(event.target.value),
                                            }))
                                          }
                                          placeholder="50000"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Confiança</Label>
                                        <Select
                                          value={question.regraOportunidade.confidence || "media"}
                                          onValueChange={(value) =>
                                            handleOpportunityFieldChange(section.id, question.id, (rule) => ({
                                              ...rule,
                                              confidence: value as TemplateOpportunityRule["confidence"],
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="baixa">Baixa</SelectItem>
                                            <SelectItem value="media">Média</SelectItem>
                                            <SelectItem value="alta">Alta</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Evidência</Label>
                                        <Select
                                          value={question.regraOportunidade.evidenceType || "a_coletar"}
                                          onValueChange={(value) =>
                                            handleOpportunityFieldChange(section.id, question.id, (rule) => ({
                                              ...rule,
                                              evidenceType: value as TemplateOpportunityRule["evidenceType"],
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="a_coletar">A coletar</SelectItem>
                                            <SelectItem value="upload">Upload</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Descrição</Label>
                                      <Textarea
                                        value={question.regraOportunidade.description || ""}
                                        onChange={(event) =>
                                          handleOpportunityFieldChange(section.id, question.id, (rule) => ({
                                            ...rule,
                                            description: event.target.value,
                                          }))
                                        }
                                        placeholder="Explique o impacto ou evidência esperada"
                                        rows={3}
                                      />
                                    </div>

                                    {renderOpportunityConditionFields(section.id, question)}

                                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                      <div>
                                        <p className="text-sm font-medium">Gerar automaticamente</p>
                                        <p className="text-xs text-muted-foreground">
                                          Cria a oportunidade assim que a condição for atendida.
                                        </p>
                                      </div>
                                      <Switch
                                        checked={question.regraOportunidade.autoGenerate}
                                        onCheckedChange={(checked) =>
                                          handleOpportunityFieldChange(section.id, question.id, (rule) => ({
                                            ...rule,
                                            autoGenerate: checked,
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
                          Nenhuma pergunta adicionada nesta seção.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addSection} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar seção
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validação</AlertTitle>
            <AlertDescription className="space-y-1">
              {validationErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          {isAnalyst && (
            <Alert variant="destructive" className="mx-6 mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acesso restrito</AlertTitle>
              <AlertDescription>
                Perfis de Analista podem visualizar templates, mas não criar, editar ou publicar.
              </AlertDescription>
            </Alert>
          )}
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" /> {formState.sections.length} seções
              </span>
              <span className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4" /> {questionCount} perguntas
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => handleAction("draft")} disabled={isAnalyst}>
                <Save className="h-4 w-4" />
                Salvar rascunho
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => handleAction("preview")} disabled={isAnalyst}>
                <Eye className="h-4 w-4" />
                Preview completo
              </Button>
              <Button variant="secondary" className="gap-2" onClick={() => handleAction("duplicate")} disabled={isAnalyst}>
                <Copy className="h-4 w-4" />
                Duplicar
              </Button>
              <Button className="gap-2" onClick={() => handleAction("publish")} disabled={isAnalyst}>
                <Send className="h-4 w-4" />
                Publicar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden xl:block">
        <TemplatePreviewPanel
          name={formState.name}
          description={formState.description}
          status={formState.status}
          tags={formState.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)}
          sections={formState.sections}
          questionCount={questionCount}
        />
      </div>

      <div className="xl:hidden">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BadgeCheck className="h-4 w-4" />
          Preview rápido
        </CardTitle>
            <CardDescription>Visualize como as seções e perguntas ficam para o respondente.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[420px]">
              <TemplatePreviewPanel
                name={formState.name}
                description={formState.description}
                status={formState.status}
                tags={formState.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)}
                sections={formState.sections}
                questionCount={questionCount}
                condensed
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tipo de publicação</DialogTitle>
            <DialogDescription>Confirme se a atualização é pequena (incremental) ou grande (quebra de versão).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Qual o tipo da mudança?</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                type="button"
                variant={publishChangeType === "minor" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPublishChangeType("minor")}
              >
                <div className="text-left">
                  <p className="font-medium">Pequena</p>
                  <p className="text-xs text-muted-foreground">Ajustes incrementais. Nova versão: {calculateNextTemplateVersion(formState.version, "minor")}</p>
                </div>
              </Button>
              <Button
                type="button"
                variant={publishChangeType === "major" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPublishChangeType("major")}
              >
                <div className="text-left">
                  <p className="font-medium">Grande</p>
                  <p className="text-xs text-muted-foreground">Mudanças estruturais. Nova versão: {calculateNextTemplateVersion(formState.version, "major")}</p>
                </div>
              </Button>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePublishConfirm} disabled={isAnalyst}>
                Publicar template
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
