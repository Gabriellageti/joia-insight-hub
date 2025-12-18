import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DiagnosticTemplate, DiagnosticTemplateStatus, TemplateQuestion, TemplateSection } from "@/types";
import { formatDatePtBR } from "@/lib/dates";

interface TemplateFormProps {
  initialTemplate?: DiagnosticTemplate;
  submitLabel?: string;
  onSubmit: (template: Omit<DiagnosticTemplate, "id"> & { id?: string }) => void;
}

type TemplateFormState = {
  name: string;
  description: string;
  tags: string;
  status: DiagnosticTemplateStatus;
  version: string;
  estimatedTimeMinutes: number | null;
  sections: TemplateSection[];
};

const createSection = (order: number): TemplateSection => ({
  id: `section-${Math.random().toString(36).slice(2, 8)}`,
  title: `Seção ${order}`,
  description: "",
  order,
  weight: 1,
  questions: [],
});

const createQuestion = (order: number): TemplateQuestion => ({
  id: `question-${Math.random().toString(36).slice(2, 8)}`,
  title: `Pergunta ${order}`,
  type: "yes_no",
  weight: 1,
  criticality: "media",
  required: true,
  includeInScore: true,
  order,
  options: [],
});

export function TemplateForm({ initialTemplate, onSubmit, submitLabel }: TemplateFormProps) {
  const [formState, setFormState] = useState<TemplateFormState>({
    name: initialTemplate?.name || "",
    description: initialTemplate?.description || "",
    tags: initialTemplate?.tags?.join(", ") || "",
    status: initialTemplate?.status || "draft",
    version: initialTemplate?.version || "v1.0",
    estimatedTimeMinutes: initialTemplate?.estimatedTimeMinutes ?? 30,
    sections: initialTemplate?.sections || [],
  });

  const questionCount = useMemo(
    () => formState.sections.reduce((total, section) => total + (section.questions?.length || 0), 0),
    [formState.sections]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

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
        includeInScore: question.includeInScore ?? true,
      })),
    }));

    const templatePayload: Omit<DiagnosticTemplate, "id"> & { id?: string } = {
      id: initialTemplate?.id,
      name: formState.name.trim() || "Template sem nome",
      description: formState.description.trim() || undefined,
      tags: formState.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: formState.status,
      version: formState.version || "v1.0",
      revision: initialTemplate ? (initialTemplate.revision || 1) + 1 : 1,
      sections: normalizedSections,
      sectionsCount: normalizedSections.length,
      questionCount,
      estimatedTimeMinutes: formState.estimatedTimeMinutes ?? undefined,
      updatedAt: formatDatePtBR(new Date()),
      createdAt: initialTemplate?.createdAt || formatDatePtBR(new Date()),
      audit: initialTemplate?.audit,
    };

    onSubmit(templatePayload);
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

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Informações do template</CardTitle>
          <CardDescription>Defina o nome, status e detalhes de publicação.</CardDescription>
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
                  <SelectItem value="archived">Arquivado</SelectItem>
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
          <CardDescription>
            Organize seções e perguntas para manter consistência na aplicação do diagnóstico.
          </CardDescription>
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
                <div key={section.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-[240px]">
                      <Label>Título da seção</Label>
                      <Input
                        value={section.title}
                        onChange={(event) => updateSection(section.id, { title: event.target.value })}
                        placeholder={`Seção ${index + 1}`}
                      />
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
                          Estruture prompts claros para acelerar a coleta de evidências.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addQuestion(section.id)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar pergunta
                      </Button>
                    </div>
                    {section.questions?.length ? (
                      <div className="space-y-3">
                        {section.questions.map((question, questionIndex) => (
                          <div key={question.id} className="rounded-md border p-3 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Pergunta {questionIndex + 1}</p>
                                <Input
                                  value={question.title}
                                  onChange={(event) =>
                                    updateQuestion(section.id, question.id, { title: event.target.value })
                                  }
                                  placeholder="Pergunta objetiva e clara"
                                />
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                              <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) => updateQuestion(section.id, question.id, { type: value as TemplateQuestion["type"] })}
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
                                    updateQuestion(section.id, question.id, { criticality: value as TemplateQuestion["criticality"] })
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
                                    Desative para perguntas de contexto que não pontuam.
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

      <div className="flex items-center justify-end gap-2">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{formState.sections.length}</span> seções •{" "}
          <span className="font-medium">{questionCount}</span> perguntas
        </div>
        <Button type="submit">{submitLabel || "Salvar"}</Button>
      </div>
    </form>
  );
}
