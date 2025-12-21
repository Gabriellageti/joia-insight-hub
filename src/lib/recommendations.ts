import { addDays } from "date-fns";
import {
  ActionPlan,
  ActionPriority,
  ActionImpact,
  ActionRecommendation,
  Diagnostic,
  DiagnosticTemplate,
  TemplateQuestion,
} from "@/types";
import { AnswerValue, resolveAnswerValue } from "@/lib/diagnostic-evaluation";
import { formatDatePtBR } from "@/lib/dates";

const isAnswered = (value: AnswerValue): boolean => {
  if (value === null || typeof value === "undefined") return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const priorityFromCriticality = (criticality: TemplateQuestion["criticality"]): ActionPriority => {
  switch (criticality) {
    case "alta":
      return "alta";
    case "media":
      return "media";
    default:
      return "baixa";
  }
};

const impactFromCriticality = (criticality: TemplateQuestion["criticality"]): ActionImpact => {
  switch (criticality) {
    case "alta":
      return "alto";
    case "media":
      return "medio";
    default:
      return "baixo";
  }
};

const suggestDueDate = (priority: ActionPriority): string => {
  const offset = priority === "alta" ? 14 : priority === "media" ? 30 : 45;
  return formatDatePtBR(addDays(new Date(), offset));
};

const generalScoreRecommendations = (
  score: number,
  responsible: string
): ActionRecommendation[] => {
  if (score < 50) {
    return [
      {
        id: "score-critical",
        title: "Implantar governança mínima e estabilizar urgências",
        description:
          "Score abaixo de 50 indica lacunas críticas. Estruture rituais semanais e controles básicos antes de avançar para otimizações.",
        priority: "alta",
        impact: "alto",
        responsible,
        dueDate: suggestDueDate("alta"),
        rationale: "Score < 50",
      },
    ];
  }

  if (score < 80) {
    return [
      {
        id: "score-standard",
        title: "Padronizar processos-chave do diagnóstico",
        description:
          "Fortaleça rotinas recorrentes (reuniões, SLAs e indicadores) para atingir consistência mínima antes de escalar melhorias.",
        priority: "media",
        impact: "medio",
        responsible,
        dueDate: suggestDueDate("media"),
        rationale: "Score entre 50 e 79",
      },
    ];
  }

  return [
    {
      id: "score-advance",
      title: "Consolidar boas práticas e medir impacto",
      description:
        "Score alto. Priorize melhorias incrementais, documente padrões e conecte indicadores de resultado às rotinas existentes.",
      priority: "baixa",
      impact: "medio",
      responsible,
      dueDate: suggestDueDate("baixa"),
      rationale: "Score >= 80",
    },
  ];
};

const buildQuestionAction = (
  question: TemplateQuestion,
  value: AnswerValue,
  responsible: string
): ActionRecommendation | null => {
  if (!isAnswered(value)) return null;

  if (question.type === "yes_no" && value === "no") {
    return {
      id: `${question.id}-corrigir`,
      title: `Implementar: ${question.title}`,
      description:
        "Resposta negativa em pergunta crítica. Estruture processo ou ferramenta para endereçar a lacuna identificada.",
      priority: priorityFromCriticality(question.criticality),
      impact: impactFromCriticality(question.criticality),
      responsible,
      dueDate: suggestDueDate(priorityFromCriticality(question.criticality)),
      relatedQuestionId: question.id,
      rationale: "Resposta 'Não' em requisito-chave",
    };
  }

  if (question.type === "number" && typeof value === "number" && typeof question.maxValue === "number") {
    const tolerance = question.maxValue * 0.2;
    if (value > question.maxValue + tolerance) {
      return {
        id: `${question.id}-reduzir`,
        title: `Reduzir indicador: ${question.title}`,
        description:
          "Valor acima do limite esperado. Revise o processo, crie metas e monitore semanalmente até atingir o patamar desejado.",
        priority: priorityFromCriticality(question.criticality),
        impact: impactFromCriticality(question.criticality),
        responsible,
        dueDate: suggestDueDate(priorityFromCriticality(question.criticality)),
        relatedQuestionId: question.id,
        rationale: "Valor numérico acima do limite definido",
      };
    }
  }

  if (question.type === "multiple_choice" && Array.isArray(value)) {
    const missingCriticalOption = (question.optionsWithWeight || [])
      .filter((option) => (option.weight ?? 0) >= 2)
      .find((option) => !value.includes(option.label));

    if (missingCriticalOption) {
      return {
        id: `${question.id}-opcao`,
        title: `Adicionar prática: ${missingCriticalOption.label}`,
        description:
          "Opção relevante não marcada. Ajuste o processo para incorporar essa prática e elevar maturidade da área.",
        priority: priorityFromCriticality(question.criticality),
        impact: "medio",
        responsible,
        dueDate: suggestDueDate(priorityFromCriticality(question.criticality)),
        relatedQuestionId: question.id,
        rationale: "Opção crítica não selecionada",
      };
    }
  }

  return null;
};

export const generateRecommendations = ({
  template,
  answers,
  score,
  responsibleName,
}: {
  template: DiagnosticTemplate;
  answers: Record<string, AnswerValue>;
  score: number;
  responsibleName?: string;
}): ActionRecommendation[] => {
  const responsible = responsibleName || "Equipe JoIA";
  const actions: ActionRecommendation[] = [...generalScoreRecommendations(score, responsible)];

  template.sections.forEach((section) => {
    section.questions?.forEach((question) => {
      const action = buildQuestionAction(question, resolveAnswerValue(answers[question.id]), responsible);
      if (action) actions.push(action);
    });
  });

  const uniqueActions = new Map<string, ActionRecommendation>();
  actions.forEach((action) => {
    if (!uniqueActions.has(action.id)) uniqueActions.set(action.id, action);
  });

  return Array.from(uniqueActions.values());
};

export const buildActionPlan = ({
  diagnostic,
  recommendations,
  score,
}: {
  diagnostic: Diagnostic;
  recommendations: ActionRecommendation[];
  score: number;
}): ActionPlan => ({
  title: `Plano de ação • ${diagnostic.projectName}`,
  description: `Ações sugeridas automaticamente para o diagnóstico "${diagnostic.name}" (score ${score}).`,
  generatedAt: formatDatePtBR(new Date()),
  actions: recommendations,
});
