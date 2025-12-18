import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Diagnostic, DiagnosticTemplate } from "@/types";
import { formatDatePtBR, parseDatePtBR } from "@/lib/dates";

type Status = Diagnostic["status"];

type BaseDiagnosticInput = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  templateId: string;
  templateName: string;
  responsibleName?: string;
  responsibleId?: string;
  dueDate?: string;
  autoGenerateOpportunities?: boolean;
  name?: string;
};

export interface ApplyDiagnosticInput extends BaseDiagnosticInput {
  templateQuestionCount?: number;
}

export interface UpdateDiagnosticInput extends Partial<Diagnostic> {
  id: string;
}

const currentMonthLabel = () => format(new Date(), "MM/yyyy", { locale: ptBR });

const defaultName = (templateName: string, projectName: string, referenceDate: Date = new Date()) => {
  return `${templateName} • ${projectName} • ${format(referenceDate, "MM/yyyy", { locale: ptBR })}`;
};

const templateSeed: DiagnosticTemplate[] = [
  {
    id: "template-1",
    name: "Operações SaaS",
    description: "Checklist base de governança e eficiência para operações SaaS.",
    tags: ["SaaS", "Operações", "Governança"],
    status: "published",
    sections: [
      {
        id: "ops-saas-1",
        title: "Governança",
        description: "Estrutura mínima de decisão e acompanhamento.",
        order: 1,
        weight: 1,
        audit: { updatedAt: "05/02/2025" },
        questions: [
          {
            id: "ops-saas-1-q1",
            title: "Existe um comitê recorrente de operações?",
            description: "Com agenda, ata e responsáveis definidos.",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Comitês semanais ou quinzenais costumam ser o mínimo viável.",
            regraOportunidade: {
              id: "ops-saas-op-1",
              name: "Criar oportunidade de governança",
              description: "Sem fórum de decisão recorrente.",
              type: "Eficiência operacional",
              estimatedValue: 50000,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/02/2025" },
            },
            audit: { updatedAt: "05/02/2025" },
          },
          {
            id: "ops-saas-1-q2",
            title: "Roadmap priorizado está visível para o time?",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 2,
            audit: { updatedAt: "05/02/2025" },
          },
        ],
      },
      {
        id: "ops-saas-2",
        title: "Eficiência",
        description: "Rotinas e SLAs críticos.",
        order: 2,
        weight: 1,
        audit: { updatedAt: "05/02/2025" },
        questions: [
          {
            id: "ops-saas-2-q1",
            title: "Existe SLA formal de suporte?",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 1,
            audit: { updatedAt: "05/02/2025" },
          },
          {
            id: "ops-saas-2-q2",
            title: "Tempo médio de implantação (em dias)",
            type: "number",
            weight: 1,
            criticality: "baixa",
            required: false,
            order: 2,
            minValue: 0,
            audit: { updatedAt: "05/02/2025" },
          },
        ],
      },
    ],
    questionCount: 4,
    sectionsCount: 2,
    estimatedTimeMinutes: 30,
    version: "v1.4",
    updatedAt: "05/02/2025",
    createdAt: "10/01/2025",
  },
  {
    id: "template-2",
    name: "Diagnóstico de Compras",
    description: "Cobertura mínima de governança e savings.",
    tags: ["Compras", "Supply", "Processos"],
    status: "published",
    sections: [
      {
        id: "compras-1",
        title: "Governança",
        order: 1,
        weight: 1,
        audit: { updatedAt: "12/01/2025" },
        questions: [
          {
            id: "compras-1-q1",
            title: "Política de compras aprovada?",
            type: "yes_no",
            weight: 1,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "12/01/2025" },
          },
          {
            id: "compras-1-q2",
            title: "Percentual de spend coberto por contratos",
            type: "number",
            weight: 1,
            criticality: "media",
            required: false,
            order: 2,
            minValue: 0,
            maxValue: 100,
            regraOportunidade: {
              id: "compras-op-1",
              name: "Reforçar contratos prioritários",
              description: "Cobertura baixa de contratos estratégicos.",
              type: "Redução de custos",
              estimatedValue: 200000,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: false,
              condition: { type: "number", operator: "<", value: 80, unit: "percentual" },
              audit: { updatedAt: "12/01/2025" },
            },
            audit: { updatedAt: "12/01/2025" },
          },
        ],
      },
      {
        id: "compras-2",
        title: "Eficiência",
        order: 2,
        weight: 1,
        audit: { updatedAt: "12/01/2025" },
        questions: [
          {
            id: "compras-2-q1",
            title: "Lead time médio de compras (dias)",
            type: "number",
            weight: 1,
            criticality: "media",
            required: false,
            order: 1,
            minValue: 0,
            audit: { updatedAt: "12/01/2025" },
          },
        ],
      },
    ],
    questionCount: 3,
    sectionsCount: 2,
    estimatedTimeMinutes: 25,
    version: "v1.2",
    updatedAt: "12/01/2025",
    createdAt: "03/01/2025",
  },
  {
    id: "template-3",
    name: "Diagnóstico de Estoque",
    description: "Processos críticos de armazenagem e giro.",
    tags: ["Estoque", "Logística"],
    status: "published",
    sections: [
      {
        id: "estoque-1",
        title: "Operação",
        order: 1,
        weight: 1,
        audit: { updatedAt: "18/12/2024" },
        questions: [
          {
            id: "estoque-1-q1",
            title: "Inventário rotativo ativo?",
            type: "yes_no",
            weight: 1,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "18/12/2024" },
          },
          {
            id: "estoque-1-q2",
            title: "Acuracidade do estoque (%)",
            type: "number",
            weight: 1,
            criticality: "media",
            required: false,
            order: 2,
            minValue: 0,
            maxValue: 100,
            audit: { updatedAt: "18/12/2024" },
          },
        ],
      },
    ],
    questionCount: 2,
    sectionsCount: 1,
    estimatedTimeMinutes: 15,
    version: "v1.0",
    updatedAt: "18/12/2024",
    createdAt: "05/12/2024",
  },
  {
    id: "template-4",
    name: "Diagnóstico Financeiro",
    description: "Riscos, controles e performance financeira.",
    tags: ["Financeiro", "Riscos", "Controles"],
    status: "published",
    sections: [
      {
        id: "financeiro-1",
        title: "Controles",
        order: 1,
        weight: 1,
        audit: { updatedAt: "28/01/2025" },
        questions: [
          {
            id: "financeiro-1-q1",
            title: "Fechamento mensal ocorre em até 5 dias úteis?",
            type: "yes_no",
            weight: 1,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "28/01/2025" },
          },
          {
            id: "financeiro-1-q2",
            title: "% de conciliação bancária automatizada",
            type: "number",
            weight: 1,
            criticality: "media",
            required: false,
            order: 2,
            minValue: 0,
            maxValue: 100,
            audit: { updatedAt: "28/01/2025" },
          },
        ],
      },
      {
        id: "financeiro-2",
        title: "Riscos",
        order: 2,
        weight: 1,
        audit: { updatedAt: "28/01/2025" },
        questions: [
          {
            id: "financeiro-2-q1",
            title: "Existe matriz de riscos atualizada?",
            type: "yes_no",
            weight: 1,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "28/01/2025" },
          },
        ],
      },
    ],
    questionCount: 3,
    sectionsCount: 2,
    estimatedTimeMinutes: 30,
    version: "v1.1",
    updatedAt: "28/01/2025",
    createdAt: "14/01/2025",
  },
];

const diagnosticsSeed: Diagnostic[] = [
  {
    id: "diagnostic-1",
    name: defaultName("Operações SaaS", "Implantação BI Operacional", parseDatePtBR("22/01/2025") || new Date()),
    projectId: "project-1",
    projectName: "Implantação BI Operacional",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    templateId: "template-1",
    templateName: "Operações SaaS",
    status: "in_progress",
    progress: 55,
    score: undefined,
    opportunities: 7,
    createdAt: "22/01/2025",
    updatedAt: "12/02/2025",
    totalQuestions: 82,
    answeredQuestions: 45,
    autoGenerateOpportunities: true,
    responsibleName: "Marina Rocha",
    responsibleId: "employee-1",
    hasResponses: true,
    dueDate: "28/02/2025",
  },
  {
    id: "diagnostic-2",
    name: defaultName("Diagnóstico de Compras", "Expansão Marketplace", parseDatePtBR("10/02/2025") || new Date()),
    projectId: "project-2",
    projectName: "Expansão Marketplace",
    clientId: "client-2",
    clientName: "BetaLog Transportes",
    templateId: "template-2",
    templateName: "Diagnóstico de Compras",
    status: "draft",
    progress: 0,
    opportunities: 0,
    createdAt: "10/02/2025",
    updatedAt: "10/02/2025",
    totalQuestions: 42,
    answeredQuestions: 0,
    autoGenerateOpportunities: true,
    responsibleName: "Diego Carvalho",
    responsibleId: "employee-2",
    hasResponses: false,
    dueDate: "05/03/2025",
  },
  {
    id: "diagnostic-3",
    name: defaultName("Diagnóstico Financeiro", "PMO Transformação Financeira", parseDatePtBR("03/12/2024") || new Date()),
    projectId: "project-3",
    projectName: "PMO Transformação Financeira",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    templateId: "template-4",
    templateName: "Diagnóstico Financeiro",
    status: "completed",
    progress: 100,
    score: 82,
    opportunities: 12,
    createdAt: "03/12/2024",
    updatedAt: "20/12/2024",
    totalQuestions: 56,
    answeredQuestions: 56,
    autoGenerateOpportunities: false,
    responsibleName: "Marina Rocha",
    responsibleId: "employee-1",
    hasResponses: true,
    dueDate: "15/01/2025",
  },
];

export const getDiagnosticsSeed = () => diagnosticsSeed;
export const getTemplatesSeed = () => templateSeed;

export const calculateDaysSinceUpdate = (dateString?: string): number => {
  const parsed = parseDatePtBR(dateString);
  if (!parsed) return 0;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return differenceInCalendarDays(todayMidnight, parsed);
};

export const isDiagnosticStalled = (diagnostic: Diagnostic): boolean => {
  return diagnostic.status === "in_progress" && calculateDaysSinceUpdate(diagnostic.updatedAt) > 10;
};

export const calculatePendingQuestions = (diagnostic: Diagnostic): number => {
  return Math.max(0, (diagnostic.totalQuestions || 0) - (diagnostic.answeredQuestions || 0));
};

export const fetchDiagnostics = async (): Promise<Diagnostic[]> => {
  return diagnosticsSeed;
};

export const fetchTemplates = async (): Promise<DiagnosticTemplate[]> => {
  return templateSeed;
};

export const applyDiagnostic = async (input: ApplyDiagnosticInput): Promise<Diagnostic> => {
  const { templateName, projectName, templateQuestionCount } = input;
  const id = `diagnostic-${Math.random().toString(36).slice(2, 8)}`;
  const today = formatDatePtBR(new Date());
  const totalQuestions = templateQuestionCount ?? 40;

  return {
    id,
    name: input.name || defaultName(templateName, projectName),
    status: "in_progress",
    progress: 0,
    score: undefined,
    opportunities: 0,
    createdAt: today,
    updatedAt: today,
    answeredQuestions: 0,
    totalQuestions,
    hasResponses: false,
    autoGenerateOpportunities: input.autoGenerateOpportunities ?? true,
    responsibleName: input.responsibleName || "Equipe JoIA",
    responsibleId: input.responsibleId,
    dueDate: input.dueDate,
    ...input,
  };
};

export const updateDiagnostic = async (current: Diagnostic, payload: Partial<Diagnostic>): Promise<Diagnostic> => {
  return {
    ...current,
    ...payload,
    updatedAt: payload.updatedAt || formatDatePtBR(new Date()),
  };
};

export const createTemplateMock = (name?: string): DiagnosticTemplate => {
  const id = `template-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: name || "Template importado JoIA",
    description: "Template criado a partir de importação rápida.",
    tags: ["Exemplo", "Boas práticas"],
    status: "draft",
    sections: [
      {
        id: `${id}-section-1`,
        title: "Seção importada",
        description: "Perguntas importadas para revisão.",
        order: 1,
        weight: 1,
        audit: { updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }) },
        questions: [
          {
            id: `${id}-question-1`,
            title: "Pergunta de exemplo",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 1,
            audit: { updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }) },
          },
        ],
      },
    ],
    questionCount: 1,
    sectionsCount: 1,
    estimatedTimeMinutes: 15,
    version: "v1.0",
    updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
    createdAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
  };
};

export const resolveStatusLabel = (status: Status) => {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "in_progress":
      return "Em andamento";
    case "completed":
      return "Concluído";
    default:
      return status;
  }
};

export const formatRelativeUpdate = (diagnostic: Diagnostic): string => {
  const days = calculateDaysSinceUpdate(diagnostic.updatedAt);
  if (days <= 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado há 1 dia";
  return `Atualizado há ${days} dias`;
};

export const getDefaultDiagnosticName = (templateName: string, projectName: string) =>
  defaultName(templateName, projectName, new Date());
