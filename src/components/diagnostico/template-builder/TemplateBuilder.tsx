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
  QuestionOption,
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
  onSubmit: (template: Omit<DiagnosticTemplate, "id"> & { id?: string }, action: TemplateBuilderAction) => Promise<void> | void;
  isSubmitting?: boolean;
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
  optionsWithWeight: [],
  placeholder: "",
  maxFileSizeMB: null,
  allowedFileTypes: [],
});

const parseNumericInput = (value: string) => (value === "" ? null : Number(value));

const defaultOptionWeight = 1;

const getOptionsWithWeight = (question: TemplateQuestion): QuestionOption[] => {
  if (question.optionsWithWeight?.length) return question.optionsWithWeight;
  if (question.options?.length)
    return question.options.map((label) => ({ label, weight: defaultOptionWeight }));
  return [];
};

const normalizeOptions = (options: QuestionOption[]) => ({
  optionsWithWeight: options,
  options: options.map((option) => option.label),
});

const sanitizeFileTypesInput = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function TemplateBuilder({ initialTemplate, onSubmit, isSubmitting }: TemplateBuilderProps) {
  const { can } = useAuth();
  const canEditTemplates = can("templates.update");
  const canArchive = can("templates.archive");
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
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const submitting = isSubmitting ?? internalSubmitting;

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
      revision: initialTemplate?.revision || 1,
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

  const handleQuestionTypeChange = (
    sectionId: string,
    question: TemplateQuestion,
    nextType: TemplateQuestion["type"]
  ) => {
    const typeSpecific: Partial<TemplateQuestion> = { type: nextType };

    if (nextType === "scale") {
      typeSpecific.minValue = question.minValue ?? 0;
      typeSpecific.maxValue = question.maxValue ?? 10;
    }

    if (nextType === "number") {
      typeSpecific.minValue = question.minValue ?? null;
      typeSpecific.maxValue = question.maxValue ?? null;
    }

    if (nextType === "text") {
      typeSpecific.placeholder = question.placeholder || "Digite sua resposta";
    }

    if (nextType === "multiple_choice") {
      const options = getOptionsWithWeight(question);
      const ensuredOptions = options.length
        ? options
        : [
            { label: "Opção 1", weight: defaultOptionWeight },
            { label: "Opção 2", weight: defaultOptionWeight },
          ];
      Object.assign(typeSpecific, normalizeOptions(ensuredOptions));
    }

    if (nextType === "attachment") {
      typeSpecific.maxFileSizeMB = question.maxFileSizeMB ?? 25;
      typeSpecific.allowedFileTypes = question.allowedFileTypes?.length
        ? question.allowedFileTypes
        : ["pdf", "jpg", "png"];
    }

    updateQuestion(sectionId, question.id, typeSpecific);
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

  const submitTemplate = async (payload: Omit<DiagnosticTemplate, "id"> & { id?: string }, action: TemplateBuilderAction) => {
    if (isSubmitting !== undefined) {
      await onSubmit(payload, action);
      return;
    }

    setInternalSubmitting(true);
    try {
      await onSubmit(payload, action);
    } finally {
      setInternalSubmitting(false);
    }
  };

  const handleAction = (action: TemplateBuilderAction) => {
    if (!canEditTemplates) {
      toast.error("Você não tem permissão para criar, editar ou publicar templates.");
      return;
    }

    if (!validateBeforeAction(action)) return;

    if (action === "publish") {
      setPublishDialogOpen(true);
      return;
    }

    const status: DiagnosticTemplateStatus = action === "draft" ? "draft" : formState.status || "draft";
    const payload = buildPayload(status);
    void submitTemplate(payload, action);
  };

  const handlePublishConfirm = () => {
    if (!canEditTemplates) {
      toast.error("Você não tem permissão para criar, editar ou publicar templates.");
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
      revision: (initialTemplate?.revision || 0) + 1,
      lastPublishedAt: publishedAt,
      updatedAt: publishedAt,
    };

    setFormState((prev) => ({ ...prev, status: "published", version: nextVersion, lastPublishedAt: publishedAt }));
    void submitTemplate(publishedPayload, "publish");
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
                          {section.questions.map((question, questionIndex) => {
                            const optionsWithWeight = getOptionsWithWeight(question);

                            return (
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) =>
                                    handleQuestionTypeChange(section.id, question, value as TemplateQuestion["type"])
                                  }
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
                              </div>
                              <div className="space-y-2">
                                <Label>Contexto para quem responde</Label>
                                <Textarea
                                  value={question.description || ""}
                                  onChange={(event) =>
                                    updateQuestion(section.id, question.id, { description: event.target.value })
                                  }
                                  placeholder="Explique em linguagem simples o assunto da pergunta e dê exemplos do que uma boa resposta pode trazer."
                                />
                              </div>

                              <details className="rounded-md border bg-muted/20 p-3">
                                <summary className="cursor-pointer text-sm font-medium">
                                  Configurações avançadas
                                </summary>
                                <div className="mt-4 space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="baixa">Baixa</SelectItem>
                                          <SelectItem value="media">Média</SelectItem>
                                          <SelectItem value="alta">Alta</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                      <div>
                                        <p className="text-sm font-medium">Entra no score</p>
                                        <p className="text-xs text-muted-foreground">Desative para perguntas que não devem impactar a nota.</p>
                                      </div>
                                      <Switch
                                        checked={question.includeInScore ?? true}
                                        onCheckedChange={(checked) => updateQuestion(section.id, question.id, { includeInScore: checked })}
                                      />
                                    </div>
                                  </div>
                              <div className="space-y-2">
                                <Label>Guia de campo para quem aplica</Label>
                                <Textarea
                                  value={question.helperText || ""}
                                  onChange={(event) =>
                                    updateQuestion(section.id, question.id, { helperText: event.target.value })
                                  }
                                  placeholder="Como fazer a pergunta, o que observar e como aprofundar a conversa se a resposta for vaga."
                                  rows={3}
                                />
                              </div>

                              {question.type === "scale" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Mínimo</Label>
                                    <Input
                                      type="number"
                                      value={question.minValue ?? 0}
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          minValue: parseNumericInput(event.target.value) ?? 0,
                                        })
                                      }
                                    />
                                    <p className="text-xs text-muted-foreground">Valor inicial da escala.</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Máximo</Label>
                                    <Input
                                      type="number"
                                      value={question.maxValue ?? 10}
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          maxValue: parseNumericInput(event.target.value) ?? 10,
                                        })
                                      }
                                    />
                                    <p className="text-xs text-muted-foreground">Valor final exibido no slider.</p>
                                  </div>
                                </div>
                              )}

                              {question.type === "number" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Valor mínimo (opcional)</Label>
                                    <Input
                                      type="number"
                                      value={question.minValue ?? ""}
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          minValue: parseNumericInput(event.target.value),
                                        })
                                      }
                                      placeholder="Sem mínimo"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Valor máximo (opcional)</Label>
                                    <Input
                                      type="number"
                                      value={question.maxValue ?? ""}
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          maxValue: parseNumericInput(event.target.value),
                                        })
                                      }
                                      placeholder="Sem limite"
                                    />
                                  </div>
                                </div>
                              )}

                              {question.type === "text" && (
                                <div className="space-y-2">
                                  <Label>Placeholder</Label>
                                  <Input
                                    value={question.placeholder || ""}
                                    onChange={(event) =>
                                      updateQuestion(section.id, question.id, { placeholder: event.target.value })
                                    }
                                    placeholder="Digite sua resposta"
                                  />
                                  <p className="text-xs text-muted-foreground">Texto exibido dentro do campo de resposta.</p>
                                </div>
                              )}

                              {question.type === "multiple_choice" && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Opções de resposta</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        updateQuestion(section.id, question.id, {
                                          ...normalizeOptions([
                                            ...optionsWithWeight,
                                            {
                                              label: `Opção ${optionsWithWeight.length + 1}`,
                                              weight: defaultOptionWeight,
                                            },
                                          ]),
                                        })
                                      }
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Adicionar opção
                                    </Button>
                                  </div>

                                  <div className="space-y-2">
                                    {optionsWithWeight.length === 0 && (
                                      <p className="text-xs text-muted-foreground">Inclua pelo menos uma opção.</p>
                                    )}
                                    {optionsWithWeight.map((option, optionIndex) => (
                                      <div key={`${question.id}-option-${optionIndex}`} className="grid grid-cols-1 md:grid-cols-[1fr,120px,40px] gap-2 items-center">
                                        <Input
                                          value={option.label}
                                          onChange={(event) => {
                                            const nextOptions = optionsWithWeight.map((current, currentIndex) =>
                                              currentIndex === optionIndex
                                                ? { ...current, label: event.target.value }
                                                : current
                                            );
                                            updateQuestion(section.id, question.id, {
                                              ...normalizeOptions(nextOptions),
                                            });
                                          }}
                                          placeholder={`Opção ${optionIndex + 1}`}
                                        />
                                        <Input
                                          type="number"
                                          min={0}
                                          value={option.weight ?? defaultOptionWeight}
                                          onChange={(event) => {
                                            const nextOptions = optionsWithWeight.map((current, currentIndex) =>
                                              currentIndex === optionIndex
                                                ? { ...current, weight: parseNumericInput(event.target.value) ?? defaultOptionWeight }
                                                : current
                                            );
                                            updateQuestion(section.id, question.id, {
                                              ...normalizeOptions(nextOptions),
                                            });
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive"
                                          onClick={() => {
                                            const nextOptions = optionsWithWeight.filter((_, currentIndex) => currentIndex !== optionIndex);
                                            updateQuestion(section.id, question.id, {
                                              ...normalizeOptions(nextOptions),
                                            });
                                          }}
                                          disabled={optionsWithWeight.length <= 1}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>

                                  <p className="text-xs text-muted-foreground">
                                    Use pesos para equilibrar opções e refletir o impacto na nota.
                                  </p>
                                </div>
                              )}

                              {question.type === "attachment" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Tamanho máximo (MB)</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={question.maxFileSizeMB ?? ""}
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          maxFileSizeMB: parseNumericInput(event.target.value),
                                        })
                                      }
                                      placeholder="Ex.: 25"
                                    />
                                    <p className="text-xs text-muted-foreground">Limite por arquivo enviado.</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tipos permitidos</Label>
                                    <Input
                                      value={(question.allowedFileTypes || []).join(", ")}
                                      onChange={(event) =>
                                        updateQuestion(section.id, question.id, {
                                          allowedFileTypes: sanitizeFileTypesInput(event.target.value),
                                        })
                                      }
                                      placeholder="pdf, jpg, png"
                                    />
                                    <p className="text-xs text-muted-foreground">Separe por vírgula para limitar extensões.</p>
                                  </div>
                                </div>
                              )}
                                </div>
                              </details>
                            </div>
                            );
                          })}
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
          {!canEditTemplates && (
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
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleAction("draft")}
                disabled={!canEditTemplates || submitting}
              >
                <Save className="h-4 w-4" />
                Salvar rascunho
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleAction("preview")}
                disabled={!canEditTemplates || submitting}
              >
                <Eye className="h-4 w-4" />
                Preview completo
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => handleAction("duplicate")}
                disabled={!canEditTemplates || submitting}
              >
                <Copy className="h-4 w-4" />
                Duplicar
              </Button>
              <Button className="gap-2" onClick={() => handleAction("publish")} disabled={!canEditTemplates || submitting}>
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
              <Button onClick={handlePublishConfirm} disabled={!canEditTemplates}>
                Publicar template
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
