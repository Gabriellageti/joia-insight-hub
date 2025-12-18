import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DiagnosticTemplateStatus, TemplateQuestion, TemplateSection } from "@/types";
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
                      section.questions.map((question, questionIndex) => (
                        <div key={question.id} className="rounded-md border p-3 space-y-2">
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
                            {question.type === "attachment" && <Badge variant="outline">Evidência</Badge>}
                          </div>
                        </div>
                      ))
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
