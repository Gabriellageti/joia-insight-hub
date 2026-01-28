/**
 * Area-based scoring system for Kickoff/Onboarding diagnostics
 * Formula: Score Área = (Sintomas × Peso) + Dor Declarada + Penalidades Críticas
 */

import { DiagnosticTemplate, TemplateQuestion } from "@/types";
import { AnswerValue, resolveAnswerValue } from "@/lib/diagnostic-evaluation";
import { DiagnosticAnswer } from "@/types/diagnostic-execution";

export type AreaName = "compras" | "financas" | "estoque" | "operacoes";

export interface AreaScore {
  area: AreaName;
  areaLabel: string;
  dorDeclarada: number;
  sintomasScore: number;
  sintomasCount: number;
  penalidadesCriticas: number;
  totalScore: number;
}

export interface AreaScoringResult {
  areas: AreaScore[];
  priorityArea: AreaScore | null;
  isKickoffTemplate: boolean;
}

const AREA_LABELS: Record<AreaName, string> = {
  compras: "Compras",
  financas: "Finanças",
  estoque: "Estoque",
  operacoes: "Operações",
};

// Map question IDs to areas based on the Kickoff template structure
const AREA_DOR_QUESTIONS: Record<string, AreaName> = {
  "c1000001-0001-0001-0001-000000000003": "compras",
  "c1000001-0001-0001-0001-000000000004": "financas",
  "c1000001-0001-0001-0001-000000000005": "estoque",
  "c1000001-0001-0001-0001-000000000006": "operacoes",
};

const AREA_SINTOMAS_QUESTIONS: Record<string, AreaName> = {
  "c1000001-0001-0001-0001-000000000007": "compras",
  "c1000001-0001-0001-0001-000000000008": "financas",
  "c1000001-0001-0001-0001-000000000009": "estoque",
  "c1000001-0001-0001-0001-000000000010": "operacoes",
};

const AREA_PENALIDADES_QUESTIONS: Record<string, AreaName[]> = {
  "c1000001-0001-0001-0001-000000000011": ["compras", "estoque"], // Parada por falta de insumos
  "c1000001-0001-0001-0001-000000000012": ["financas"], // Nome sujo
  "c1000001-0001-0001-0001-000000000013": ["operacoes"], // Perda de cliente
  "c1000001-0001-0001-0001-000000000014": ["estoque"], // Perda de estoque
};

const KICKOFF_TEMPLATE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/**
 * Check if a template is the Kickoff/Onboarding template
 */
export const isKickoffTemplate = (template: DiagnosticTemplate): boolean => {
  if (template.id === KICKOFF_TEMPLATE_ID) return true;
  const name = template.name.toLowerCase();
  return name.includes("onboarding") || name.includes("kickoff");
};

/**
 * Get the declared pain score (1-10) for an area
 */
const getDorDeclarada = (
  questionId: string,
  answers: Record<string, AnswerValue | DiagnosticAnswer>
): number => {
  const value = resolveAnswerValue(answers[questionId]);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

/**
 * Calculate symptoms score based on selected options and their weights
 */
const getSintomasScore = (
  questionId: string,
  answers: Record<string, AnswerValue | DiagnosticAnswer>,
  template: DiagnosticTemplate
): { score: number; count: number } => {
  const value = resolveAnswerValue(answers[questionId]);
  if (!value || !Array.isArray(value) || value.length === 0) {
    return { score: 0, count: 0 };
  }

  // Find the question to get the weights
  let question: TemplateQuestion | undefined;
  for (const section of template.sections) {
    question = section.questions?.find((q) => q.id === questionId);
    if (question) break;
  }

  if (!question?.optionsWithWeight?.length) {
    // Default weight of 2 per symptom if no weights defined
    return { score: value.length * 2, count: value.length };
  }

  const selectedLabels = value as string[];
  let totalWeight = 0;
  let count = 0;

  for (const option of question.optionsWithWeight) {
    if (selectedLabels.includes(option.label)) {
      totalWeight += option.weight ?? 2;
      count++;
    }
  }

  return { score: totalWeight, count };
};

/**
 * Check if a critical penalty applies (yes/no question answered "yes")
 */
const getPenalidadeCritica = (
  questionId: string,
  answers: Record<string, AnswerValue | DiagnosticAnswer>
): boolean => {
  const value = resolveAnswerValue(answers[questionId]);
  return value === "yes" || value === true;
};

/**
 * Calculate scores for all areas based on Kickoff answers
 */
export const calculateAreaScores = (
  template: DiagnosticTemplate,
  answers: Record<string, AnswerValue | DiagnosticAnswer>
): AreaScoringResult => {
  if (!isKickoffTemplate(template)) {
    return {
      areas: [],
      priorityArea: null,
      isKickoffTemplate: false,
    };
  }

  const areaScores: Record<AreaName, AreaScore> = {
    compras: {
      area: "compras",
      areaLabel: AREA_LABELS.compras,
      dorDeclarada: 0,
      sintomasScore: 0,
      sintomasCount: 0,
      penalidadesCriticas: 0,
      totalScore: 0,
    },
    financas: {
      area: "financas",
      areaLabel: AREA_LABELS.financas,
      dorDeclarada: 0,
      sintomasScore: 0,
      sintomasCount: 0,
      penalidadesCriticas: 0,
      totalScore: 0,
    },
    estoque: {
      area: "estoque",
      areaLabel: AREA_LABELS.estoque,
      dorDeclarada: 0,
      sintomasScore: 0,
      sintomasCount: 0,
      penalidadesCriticas: 0,
      totalScore: 0,
    },
    operacoes: {
      area: "operacoes",
      areaLabel: AREA_LABELS.operacoes,
      dorDeclarada: 0,
      sintomasScore: 0,
      sintomasCount: 0,
      penalidadesCriticas: 0,
      totalScore: 0,
    },
  };

  // 1. Dor Declarada (scale 1-10, weight 3 = max 30 points per area)
  for (const [questionId, area] of Object.entries(AREA_DOR_QUESTIONS)) {
    const dor = getDorDeclarada(questionId, answers);
    areaScores[area].dorDeclarada = dor * 3; // Weight of 3
  }

  // 2. Sintomas (multiple choice with weights, typically 2-3 per symptom)
  for (const [questionId, area] of Object.entries(AREA_SINTOMAS_QUESTIONS)) {
    const { score, count } = getSintomasScore(questionId, answers, template);
    areaScores[area].sintomasScore = score;
    areaScores[area].sintomasCount = count;
  }

  // 3. Penalidades Críticas (yes/no, weight 5 = adds 5 points if yes)
  for (const [questionId, areas] of Object.entries(AREA_PENALIDADES_QUESTIONS)) {
    if (getPenalidadeCritica(questionId, answers)) {
      for (const area of areas) {
        areaScores[area].penalidadesCriticas += 5;
      }
    }
  }

  // Calculate total scores
  const areas = Object.values(areaScores).map((score) => ({
    ...score,
    totalScore: score.dorDeclarada + score.sintomasScore + score.penalidadesCriticas,
  }));

  // Sort by total score descending
  areas.sort((a, b) => b.totalScore - a.totalScore);

  // Priority area is the one with highest score (or null if all zero)
  const priorityArea = areas[0]?.totalScore > 0 ? areas[0] : null;

  return {
    areas,
    priorityArea,
    isKickoffTemplate: true,
  };
};

/**
 * Get a text summary of the scoring result
 */
export const getAreaScoringsSummary = (result: AreaScoringResult): string => {
  if (!result.isKickoffTemplate || !result.priorityArea) {
    return "";
  }

  const { priorityArea, areas } = result;
  const others = areas.filter((a) => a.area !== priorityArea.area && a.totalScore > 0);

  let summary = `**Área Prioritária: ${priorityArea.areaLabel}** (Score: ${priorityArea.totalScore})\n\n`;
  summary += `- Dor Declarada: ${Math.round(priorityArea.dorDeclarada / 3)}/10\n`;
  summary += `- Sintomas identificados: ${priorityArea.sintomasCount}\n`;
  if (priorityArea.penalidadesCriticas > 0) {
    summary += `- ⚠️ Penalidades críticas aplicadas\n`;
  }

  if (others.length > 0) {
    summary += `\n**Outras áreas:**\n`;
    for (const area of others.slice(0, 3)) {
      summary += `- ${area.areaLabel}: Score ${area.totalScore}\n`;
    }
  }

  return summary;
};
