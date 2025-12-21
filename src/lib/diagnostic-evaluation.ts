import { DiagnosticTemplate, TemplateQuestion } from "@/types";
import { DiagnosticAnswer } from "@/types/diagnostic-execution";

export type AnswerValue = string | number | boolean | string[] | null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

export const calculateDiagnosticScore = (
  template: DiagnosticTemplate,
  answers: Record<string, AnswerValue | DiagnosticAnswer>
) => {
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
