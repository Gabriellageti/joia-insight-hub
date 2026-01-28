import { addDays } from "date-fns";
import {
  ActionPlan,
  ActionPriority,
  ActionImpact,
  ActionRecommendation,
  Diagnostic,
  DiagnosticTemplate,
  ImpactProjection,
  TemplateQuestion,
} from "@/types";
import { AnswerValue, resolveAnswerValue } from "@/lib/diagnostic-evaluation";
import { formatDatePtBR } from "@/lib/dates";
import { isKickoffTemplate, calculateAreaScores, getAreaScoringsSummary } from "@/lib/area-scoring";
import { generateKickoffRecommendations } from "@/lib/kickoff-recommendations";

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

const estimatedEffortFromImpact = (impact: ActionImpact): string => {
  switch (impact) {
    case "alto":
      return "2-4 semanas de trabalho concentrado";
    case "medio":
      return "1-2 semanas com squad dedicado";
    default:
      return "3-5 dias de ajustes rápidos";
  }
};

const opportunityCostFromImpact = (impact: ActionImpact): string => {
  switch (impact) {
    case "alto":
      return "perda potencial equivalente a 1-2 meses de atraso em ganhos e mitigação";
    case "medio":
      return "risco de alongar ganhos por algumas semanas e manter retrabalho";
    default:
      return "pequenos atrasos e manutenção de ineficiências pontuais";
  }
};

const buildImpactProjection = (title: string, impact: ActionImpact): {
  positiveImpact: ImpactProjection;
  negativeImpact: ImpactProjection;
} => {
  const expectedBenefit = `Gera benefício direto em "${title}" com impacto ${impact} percebido.`;
  const avoidedRisk = `Reduz recorrência de falhas e riscos associados a ${title.toLowerCase()}.`;
  const effort = estimatedEffortFromImpact(impact);

  const positiveImpact: ImpactProjection = {
    expectedBenefit,
    avoidedRisk,
    estimatedCostOrTime: `Esforço estimado: ${effort}.`,
  };

  const negativeImpact: ImpactProjection = {
    expectedBenefit: `Benefícios projetados para "${title}" não serão capturados.`,
    avoidedRisk: `Gaps permanecem abertos e riscos podem escalar com impacto ${impact}.`,
    estimatedCostOrTime: `Custo de oportunidade: ${opportunityCostFromImpact(impact)}.`,
  };

  return { positiveImpact, negativeImpact };
};

const suggestDueDate = (priority: ActionPriority): string => {
  const offset = priority === "alta" ? 14 : priority === "media" ? 30 : 45;
  return formatDatePtBR(addDays(new Date(), offset));
};

const enrichActionWith5w2h = (
  diagnostic: Diagnostic,
  action: ActionRecommendation
): ActionRecommendation => {
  const defaultWhy = action.positiveImpact?.expectedBenefit || action.description;
  const defaultHowMuch =
    action.positiveImpact?.estimatedCostOrTime || action.negativeImpact?.estimatedCostOrTime;
  const location = `${diagnostic.projectName} • ${diagnostic.clientName}`;

  return {
    ...action,
    what: action.what || action.title,
    why: action.why || defaultWhy,
    where: action.where || location,
    when: action.when || action.dueDate,
    who: action.who || action.responsible,
    how: action.how || action.description,
    howMuch: action.howMuch || defaultHowMuch,
  };
};

const aggregateImpactProjection = (
  diagnostic: Diagnostic,
  actions: ActionRecommendation[],
  score: number
): { positiveImpact: ImpactProjection; negativeImpact: ImpactProjection } => {
  const highestImpact = actions.reduce<ActionImpact>((current, action) => {
    const rank: Record<ActionImpact, number> = { alto: 3, medio: 2, baixo: 1 };
    return rank[action.impact] > rank[current] ? action.impact : current;
  }, "medio");

  const totalActions = actions.length;
  const effort = estimatedEffortFromImpact(highestImpact);

  const positiveImpact: ImpactProjection = {
    expectedBenefit: `Execução do plano cobre ${totalActions} ação(ões) e captura ganhos combinados de impacto ${highestImpact}.`,
    avoidedRisk: `Mitiga riscos mapeados no diagnóstico "${diagnostic.name}" e sustenta a evolução do score atual (${score}).`,
    estimatedCostOrTime: `Esforço consolidado para início: ${effort}.`,
  };

  const negativeImpact: ImpactProjection = {
    expectedBenefit: `Sem execução, os benefícios esperados das ${totalActions} ações permanecem como oportunidade perdida.`,
    avoidedRisk: `Os riscos identificados seguem expostos e podem pressionar prazos e qualidade em ${diagnostic.projectName}.`,
    estimatedCostOrTime: `Custo de oportunidade: ${opportunityCostFromImpact(highestImpact)}.`,
  };

  return { positiveImpact, negativeImpact };
};

const generalScoreRecommendations = (
  score: number,
  responsible: string
): ActionRecommendation[] => {
  if (score < 50) {
    const impactDetails = buildImpactProjection(
      "Implantar governança mínima e estabilizar urgências",
      "alto"
    );
    return [
      {
        id: "score-critical",
        title: "Implantar governança mínima e estabilizar urgências",
        description:
          "Score abaixo de 50 indica lacunas críticas. Estruture rituais semanais e controles básicos antes de avançar para otimizações.",
        priority: "alta",
        impact: "alto",
        ...impactDetails,
        responsible,
        dueDate: suggestDueDate("alta"),
        rationale: "Score < 50",
      },
    ];
  }

  if (score < 80) {
    const impactDetails = buildImpactProjection("Padronizar processos-chave do diagnóstico", "medio");
    return [
      {
        id: "score-standard",
        title: "Padronizar processos-chave do diagnóstico",
        description:
          "Fortaleça rotinas recorrentes (reuniões, SLAs e indicadores) para atingir consistência mínima antes de escalar melhorias.",
        priority: "media",
        impact: "medio",
        ...impactDetails,
        responsible,
        dueDate: suggestDueDate("media"),
        rationale: "Score entre 50 e 79",
      },
    ];
  }

  const impactDetails = buildImpactProjection("Consolidar boas práticas e medir impacto", "medio");
  return [
    {
      id: "score-advance",
      title: "Consolidar boas práticas e medir impacto",
      description:
        "Score alto. Priorize melhorias incrementais, documente padrões e conecte indicadores de resultado às rotinas existentes.",
      priority: "baixa",
      impact: "medio",
      ...impactDetails,
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
      const impact = impactFromCriticality(question.criticality);
      const impactDetails = buildImpactProjection(question.title, impact);
      return {
        id: `${question.id}-corrigir`,
        title: `Implementar: ${question.title}`,
        description:
          "Resposta negativa em pergunta crítica. Estruture processo ou ferramenta para endereçar a lacuna identificada.",
        priority: priorityFromCriticality(question.criticality),
        impact,
        ...impactDetails,
        responsible,
        dueDate: suggestDueDate(priorityFromCriticality(question.criticality)),
        relatedQuestionId: question.id,
        rationale: "Resposta 'Não' em requisito-chave",
      };
  }

  if (question.type === "number" && typeof value === "number" && typeof question.maxValue === "number") {
    const tolerance = question.maxValue * 0.2;
    if (value > question.maxValue + tolerance) {
      const impact = impactFromCriticality(question.criticality);
      const impactDetails = buildImpactProjection(question.title, impact);
      return {
        id: `${question.id}-reduzir`,
        title: `Reduzir indicador: ${question.title}`,
        description:
          "Valor acima do limite esperado. Revise o processo, crie metas e monitore semanalmente até atingir o patamar desejado.",
        priority: priorityFromCriticality(question.criticality),
        impact,
        ...impactDetails,
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
      const impactDetails = buildImpactProjection(question.title, "medio");
      return {
        id: `${question.id}-opcao`,
        title: `Adicionar prática: ${missingCriticalOption.label}`,
        description:
          "Opção relevante não marcada. Ajuste o processo para incorporar essa prática e elevar maturidade da área.",
        priority: priorityFromCriticality(question.criticality),
        impact: "medio",
        ...impactDetails,
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

  // For Kickoff/Onboarding templates, use area-based scoring
  if (isKickoffTemplate(template)) {
    return generateKickoffRecommendations(template, answers, responsibleName);
  }

  // For other templates, use the standard scoring approach
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
}): ActionPlan => {
  const planImpact = aggregateImpactProjection(diagnostic, recommendations, score);
  const enrichedActions = recommendations.map((action) => enrichActionWith5w2h(diagnostic, action));

  return {
    title: `Plano de ação • ${diagnostic.projectName}`,
    description: `Ações sugeridas automaticamente para o diagnóstico "${diagnostic.name}" (score ${score}).`,
    generatedAt: formatDatePtBR(new Date()),
    positiveImpact: planImpact.positiveImpact,
    negativeImpact: planImpact.negativeImpact,
    actions: enrichedActions,
  };
};
