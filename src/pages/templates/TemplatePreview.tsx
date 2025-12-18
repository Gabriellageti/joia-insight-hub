import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { formatDatePtBR } from "@/lib/dates";
import { toast } from "sonner";
import { DiagnosticTemplate, TemplateOpportunityRule } from "@/types";
import { AlarmClock, BookOpenText, Copy, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const statusLabels: Record<DiagnosticTemplate["status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const questionTypeLabels = {
  yes_no: "Sim/Não",
  scale: "Escala",
  text: "Texto",
  number: "Número",
  multiple_choice: "Múltipla escolha",
  attachment: "Evidência",
} as const;

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

export default function TemplatePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { templates, addTemplate } = useData();
  const { user } = useAuth();

  const userRole = (user?.user_metadata as Record<string, string | undefined> | undefined)?.role;
  const isAnalyst = (userRole || "").toLowerCase().includes("analista");

  const template = useMemo(() => templates.find((item) => item.id === id), [id, templates]);

  const questionCount = useMemo(
    () =>
      template?.questionCount ||
      template?.sections?.reduce((total, section) => total + (section.questions?.length || 0), 0) ||
      0,
    [template]
  );

  const handleDuplicate = () => {
    if (isAnalyst) {
      toast.error("Analistas não podem criar ou duplicar templates.");
      return;
    }
    if (!template) return;
    const duplicated = addTemplate({
      ...template,
      id: undefined,
      name: `${template.name} (cópia)`,
      updatedAt: formatDatePtBR(new Date()),
      revision: (template.revision || 1) + 1,
    });
    toast.success(`Template "${duplicated.name}" duplicado`);
    navigate(`/templates/${duplicated.id}/editar`);
  };

  const handleEdit = () => {
    if (isAnalyst) {
      toast.error("Analistas não podem editar templates.");
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
          <Button variant="outline" onClick={() => navigate("/templates")}>
            Voltar
          </Button>
          <Button onClick={() => navigate("/templates/novo")}>Criar novo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TemplatePageHeader
        eyebrow="Templates"
        title={template.name}
        description={template.description || "Preview completo do template selecionado."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button variant="secondary" onClick={handleEdit}>
              Editar
            </Button>
            <Button onClick={handleDuplicate} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicar
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

      <Card>
        <CardHeader>
          <CardTitle>Resumo do template</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span>Seções</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{template.sections?.length || 0}</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpenText className="h-4 w-4" />
              <span>Perguntas</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{questionCount}</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlarmClock className="h-4 w-4" />
              <span>Tempo estimado</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {template.estimatedTimeMinutes ? `${template.estimatedTimeMinutes} min` : "Não informado"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estrutura completa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!template.sections?.length ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Nenhuma seção cadastrada</p>
              <p>Utilize o botão Editar para adicionar seções e perguntas antes de aplicar.</p>
            </div>
          ) : (
            template.sections.map((section, sectionIndex) => (
              <div key={section.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase text-muted-foreground">Seção {sectionIndex + 1}</p>
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    {section.description && <p className="text-muted-foreground">{section.description}</p>}
                  </div>
                  <Badge variant="outline">Peso {section.weight ?? 1}</Badge>
                </div>
                <div className="space-y-2">
                  {!section.questions?.length ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Nenhuma pergunta cadastrada nesta seção.
                    </div>
                  ) : (
                    section.questions.map((question, questionIndex) => {
                      const conditionLabel = formatOpportunityCondition(question.regraOportunidade);

                      return (
                        <div key={question.id} className="rounded-md border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {sectionIndex + 1}.{questionIndex + 1} {question.title}
                              </p>
                              {question.description && (
                                <p className="text-sm text-muted-foreground">{question.description}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary">{questionTypeLabels[question.type]}</Badge>
                              <Badge variant="outline">Criticidade: {question.criticality}</Badge>
                              {question.required && <Badge variant="outline">Obrigatória</Badge>}
                            </div>
                          </div>
                          {question.regraOportunidade?.enabled && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                  )}
                </div>
                <Separator />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Preview completo. Use o botão de duplicação para criar variações sem perder o histórico.
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/templates")}>
            Voltar para lista
          </Button>
          <Button variant="secondary" onClick={handleEdit}>
            Editar
          </Button>
          <Button onClick={handleDuplicate} className="gap-2">
            <Copy className="h-4 w-4" />
            Duplicar
          </Button>
        </div>
      </div>
    </div>
  );
}
