import { DiagnosticTemplate, TemplateQuestion } from "@/types";
import { DiagnosticAnswer } from "@/types/diagnostic-execution";

export type AnswerValue = string | number | boolean | string[] | null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Area-based scoring constants (for Kickoff template)
const KICKOFF_TEMPLATE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const isKickoffTemplate = (template: DiagnosticTemplate): boolean => {
  if (template.id === KICKOFF_TEMPLATE_ID) return true;
  const name = template.name.toLowerCase();
  return name.includes("onboarding") || name.includes("kickoff");
};

const isAnswered = (value: AnswerValue): boolean => {
  if (value === null || typeof value === "undefined") return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const resolveAnswerValue = (value?: AnswerValue | DiagnosticAnswer): AnswerValue => {
  if (!value) return null;
  if (typeof (value as DiagnosticAnswer).questionId === "string") {
    return (value as DiagnosticAnswer).value ?? null;
  }
  return value as AnswerValue;
};

export const normalizeAnswerForScore = (question: TemplateQuestion, value: AnswerValue): number | null => {
  if (!isAnswered(value) || question.includeInScore === false) return null;

  switch (question.type) {
    case "yes_no":
      return value === "yes" ? 1 : 0;
    case "scale": {
      const numericValue = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(numericValue)) return null;
      const min = question.minValue ?? 0;
      const max = question.maxValue ?? 10;
      if (max === min) return 0;
      return clamp((numericValue - min) / (max - min), 0, 1);
    }
    case "number": {
      const numericValue = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(numericValue)) return null;
      const min = question.minValue ?? 0;
      const fallbackMax = Math.max(min + 1, Math.abs(numericValue));
      const max = question.maxValue ?? fallbackMax;
      if (max === min) return 0;
      return clamp((numericValue - min) / (max - min), 0, 1);
    }
    case "multiple_choice": {
      const options = question.optionsWithWeight?.length
        ? question.optionsWithWeight
        : (question.options || []).map((option) => ({ label: option, weight: 1 }));
      if (!options.length) return null;
      const selected = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
      const totalWeight = options.reduce((sum, option) => sum + (option.weight ?? 1), 0) || options.length;
      const selectedWeight = options.reduce(
        (sum, option) => (selected.includes(option.label) ? sum + (option.weight ?? 1) : sum),
        0
      );
      return totalWeight > 0 ? clamp(selectedWeight / totalWeight, 0, 1) : 1;
    }
    case "text":
      return typeof value === "string" && value.trim().length > 0 ? 1 : null;
    case "attachment":
      return isAnswered(value) ? 1 : null;
    default:
      return null;
  }
};

/**
 * Calculate area scores for Kickoff template
 * Returns the highest area score as the diagnostic score
 */
const calculateKickoffScore = (
  template: DiagnosticTemplate,
  answers: Record<string, AnswerValue | DiagnosticAnswer>
): { score: number; answeredWeight: number; totalWeight: number; coverage: number; priorityArea?: string } => {
  // Import would create circular dependency, so we duplicate minimal logic here
  const AREA_DOR_QUESTIONS: Record<string, string> = {
    "c1000001-0001-0001-0001-000000000003": "Compras",
    "c1000001-0001-0001-0001-000000000004": "Finanças",
    "c1000001-0001-0001-0001-000000000005": "Estoque",
    "c1000001-0001-0001-0001-000000000006": "Operações",
  };

  const areaScores: Record<string, number> = {
    Compras: 0,
    Finanças: 0,
    Estoque: 0,
    Operações: 0,
  };

  let answeredCount = 0;
  let totalQuestions = 0;

  template.sections.forEach((section) => {
    section.questions?.forEach((question) => {
      totalQuestions++;
      const value = resolveAnswerValue(answers[question.id]);
      if (!isAnswered(value)) return;
      answeredCount++;

      // Dor declarada questions (scale 1-10)
      const area = AREA_DOR_QUESTIONS[question.id];
      if (area && (typeof value === "number" || typeof value === "string")) {
        const numValue = typeof value === "number" ? value : parseFloat(value);
        if (!isNaN(numValue)) {
          areaScores[area] += numValue * 3; // Weight of 3
        }
      }

      // Symptoms questions (multiple choice)
      if (section.title?.includes("Sintomas") && Array.isArray(value)) {
        const areaFromSection = section.title.replace("Sintomas - ", "");
        if (areaScores[areaFromSection] !== undefined) {
          // Sum weights of selected options
          const optionWeights = question.optionsWithWeight || [];
          let weightSum = 0;
          for (const opt of optionWeights) {
            if ((value as string[]).includes(opt.label)) {
              weightSum += opt.weight ?? 2;
            }
          }
          areaScores[areaFromSection] += weightSum;
        }
      }

      // Penalty questions (yes/no)
      if (section.title?.includes("Penalidades") && (value === "yes" || value === true)) {
        // Distribute penalty based on question description
        const desc = question.description?.toLowerCase() || "";
        if (desc.includes("compras") || desc.includes("insumos")) {
          areaScores["Compras"] += 5;
          areaScores["Estoque"] += 5;
        }
        if (desc.includes("finanças") || desc.includes("dívidas")) {
          areaScores["Finanças"] += 5;
        }
        if (desc.includes("operações") || desc.includes("qualidade") || desc.includes("cliente")) {
          areaScores["Operações"] += 5;
        }
        if (desc.includes("estoque") || desc.includes("perda")) {
          areaScores["Estoque"] += 5;
        }
      }
    });
  });

  // Find the area with highest score
  let maxScore = 0;
  let priorityArea = "";
  for (const [area, score] of Object.entries(areaScores)) {
    if (score > maxScore) {
      maxScore = score;
      priorityArea = area;
    }
  }

  // Normalize score to 0-100 scale
  // Max possible: Dor (10*3=30) + Sintomas (~20) + Penalty (10) = ~60 per area
  const maxPossible = 60;
  const normalizedScore = Math.min(100, Math.round((maxScore / maxPossible) * 100));
  const coverage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return {
    score: normalizedScore,
    answeredWeight: answeredCount,
    totalWeight: totalQuestions,
    coverage,
    priorityArea: priorityArea || undefined,
  };
};

export const calculateDiagnosticScore = (
  template: DiagnosticTemplate,
  answers: Record<string, AnswerValue | DiagnosticAnswer>
) => {
  // Use area-based scoring for Kickoff template
  if (isKickoffTemplate(template)) {
    return calculateKickoffScore(template, answers);
  }

  // Standard scoring for other templates
  let weightedSum = 0;
  let answeredWeight = 0;
  let totalWeight = 0;

  template.sections.forEach((section) => {
    section.questions?.forEach((question) => {
      const weight = question.weight || 1;
      if (question.includeInScore === false) return;
      totalWeight += weight;
      const normalized = normalizeAnswerForScore(question, resolveAnswerValue(answers[question.id]));
      if (normalized !== null) {
        weightedSum += normalized * weight;
        answeredWeight += weight;
      }
    });
  });

  const score = answeredWeight > 0 ? Math.round((weightedSum / answeredWeight) * 100) : 0;
  const coverage = totalWeight ? Math.round((answeredWeight / totalWeight) * 100) : 0;

  return {
    score,
    answeredWeight,
    totalWeight,
    coverage,
  };
};
