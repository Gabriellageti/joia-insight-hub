import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Save, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Diagnostic, DiagnosticTemplate, TemplateQuestion, TemplateSection } from "@/types";
import { DiagnosticAnswer, DiagnosticExecutionState } from "@/types/diagnostic-execution";
import { QuestionRenderer } from "./QuestionRenderer";
import { SectionNavigator } from "./SectionNavigator";
import { toast } from "sonner";
import { formatDatePtBR } from "@/lib/dates";

interface DiagnosticExecutionProps {
  diagnostic: Diagnostic;
  template: DiagnosticTemplate;
  onSave: (answers: Record<string, DiagnosticAnswer>, progress: number) => Promise<void>;
  onComplete: (answers: Record<string, DiagnosticAnswer>) => Promise<void>;
  onExit: () => void;
}

export function DiagnosticExecution({
  diagnostic,
  template,
  onSave,
  onComplete,
  onExit,
}: DiagnosticExecutionProps) {
  // Flatten all questions with section context
  const allQuestions = useMemo(() => {
    const questions: { section: TemplateSection; question: TemplateQuestion; globalIndex: number }[] = [];
    let globalIndex = 0;
    
    template.sections
      .sort((a, b) => a.order - b.order)
      .forEach((section) => {
        section.questions
          .sort((a, b) => a.order - b.order)
          .forEach((question) => {
            questions.push({ section, question, globalIndex });
            globalIndex++;
          });
      });
    
    return questions;
  }, [template.sections]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DiagnosticAnswer>>(diagnostic.answers || {});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const hasPendingChanges = useRef(false);

  const currentItem = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const currentAnswer = currentItem ? answers[currentItem.question.id] : undefined;

  const handleAnswer = useCallback((questionId: string, value: string | number | boolean | string[] | null) => {
    hasPendingChanges.current = true;
    setAnswers((prev) => {
      if (value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length)) {
        const { [questionId]: _removed, ...remaining } = prev;
        return remaining;
      }

      return {
        ...prev,
        [questionId]: {
          questionId,
          value,
          answeredAt: formatDatePtBR(new Date()) || new Date().toISOString(),
        },
      };
    });
  }, []);

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJumpToQuestion = (globalIndex: number) => {
    if (globalIndex >= 0 && globalIndex < totalQuestions) {
      setCurrentIndex(globalIndex);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(answers, progressPercent);
      hasPendingChanges.current = false;
      setLastSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      toast.success("Progresso salvo");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!hasPendingChanges.current) return;

    const timer = window.setTimeout(() => {
      void handleSave();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [answers]);

  const handleComplete = () => {
    // Check required questions
    const unansweredRequired = allQuestions.filter(
      (item) => item.question.required && !answers[item.question.id]
    );

    if (unansweredRequired.length > 0) {
      toast.error(`Existem ${unansweredRequired.length} perguntas obrigatórias não respondidas`);
      // Jump to first unanswered required
      const firstUnanswered = unansweredRequired[0];
      setCurrentIndex(firstUnanswered.globalIndex);
      return;
    }

    onComplete(answers);
  };

  const handleExit = () => {
    if (Object.keys(answers).length > 0) {
      if (window.confirm("Deseja salvar o progresso antes de sair?")) {
        handleSave().then(() => onExit());
        return;
      }
    }
    onExit();
  };

  // Group questions by section for navigator
  const sectionGroups = useMemo(() => {
    const groups: { section: TemplateSection; questions: typeof allQuestions }[] = [];
    let currentSection: TemplateSection | null = null;
    let currentGroup: typeof allQuestions = [];

    allQuestions.forEach((item) => {
      if (!currentSection || currentSection.id !== item.section.id) {
        if (currentSection && currentGroup.length > 0) {
          groups.push({ section: currentSection, questions: currentGroup });
        }
        currentSection = item.section;
        currentGroup = [item];
      } else {
        currentGroup.push(item);
      }
    });

    if (currentSection && currentGroup.length > 0) {
      groups.push({ section: currentSection, questions: currentGroup });
    }

    return groups;
  }, [allQuestions]);

  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-lg text-muted-foreground">Template sem perguntas configuradas</p>
        <Button variant="outline" onClick={onExit}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleExit}>
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{diagnostic.name}</h1>
              <p className="text-sm text-muted-foreground">
                {diagnostic.clientName} • {diagnostic.projectName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>~{template.estimatedTimeMinutes || 30} min</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            {lastSavedAt && !isSaving && (
              <span className="hidden sm:inline text-xs text-muted-foreground">Salvo às {lastSavedAt}</span>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Pergunta {currentIndex + 1} de {totalQuestions}
            </span>
            <span className="font-medium">{progressPercent}% completo</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Section navigator (sidebar on desktop) */}
        <div className="lg:w-64 flex-shrink-0">
          <SectionNavigator
            sections={sectionGroups}
            currentIndex={currentIndex}
            answers={answers}
            onJumpTo={handleJumpToQuestion}
          />
        </div>

        {/* Question area */}
        <div className="flex-1 flex flex-col overflow-auto">
          <Card className="flex-1">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {currentItem.section.title}
                  </Badge>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pergunta do diagnóstico</p>
                  <CardTitle className="mt-1 text-xl">{currentItem.question.title}</CardTitle>
                  {currentItem.question.description && (
                    <p className="text-muted-foreground mt-2">{currentItem.question.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentItem.question.required && (
                    <Badge variant="secondary" className="text-xs">Obrigatória</Badge>
                  )}
                  {currentItem.question.criticality === "alta" && (
                    <Badge className="bg-destructive/10 text-destructive text-xs">Alta criticidade</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(currentItem.section.description || currentItem.question.helperText) && (
                <div className="mb-5 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  {currentItem.section.description && (
                    <div>
                      <p className="font-medium text-primary">Objetivo desta etapa</p>
                      <p className="mt-1 text-muted-foreground">{currentItem.section.description}</p>
                    </div>
                  )}
                  {currentItem.question.helperText && (
                    <div>
                      <p className="font-medium text-primary">Guia do aplicador</p>
                      <p className="mt-1 text-muted-foreground">{currentItem.question.helperText}</p>
                    </div>
                  )}
                </div>
              )}
              <QuestionRenderer
                question={currentItem.question}
                value={currentAnswer?.value ?? null}
                onChange={(value) => handleAnswer(currentItem.question.id, value)}
              />
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              {currentIndex === totalQuestions - 1 ? (
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={handleComplete}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Concluir diagnóstico
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
