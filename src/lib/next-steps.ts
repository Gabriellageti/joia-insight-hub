import { Diagnostic, DiagnosticTemplate } from "@/types";
import { SuggestedNextStep } from "@/components/plano-acao";
import { isKickoffTemplate, calculateAreaScores } from "@/lib/area-scoring";

// Mapeamento de área para template de diagnóstico específico
const AREA_TEMPLATE_MAP: Record<string, { templateId: string; templateName: string; priority: "alta" | "media" | "baixa"; estimatedTime: string; description: string }> = {
  compras: {
    templateId: "d1111111-1111-1111-1111-111111111111",
    templateName: "Diagnóstico de Compras",
    priority: "alta",
    estimatedTime: "45 min",
    description: "Diagnóstico detalhado da área de Compras para mapear oportunidades e gerar plano de ação.",
  },
  financas: {
    templateId: "d2222222-2222-2222-2222-222222222222",
    templateName: "Diagnóstico de Finanças",
    priority: "alta",
    estimatedTime: "40 min",
    description: "Avaliação da saúde financeira, fluxo de caixa e controles internos.",
  },
  estoque: {
    templateId: "d3333333-3333-3333-3333-333333333333",
    templateName: "Diagnóstico de Estoque",
    priority: "alta",
    estimatedTime: "35 min",
    description: "Análise de acurácia, movimentação e perdas de estoque.",
  },
  operacoes: {
    templateId: "d4444444-4444-4444-4444-444444444444",
    templateName: "Diagnóstico de Operações",
    priority: "alta",
    estimatedTime: "40 min",
    description: "Mapeamento de processos operacionais, produtividade e qualidade.",
  },
};

// Tarefas padrão que podem ser sugeridas após diagnósticos
const STANDARD_TASKS_SUGGESTIONS = [
  {
    id: "task-quick-wins",
    title: "Implementar Quick Wins identificados",
    description: "Executar as ações de baixo esforço e alto impacto identificadas no diagnóstico.",
    priority: "alta" as const,
    estimatedTime: "1-2 semanas",
  },
  {
    id: "task-stakeholder-align",
    title: "Alinhar stakeholders sobre prioridades",
    description: "Reunião para validar prioridades e responsáveis pelas ações do plano.",
    priority: "alta" as const,
    estimatedTime: "2 horas",
  },
  {
    id: "task-kpi-setup",
    title: "Configurar KPIs de acompanhamento",
    description: "Definir e implementar indicadores para monitorar o progresso das ações.",
    priority: "media" as const,
    estimatedTime: "1 semana",
  },
];

/**
 * Gera sugestões de próximos passos com base no diagnóstico concluído
 */
export function generateNextStepsSuggestions(
  diagnostic: Diagnostic,
  template: DiagnosticTemplate | null,
  existingDiagnostics: Diagnostic[]
): SuggestedNextStep[] {
  const suggestions: SuggestedNextStep[] = [];
  const isKickoff = template && isKickoffTemplate(template);

  // Se for um Kickoff, sugerir o diagnóstico da área prioritária
  if (isKickoff && template) {
    // Filtrar diagnósticos já existentes para este projeto
    const existingTemplateIds = new Set(
      existingDiagnostics
        .filter((d) => d.projectId === diagnostic.projectId)
        .map((d) => d.templateId)
    );

    // Usar a área prioritária calculada (se houver score)
    // Por agora, sugerir todas as áreas que ainda não têm diagnóstico
    for (const [area, suggestion] of Object.entries(AREA_TEMPLATE_MAP)) {
      if (!existingTemplateIds.has(suggestion.templateId)) {
        suggestions.push({
          id: `diag-${area}-${suggestion.templateId}`,
          title: `Aplicar ${suggestion.templateName}`,
          description: suggestion.description,
          type: "diagnostic",
          templateId: suggestion.templateId,
          templateName: suggestion.templateName,
          priority: suggestion.priority,
          estimatedTime: suggestion.estimatedTime,
        });
      }
    }
  }

  // Sempre sugerir tarefas padrão baseadas no score
  const score = diagnostic.score ?? 0;

  if (score < 60) {
    // Score baixo: sugerir quick wins e alinhamento
    suggestions.push({
      id: "task-quick-wins",
      title: "Implementar Quick Wins identificados",
      description: "Executar as ações de baixo esforço e alto impacto identificadas no diagnóstico.",
      type: "task",
      priority: "alta",
      estimatedTime: "1-2 semanas",
    });

    suggestions.push({
      id: "task-stakeholder-align",
      title: "Alinhar stakeholders sobre prioridades",
      description: "Reunião para validar prioridades e responsáveis pelas ações do plano.",
      type: "task",
      priority: "alta",
      estimatedTime: "2 horas",
    });
  }

  if (score >= 40) {
    // Score médio/alto: sugerir KPIs
    suggestions.push({
      id: "task-kpi-setup",
      title: "Configurar KPIs de acompanhamento",
      description: "Definir e implementar indicadores para monitorar o progresso das ações.",
      type: "task",
      priority: "media",
      estimatedTime: "1 semana",
    });
  }

  // Se o diagnóstico gerou oportunidades, sugerir tarefa de validação
  if ((diagnostic.opportunities ?? 0) > 0) {
    suggestions.push({
      id: "task-validate-opportunities",
      title: "Validar oportunidades identificadas",
      description: `Revisar e validar as ${diagnostic.opportunities} oportunidades identificadas com evidências.`,
      type: "task",
      priority: "alta",
      estimatedTime: "1 semana",
    });
  }

  return suggestions;
}

// Re-export isKickoffTemplate from area-scoring for backwards compatibility
export { isKickoffTemplate } from "@/lib/area-scoring";
