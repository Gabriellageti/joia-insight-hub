import { Diagnostic, DiagnosticTemplate } from "@/types";
import { SuggestedNextStep } from "@/components/plano-acao";

// Templates de diagnóstico padrão que podem ser sugeridos após o Kickoff
const DIAGNOSTIC_TEMPLATES_SUGGESTIONS = [
  {
    templateId: "template-2",
    templateName: "Diagnóstico de Compras JoIA",
    priority: "alta" as const,
    estimatedTime: "45 min",
    description: "Avalia maturidade do setor de Compras para identificar desperdícios e oportunidades.",
  },
  {
    templateId: "template-1",
    templateName: "Operações SaaS",
    priority: "media" as const,
    estimatedTime: "30 min",
    description: "Checklist base de governança e eficiência para operações SaaS.",
  },
  {
    templateId: "template-3",
    templateName: "Diagnóstico Financeiro",
    priority: "alta" as const,
    estimatedTime: "40 min",
    description: "Avaliação da saúde financeira, fluxo de caixa e controles internos.",
  },
  {
    templateId: "template-4",
    templateName: "Diagnóstico de Processos",
    priority: "media" as const,
    estimatedTime: "35 min",
    description: "Mapeamento e análise de processos operacionais para identificar gargalos.",
  },
];

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
  const isKickoff = template?.name?.toLowerCase().includes("kickoff");

  // Se for um Kickoff, sugerir outros diagnósticos
  if (isKickoff) {
    // Filtrar diagnósticos já existentes para este projeto
    const existingTemplateIds = new Set(
      existingDiagnostics
        .filter((d) => d.projectId === diagnostic.projectId)
        .map((d) => d.templateId)
    );

    // Adicionar sugestões de diagnósticos que ainda não foram aplicados
    DIAGNOSTIC_TEMPLATES_SUGGESTIONS.forEach((suggestion, index) => {
      if (!existingTemplateIds.has(suggestion.templateId)) {
        suggestions.push({
          id: `diag-${suggestion.templateId}-${index}`,
          title: `Aplicar ${suggestion.templateName}`,
          description: suggestion.description,
          type: "diagnostic",
          templateId: suggestion.templateId,
          templateName: suggestion.templateName,
          priority: suggestion.priority,
          estimatedTime: suggestion.estimatedTime,
        });
      }
    });
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

/**
 * Verifica se o template é um Kickoff
 */
export function isKickoffTemplate(template: DiagnosticTemplate | null): boolean {
  if (!template) return false;
  const name = template.name?.toLowerCase() ?? "";
  return name.includes("kickoff") || name.includes("norte do projeto");
}
