/**
 * Kickoff-specific recommendation engine
 * Generates recommendations based on area scoring from the Kickoff diagnostic
 */

import { addDays } from "date-fns";
import { ActionRecommendation, ActionPriority, ActionImpact, Diagnostic, DiagnosticTemplate } from "@/types";
import { AnswerValue, resolveAnswerValue } from "@/lib/diagnostic-evaluation";
import { DiagnosticAnswer } from "@/types/diagnostic-execution";
import { calculateAreaScores, AreaScore, AreaName, isKickoffTemplate } from "@/lib/area-scoring";
import { formatDatePtBR } from "@/lib/dates";

// Template IDs for area-specific diagnostics
const AREA_TEMPLATE_MAP: Record<AreaName, { templateId: string; templateName: string }> = {
  compras: { templateId: "d1111111-1111-1111-1111-111111111111", templateName: "Diagnóstico de Compras" },
  financas: { templateId: "d2222222-2222-2222-2222-222222222222", templateName: "Diagnóstico de Finanças" },
  estoque: { templateId: "d3333333-3333-3333-3333-333333333333", templateName: "Diagnóstico de Estoque" },
  operacoes: { templateId: "d4444444-4444-4444-4444-444444444444", templateName: "Diagnóstico de Operações" },
};

const buildImpactProjection = (area: AreaScore) => {
  const benefitText = `Ação direta sobre ${area.areaLabel} com ${area.sintomasCount} sintoma(s) identificado(s).`;
  const riskText = area.penalidadesCriticas > 0
    ? `Área apresentou penalidades críticas - urgência elevada.`
    : `Mitigação de riscos associados a ${area.areaLabel}.`;

  return {
    positiveImpact: {
      expectedBenefit: benefitText,
      avoidedRisk: riskText,
      estimatedCostOrTime: "Início recomendado: primeira semana do projeto.",
    },
    negativeImpact: {
      expectedBenefit: `Benefícios em ${area.areaLabel} não serão capturados.`,
      avoidedRisk: `Riscos permanecem expostos e podem escalar.`,
      estimatedCostOrTime: `Custo de oportunidade: impacto direto no resultado do projeto.`,
    },
  };
};

const getPriorityFromScore = (score: number): ActionPriority => {
  if (score >= 25) return "alta";
  if (score >= 15) return "media";
  return "baixa";
};

const getImpactFromScore = (score: number): ActionImpact => {
  if (score >= 25) return "alto";
  if (score >= 15) return "medio";
  return "baixo";
};

/**
 * Generate the primary recommendation: apply area-specific diagnostic
 */
const buildPrimaryRecommendation = (
  area: AreaScore,
  responsible: string
): ActionRecommendation => {
  const templateInfo = AREA_TEMPLATE_MAP[area.area];
  const priority = getPriorityFromScore(area.totalScore);
  const impact = buildImpactProjection(area);

  return {
    id: `kickoff-apply-${area.area}`,
    title: `Aplicar ${templateInfo.templateName}`,
    description: `A área de ${area.areaLabel} foi identificada como a dor principal do cliente (score ${area.totalScore}). ` +
      `Execute o diagnóstico detalhado para mapear oportunidades específicas e gerar plano de ação.`,
    priority,
    impact: getImpactFromScore(area.totalScore),
    ...impact,
    responsible,
    dueDate: formatDatePtBR(addDays(new Date(), priority === "alta" ? 7 : 14)),
    rationale: `Score de área: ${area.totalScore} (Dor: ${Math.round(area.dorDeclarada / 3)}/10, Sintomas: ${area.sintomasCount}, Penalidades: ${area.penalidadesCriticas > 0 ? "Sim" : "Não"})`,
    what: `Executar ${templateInfo.templateName} na empresa`,
    why: `Área identificada como prioridade no Kickoff`,
    where: `${area.areaLabel}`,
    when: formatDatePtBR(addDays(new Date(), priority === "alta" ? 7 : 14)),
    who: responsible,
    how: `1. Agendar reunião com responsáveis da área\n2. Aplicar diagnóstico detalhado\n3. Gerar plano de ação com base nos achados`,
    howMuch: undefined,
  };
};

/**
 * Generate secondary recommendations for other areas with significant scores
 */
const buildSecondaryRecommendations = (
  areas: AreaScore[],
  primaryArea: AreaName,
  responsible: string
): ActionRecommendation[] => {
  return areas
    .filter((a) => a.area !== primaryArea && a.totalScore >= 10)
    .slice(0, 2) // Max 2 secondary areas
    .map((area, index) => {
      const templateInfo = AREA_TEMPLATE_MAP[area.area];
      const impact = buildImpactProjection(area);

      return {
        id: `kickoff-secondary-${area.area}`,
        title: `Avaliar ${area.areaLabel} como próxima prioridade`,
        description: `A área de ${area.areaLabel} também apresentou pontuação significativa (score ${area.totalScore}). ` +
          `Considere incluir no roadmap após concluir a área prioritária.`,
        priority: "media" as ActionPriority,
        impact: "medio" as ActionImpact,
        ...impact,
        responsible,
        dueDate: formatDatePtBR(addDays(new Date(), 30 + index * 15)),
        rationale: `Score secundário: ${area.totalScore}`,
        what: `Planejar diagnóstico de ${area.areaLabel}`,
        why: `Segunda maior dor identificada`,
        where: area.areaLabel,
        when: formatDatePtBR(addDays(new Date(), 30 + index * 15)),
        who: responsible,
        how: `Agendar para fase seguinte do projeto`,
      };
    });
};

/**
 * Generate critical penalty recommendations
 */
const buildPenaltyRecommendations = (
  areas: AreaScore[],
  responsible: string
): ActionRecommendation[] => {
  const areasWithPenalties = areas.filter((a) => a.penalidadesCriticas > 0);
  
  if (areasWithPenalties.length === 0) return [];

  return areasWithPenalties.map((area) => ({
    id: `kickoff-penalty-${area.area}`,
    title: `⚠️ Tratar situação crítica em ${area.areaLabel}`,
    description: `Cliente indicou ocorrência de situação crítica relacionada a ${area.areaLabel}. ` +
      `Investigue urgentemente para evitar recorrência.`,
    priority: "alta" as ActionPriority,
    impact: "alto" as ActionImpact,
    positiveImpact: {
      expectedBenefit: `Prevenção de novas ocorrências críticas em ${area.areaLabel}.`,
      avoidedRisk: `Evita perdas financeiras e danos à reputação.`,
      estimatedCostOrTime: `Investigação inicial: 3-5 dias.`,
    },
    negativeImpact: {
      expectedBenefit: `Risco de recorrência de problemas graves.`,
      avoidedRisk: `Situação pode escalar e gerar maiores prejuízos.`,
      estimatedCostOrTime: `Custo potencial: significativo.`,
    },
    responsible,
    dueDate: formatDatePtBR(addDays(new Date(), 3)),
    rationale: `Penalidade crítica identificada na área`,
    what: `Investigar e prevenir situações críticas`,
    why: `Histórico de problema grave reportado`,
    where: area.areaLabel,
    when: formatDatePtBR(addDays(new Date(), 3)),
    who: responsible,
    how: `1. Reunião de emergência para entender o ocorrido\n2. Mapear causas raiz\n3. Definir ações corretivas imediatas`,
  }));
};

/**
 * Generate all recommendations from Kickoff diagnostic answers
 */
export const generateKickoffRecommendations = (
  template: DiagnosticTemplate,
  answers: Record<string, AnswerValue | DiagnosticAnswer>,
  responsibleName?: string
): ActionRecommendation[] => {
  if (!isKickoffTemplate(template)) {
    return [];
  }

  const responsible = responsibleName || "Equipe JoIA";
  const scoring = calculateAreaScores(template, answers);

  if (!scoring.priorityArea) {
    // No clear priority - suggest general assessment
    return [{
      id: "kickoff-no-priority",
      title: "Completar levantamento de dores",
      description: "O diagnóstico inicial não identificou uma área prioritária clara. " +
        "Recomenda-se aprofundar o entendimento das dores do cliente.",
      priority: "media",
      impact: "medio",
      positiveImpact: {
        expectedBenefit: "Clareza sobre onde atuar primeiro.",
        avoidedRisk: "Evita investir esforço em área de baixo impacto.",
        estimatedCostOrTime: "1-2 reuniões adicionais.",
      },
      negativeImpact: {
        expectedBenefit: "Foco do projeto fica indefinido.",
        avoidedRisk: "Risco de dispersão de esforços.",
        estimatedCostOrTime: "Potencial retrabalho.",
      },
      responsible,
      dueDate: formatDatePtBR(addDays(new Date(), 7)),
      rationale: "Nenhuma área com score significativo",
    }];
  }

  const recommendations: ActionRecommendation[] = [];

  // 1. Primary recommendation: apply area-specific diagnostic
  recommendations.push(buildPrimaryRecommendation(scoring.priorityArea, responsible));

  // 2. Secondary recommendations for other significant areas
  recommendations.push(
    ...buildSecondaryRecommendations(scoring.areas, scoring.priorityArea.area, responsible)
  );

  // 3. Critical penalty recommendations
  recommendations.push(...buildPenaltyRecommendations(scoring.areas, responsible));

  return recommendations;
};
