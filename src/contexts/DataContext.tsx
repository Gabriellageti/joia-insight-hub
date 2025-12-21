import React, { createContext, useContext, useEffect, ReactNode, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import {
  Client,
  ClientAddress,
  Project,
  Task,
  Meeting,
  Indicator,
  Document,
  Playbook,
  Employee,
  Lead,
  Contract,
  Expense,
  ContentItem,
  Diagnostic,
  DiagnosticTemplate,
  ClientContact,
  ProjectDeliverable,
  ProjectAuditLogEntry,
  Opportunity,
  AuditMetadata,
  TemplateQuestion,
  TemplateSection,
  TemplateOpportunityRule,
  QuestionCriticality,
  OpportunityRuleCondition,
} from "@/types";
import { useAuth } from "./AuthContext";
import {
  buildProgressAuditMessage,
  calculateWeightedProgress,
  DEFAULT_PHASES,
  resolveProgressValue,
} from "@/lib/projects/progress";
import { buildStatusAuditMessage, resolveProjectStatus } from "@/lib/projects/status";
import { calculateForecastEndDate, formatDatePtBR, parseDatePtBR, ProjectDuration, safeNumber } from "@/lib/dates";
import { addDays } from "date-fns";
import {
  ApplyDiagnosticInput,
  applyDiagnostic as applyDiagnosticMock,
  fetchDiagnostics,
  fetchTemplates,
  getDefaultDiagnosticName,
  getDiagnosticsSeed,
  getTemplatesSeed,
} from "@/lib/diagnostics";

interface DataContextType {
  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Projects
  projects: Project[];
  addProject: (
    project: Omit<Project, "id" | "createdAt" | "progress" | "status" | "statusReason" | "statusSource">,
    options?: {
      opportunities?: Omit<Opportunity, "id" | "createdAt" | "updatedAt" | "source">[];
      seedStructure?: boolean;
    }
  ) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Deliverables
  deliverables: ProjectDeliverable[];
  addDeliverable: (deliverable: Omit<ProjectDeliverable, "id" | "createdAt">) => void;
  updateDeliverable: (id: string, deliverable: Partial<ProjectDeliverable>) => void;
  deleteDeliverable: (id: string) => void;

  // Meetings
  meetings: Meeting[];
  addMeeting: (meeting: Omit<Meeting, "id" | "createdAt">) => void;
  updateMeeting: (id: string, meeting: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;

  // Indicators
  indicators: Indicator[];
  addIndicator: (indicator: Omit<Indicator, "id" | "createdAt">) => void;
  updateIndicator: (id: string, indicator: Partial<Indicator>) => void;
  deleteIndicator: (id: string) => void;

  // Documents
  documents: Document[];
  addDocument: (document: Omit<Document, "id" | "createdAt" | "updatedAt">) => void;
  updateDocument: (id: string, document: Partial<Document>) => void;
  deleteDocument: (id: string) => void;

  // Playbooks
  playbooks: Playbook[];
  addPlaybook: (playbook: Omit<Playbook, "id" | "createdAt">) => void;
  updatePlaybook: (id: string, playbook: Partial<Playbook>) => void;
  deletePlaybook: (id: string) => void;

  // Employees
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, "id" | "createdAt">) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  // Leads
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => void;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => void;

  // Diagnostics
  diagnostics: Diagnostic[];
  addDiagnostic: (diagnostic: Omit<Diagnostic, "id" | "createdAt">) => void;
  updateDiagnostic: (id: string, diagnostic: Partial<Diagnostic>) => void;
  deleteDiagnostic: (id: string) => void;
  templates: DiagnosticTemplate[];
  addTemplate: (template: Omit<DiagnosticTemplate, "id"> & { id?: string }) => DiagnosticTemplate;
  updateTemplate: (id: string, template: Partial<DiagnosticTemplate>) => void;
  deleteTemplate: (id: string) => void;
  refreshDiagnostics: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  applyDiagnostic: (diagnostic: ApplyDiagnosticInput) => Promise<Diagnostic>;
  duplicateDiagnostic: (
    diagnostic: Diagnostic,
    target: { projectId: string; projectName: string; clientId: string; clientName: string }
  ) => Promise<Diagnostic>;

  // Content
  contentItems: ContentItem[];
  addContentItem: (item: Omit<ContentItem, "id" | "createdAt">) => void;
  updateContentItem: (id: string, item: Partial<ContentItem>) => void;
  deleteContentItem: (id: string) => void;

  // Contracts
  contracts: Contract[];
  addContract: (contract: Omit<Contract, "id" | "createdAt">) => void;
  updateContract: (id: string, contract: Partial<Contract>) => void;
  deleteContract: (id: string) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Project audit log
  projectAuditLogs: ProjectAuditLogEntry[];
  addProjectAuditLog: (entry: Omit<ProjectAuditLogEntry, "id" | "createdAt">) => ProjectAuditLogEntry;

  // Opportunities
  opportunities: Opportunity[];
  addOpportunity: (opportunity: Omit<Opportunity, "id" | "createdAt" | "updatedAt" | "source">) => Opportunity;
  updateOpportunity: (id: string, opportunity: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;

  // Client contacts
  clientContacts: ClientContact[];
  addClientContact: (contact: Omit<ClientContact, "id">) => ClientContact;
  updateClientContact: (id: string, contact: Partial<ClientContact>) => void;
  deleteClientContact: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);
const getDate = () => new Date().toLocaleDateString("pt-BR");

const resolveUserName = (user?: User | null) => {
  const metadata = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  return metadata.full_name || metadata.name || metadata.name_full || user?.email || "Usuário";
};

type LegacyClient = Partial<Omit<Client, "address">> & {
  name?: string;
  tradeName?: string;
  segment?: string;
  city?: string;
  address?: string | ClientAddress;
  preferredMeetingDay?: string;
  followUpFrequency?: "semanal" | "quinzenal" | "mensal";
};

const normalizeClient = (client: LegacyClient): Client => {
  const segmentoTags = (
    client.segmentoTags && client.segmentoTags.length > 0
      ? client.segmentoTags
      : client.segment
        ? [client.segment]
        : []
  )
    .map((tag) => tag.trim())
    .filter(Boolean);

  const addressString = typeof client.address === "string" ? client.address : client.address?.logradouro || "";
  const endereco = {
    cep: client.endereco?.cep || "",
    logradouro: client.endereco?.logradouro || addressString || "",
    numero: client.endereco?.numero || "",
    complemento: client.endereco?.complemento || "",
    bairro: client.endereco?.bairro || "",
    cidade: client.endereco?.cidade || client.city || "",
    uf: client.endereco?.uf || "",
  };

  return {
    id: client.id || generateId(),
    name: client.name || client.razaoSocial || client.nomeFantasia || client.tradeName || "Cliente",
    tradeName: client.tradeName || client.nomeFantasia || "",
    segment: client.segment || segmentoTags[0] || "",
    city: client.city || endereco.cidade || "",
    address: addressString || endereco.logradouro || "",
    preferredMeetingDay: client.preferredMeetingDay || client.preferenciasRelacionamento?.diaReuniao || "",
    followUpFrequency: client.followUpFrequency || client.preferenciasRelacionamento?.frequencia || "semanal",
    razaoSocial: client.razaoSocial || client.nomeFantasia || client.name || "Cliente sem razão social",
    nomeFantasia: client.nomeFantasia || client.tradeName || "",
    cnpj: client.cnpj || "",
    segmentoTags,
    status: client.status || "ativo",
    contatoPrincipal: {
      nome: client.contatoPrincipal?.nome || "",
      whatsapp: client.contatoPrincipal?.whatsapp || "",
      email: client.contatoPrincipal?.email || "",
    },
    endereco,
    observacoesInternas: client.observacoesInternas || "",
    preferenciasRelacionamento: {
      diaReuniao: client.preferenciasRelacionamento?.diaReuniao || client.preferredMeetingDay || "",
      frequencia: client.preferenciasRelacionamento?.frequencia || client.followUpFrequency || "semanal",
    },
    projects: client.projects ?? 0,
    nps: client.nps ?? 0,
    risk: client.risk || "low",
    lastContact: client.lastContact || getDate(),
    createdAt: client.createdAt || getDate(),
  };
};

type LegacyProject = Partial<Project>;

const normalizeProject = (project: LegacyProject): Project => {
  const manualProgress =
    typeof project.manualProgress === "number" ? project.manualProgress : project.progressOverrideEnabled ? 0 : null;
  const progressOverrideEnabled = project.progressOverrideEnabled ?? false;
  const progress = typeof project.progress === "number" ? project.progress : 0;
  const statusOverrideEnabled = project.statusOverrideEnabled ?? false;
  const statusOverrideValue =
    typeof project.statusOverrideValue !== "undefined"
      ? project.statusOverrideValue
      : statusOverrideEnabled
        ? project.status || "green"
        : null;
  const statusReason =
    project.statusReason || (statusOverrideEnabled ? "Status forçado manualmente" : "Sem alertas críticos");
  const statusSource = project.statusSource || (statusOverrideEnabled ? "manual" : "calculated");
  const responsibleUserId = typeof project.responsibleUserId === "string" ? project.responsibleUserId : null;
  const responsibleNameLegacy = project.responsibleNameLegacy ?? project.responsible ?? "";
  const estimatedDuration = project.estimatedDuration ?? (project.forecastAdjustedManually ? "manual" : null);
  const forecastEndDate =
    project.forecastEndDate ||
    calculateForecastEndDate(project.startDate, estimatedDuration as ProjectDuration | null) ||
    project.endDate ||
    "";

  return {
    id: project.id || generateId(),
    name: project.name || "Projeto",
    clientId: project.clientId || "",
    clientName: project.clientName || "",
    objective: project.objective || "",
    scope: project.scope || "",
    phase: project.phase || "Diagnóstico",
    progress,
    progressSource: project.progressSource || (progressOverrideEnabled ? "manual" : "calculated"),
    progressOverrideEnabled,
    manualProgress,
    progressJustification: project.progressJustification?.trim() || "",
    status: project.status || "green",
    statusReason,
    statusSource,
    statusOverrideEnabled,
    statusOverrideValue: statusOverrideValue ?? null,
    statusOverrideJustification: project.statusOverrideJustification?.trim() || "",
    statusOverrideExpiresAt: project.statusOverrideExpiresAt || undefined,
    statusOverrideAuthor: project.statusOverrideAuthor || "",
    responsibleUserId,
    responsibleNameLegacy,
    responsibleAvatarUrl: project.responsibleAvatarUrl || "",
    responsible: project.responsible || responsibleNameLegacy,
    startDate: project.startDate || "",
    endDate: project.endDate || forecastEndDate || "",
    forecastEndDate,
    estimatedDuration: estimatedDuration ?? null,
    forecastAdjustedManually: project.forecastAdjustedManually ?? estimatedDuration === "manual",
    legacyOpportunityMigrated: project.legacyOpportunityMigrated || false,
    moneyHypothesis: project.moneyHypothesis || "",
    createdAt: project.createdAt || getDate(),
  };
};

const normalizeAudit = (audit?: AuditMetadata): AuditMetadata | undefined => {
  if (!audit) {
    return { createdAt: getDate(), updatedAt: getDate() };
  }

  const createdAt = audit.createdAt || getDate();
  const updatedAt = audit.updatedAt || createdAt;

  return {
    createdAt,
    updatedAt,
    createdBy: audit.createdBy,
    updatedBy: audit.updatedBy || audit.createdBy,
  };
};

const normalizeOpportunityCondition = (
  condition?: OpportunityRuleCondition
): OpportunityRuleCondition | undefined => {
  if (!condition) return undefined;

  if (condition.type === "yes_no") {
    return { type: "yes_no", expectedAnswer: condition.expectedAnswer === "yes" ? "yes" : "no" };
  }

  if (condition.type === "scale") {
    return {
      type: "scale",
      minValue: typeof condition.minValue === "number" ? condition.minValue : null,
      maxValue: typeof condition.maxValue === "number" ? condition.maxValue : null,
    };
  }

  if (condition.type === "number") {
    const parsedValue = safeNumber(condition.value);
    return {
      type: "number",
      operator: condition.operator || ">",
      value: typeof parsedValue === "number" ? parsedValue : null,
      unit: condition.unit || "numero",
    };
  }

  if (condition.type === "multiple_choice") {
    return {
      type: "multiple_choice",
      matchingOptions: condition.matchingOptions || [],
      matchStrategy: condition.matchStrategy || "any",
    };
  }

  if (condition.type === "text") {
    return { type: "text", keyword: condition.keyword?.trim() || undefined };
  }

  return { type: "always" };
};

const normalizeOpportunityRule = (rule?: Partial<TemplateOpportunityRule>): TemplateOpportunityRule | undefined => {
  if (!rule) return undefined;

  const estimatedValue = safeNumber(rule.estimatedValue);

  return {
    id: rule.id || generateId(),
    name: rule.name || "Regra de oportunidade",
    description: rule.description || "",
    type: rule.type || "Outro",
    estimatedValue: typeof estimatedValue === "number" ? estimatedValue : null,
    confidence: rule.confidence || "media",
    evidenceType: rule.evidenceType || "a_coletar",
    enabled: rule.enabled ?? true,
    autoGenerate: rule.autoGenerate ?? true,
    condition: normalizeOpportunityCondition(rule.condition),
    audit: normalizeAudit(rule.audit),
  };
};

const normalizeTemplateQuestion = (question: Partial<TemplateQuestion>, index: number): TemplateQuestion => {
  const weight =
    typeof question.weight === "number"
      ? question.weight
      : typeof question.critical === "boolean"
        ? question.critical
          ? 2
          : 1
        : 1;
  const legacyCriticality = (question as Partial<{ criticidade: QuestionCriticality }>).criticidade;
  const criticality: QuestionCriticality = question.criticality || (question.critical ? "alta" : legacyCriticality || "media");

  return {
    id: question.id || generateId(),
    title: question.title || question.text || "Pergunta",
    description: question.description || "",
    type: question.type || "yes_no",
    weight,
    includeInScore: question.includeInScore ?? true,
    criticality,
    required: question.required ?? true,
    helperText: question.helperText || "",
    placeholder: question.placeholder || "",
    order: typeof question.order === "number" ? question.order : index + 1,
    minValue: typeof question.minValue === "number" ? question.minValue : null,
    maxValue: typeof question.maxValue === "number" ? question.maxValue : null,
    options: question.options || [],
    regraOportunidade: normalizeOpportunityRule(question.regraOportunidade),
    audit: normalizeAudit(question.audit),
    text: question.text,
    critical: question.critical,
  };
};

const normalizeTemplateSection = (section: Partial<TemplateSection>, index: number): TemplateSection => {
  const questions = (section.questions || []).map((question, questionIndex) =>
    normalizeTemplateQuestion(question, questionIndex)
  );

  return {
    id: section.id || generateId(),
    title: section.title || (section as Partial<{ name: string }>).name || "Seção",
    description: section.description || "",
    order: typeof section.order === "number" ? section.order : index + 1,
    weight: typeof section.weight === "number" ? section.weight : 1,
    questions,
    audit: normalizeAudit(section.audit),
  };
};

const normalizeTemplate = (template: Partial<DiagnosticTemplate>): DiagnosticTemplate => {
  const sections = (template.sections || []).map((section, sectionIndex) => normalizeTemplateSection(section, sectionIndex));
  const questionCountFromSections = sections.reduce((count, section) => count + (section.questions?.length || 0), 0);
  const status = template.status || "published";
  const lastPublishedAt =
    template.lastPublishedAt ||
    (status === "published" ? template.updatedAt || template.createdAt || getDate() : template.lastPublishedAt);

  return {
    id: template.id || generateId(),
    name: template.name || "Template",
    description: template.description || "",
    tags: template.tags || [],
    status,
    version: template.version || "v1.0",
    revision: typeof template.revision === "number" ? template.revision : 1,
    sections,
    questionCount: typeof template.questionCount === "number" ? template.questionCount : questionCountFromSections,
    sectionsCount: template.sectionsCount ?? sections.length,
    estimatedTimeMinutes: typeof template.estimatedTimeMinutes === "number" ? template.estimatedTimeMinutes : null,
    lastPublishedAt,
    updatedAt: template.updatedAt || template.createdAt || getDate(),
    createdAt: template.createdAt || getDate(),
    audit: normalizeAudit(template.audit),
  };
};

const normalizeDiagnostic = (diagnostic: Partial<Diagnostic>): Diagnostic => {
  const totalQuestions = diagnostic.totalQuestions ?? 40;
  const progressValue = typeof diagnostic.progress === "number" ? diagnostic.progress : 0;
  const answeredQuestions =
    typeof diagnostic.answeredQuestions === "number"
      ? diagnostic.answeredQuestions
      : Math.round((progressValue / 100) * totalQuestions);
  const templateName = diagnostic.templateName || "Template";
  const projectName = diagnostic.projectName || "Projeto";
  const createdAt = diagnostic.createdAt || getDate();

  return {
    id: diagnostic.id || generateId(),
    name: diagnostic.name || getDefaultDiagnosticName(templateName, projectName),
    projectId: diagnostic.projectId || "",
    projectName,
    clientId: diagnostic.clientId || "",
    clientName: diagnostic.clientName || "",
    templateId: diagnostic.templateId || "",
    templateName,
    status: diagnostic.status || "draft",
    progress: progressValue,
    score: diagnostic.score,
    opportunities: diagnostic.opportunities ?? 0,
    createdAt,
    updatedAt: diagnostic.updatedAt || createdAt,
    totalQuestions,
    answeredQuestions,
    autoGenerateOpportunities: diagnostic.autoGenerateOpportunities ?? true,
    responsibleName: diagnostic.responsibleName || "Equipe JoIA",
    responsibleId: diagnostic.responsibleId,
    hasResponses: diagnostic.hasResponses ?? answeredQuestions > 0,
    dueDate: diagnostic.dueDate,
    actionPlan: diagnostic.actionPlan,
  };
};

type LegacyOpportunity = Partial<Opportunity>;

const normalizeOpportunity = (opportunity: LegacyOpportunity): Opportunity => {
  const estimatedValue = safeNumber(opportunity.estimatedValue);
  return {
    id: opportunity.id || generateId(),
    projectId: opportunity.projectId || "",
    clientId: opportunity.clientId || "",
    status: opportunity.status || "Identificado",
    type: opportunity.type || "Outro",
    description: opportunity.description || "",
    estimatedValue,
    confidence: opportunity.confidence || "media",
    evidenceType: opportunity.evidenceType || "a_coletar",
    evidenceReference: opportunity.evidenceReference || "",
    responsibleUserId: typeof opportunity.responsibleUserId === "string" ? opportunity.responsibleUserId : null,
    createdAt: opportunity.createdAt || getDate(),
    updatedAt: opportunity.updatedAt,
    source: opportunity.source || "manual",
  };
};

const phaseSeeds: Record<string, { title: string; type: Task["type"]; offset: number; priority?: Task["priority"]; evidenceRequired?: boolean; impact?: string }[]> = {
  Diagnóstico: [
    { title: "Rodar kickoff com cliente", type: "processo", offset: 2, priority: "high" },
    { title: "Aplicar template de diagnóstico", type: "processo", offset: 5, evidenceRequired: true },
    { title: "Coletar evidências-chave", type: "processo", offset: 10, evidenceRequired: true },
    { title: "Levantar KPIs baseline", type: "processo", offset: 12, priority: "medium" },
    { title: "Registrar hipóteses prioritárias", type: "processo", offset: 14 },
  ],
  "Quick wins": [
    { title: "Selecionar 3 ações rápidas", type: "processo", offset: 3, priority: "high" },
    { title: "Executar ação 1", type: "processo", offset: 10 },
    { title: "Executar ação 2", type: "processo", offset: 17 },
    { title: "Executar ação 3", type: "processo", offset: 24 },
    { title: "Validar impacto das ações", type: "financeiro", offset: 28, evidenceRequired: true },
    { title: "Registrar evidências das entregas", type: "processo", offset: 30, evidenceRequired: true },
  ],
  Estruturação: [
    { title: "Documentar POP prioritário", type: "processo", offset: 7 },
    { title: "Treinar equipe do cliente", type: "treinamento", offset: 14, evidenceRequired: true },
    { title: "Implementar rotina operacional", type: "processo", offset: 28 },
    { title: "Criar dashboard de acompanhamento", type: "tecnologia", offset: 35, evidenceRequired: true },
  ],
  Acompanhamento: [
    { title: "Revisão quinzenal com cliente", type: "processo", offset: 14 },
    { title: "Checagem dos KPIs críticos", type: "processo", offset: 28 },
    { title: "Relatório executivo", type: "processo", offset: 42, evidenceRequired: true },
    { title: "Ajustes e novas oportunidades", type: "processo", offset: 56 },
  ],
};

const buildSeedTasks = ({
  phase,
  startDate,
  responsible,
  projectId,
  projectName,
  clientId,
  clientName,
}: {
  phase: string;
  startDate?: string;
  responsible: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
}): Task[] => {
  const templates = phaseSeeds[phase] || [];
  const baseDate = parseDatePtBR(startDate) || new Date();

  return templates.map((template, index) => {
    const dueDate = formatDatePtBR(addDays(baseDate, template.offset));
    return {
      id: generateId(),
      title: template.title,
      description: "Tarefa gerada automaticamente pela fase inteligente",
      projectId,
      projectName,
      clientId,
      clientName,
      type: template.type,
      responsible,
      priority: template.priority || "medium",
      dueDate,
      impact: template.impact,
      status: index === 0 ? "next" : "backlog",
      checklist: [],
      evidenceRequired: template.evidenceRequired ?? true,
      createdAt: getDate(),
    } as Task;
  });
};

const initialClients: Client[] = [
  normalizeClient({
    id: "client-1",
    razaoSocial: "Alfa Tecnologia LTDA",
    nomeFantasia: "Alfa Tech",
    cnpj: "12.345.678/0001-90",
    segment: "Tecnologia",
    segmentoTags: ["Tecnologia"],
    status: "ativo",
    contatoPrincipal: { nome: "Fernanda Alves", whatsapp: "(11) 98888-1212", email: "fernanda@alfatech.com" },
    endereco: { cidade: "São Paulo", uf: "SP", logradouro: "Av. Paulista", numero: "1000", cep: "01310-100" },
    observacoesInternas: "Cliente estratégico com foco em expansão SaaS.",
    preferenciasRelacionamento: { diaReuniao: "Quarta-feira", frequencia: "quinzenal" },
    projects: 2,
    nps: 72,
    risk: "low",
    lastContact: "10/02/2025",
    createdAt: "15/01/2025",
  }),
  normalizeClient({
    id: "client-2",
    razaoSocial: "Beta Logística S/A",
    nomeFantasia: "BetaLog",
    cnpj: "98.765.432/0001-10",
    segment: "Logística",
    segmentoTags: ["Logística", "Transporte"],
    status: "ativo",
    contatoPrincipal: { nome: "Carlos Menezes", whatsapp: "(21) 97777-4545", email: "carlos.menezes@betalog.com" },
    endereco: { cidade: "Rio de Janeiro", uf: "RJ", logradouro: "Rua das Flores", numero: "250", cep: "20000-000" },
    observacoesInternas: "Implantação de torre de controle em andamento.",
    preferenciasRelacionamento: { diaReuniao: "Terça-feira", frequencia: "mensal" },
    projects: 1,
    nps: 64,
    risk: "medium",
    lastContact: "05/02/2025",
    createdAt: "10/12/2024",
  }),
];

const initialProjects: Project[] = [
  {
    id: "project-1",
    name: "Implantação BI Operacional",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    objective: "Dashboard unificado de operações e faturamento",
    scope: "Integração de CRM, ERP e suporte em um único painel",
    phase: "Diagnóstico",
    progress: 35,
    progressSource: "calculated",
    progressOverrideEnabled: false,
    manualProgress: null,
    status: "green",
    responsibleUserId: "employee-1",
    responsibleNameLegacy: "João Mendes",
    responsible: "João Mendes",
    forecastEndDate: "30/03/2025",
    estimatedDuration: "manual",
    forecastAdjustedManually: true,
    startDate: "10/01/2025",
    endDate: "30/03/2025",
    createdAt: "05/01/2025",
    moneyHypothesis: "Redução de churn em 8%",
    legacyOpportunityMigrated: true,
  },
  {
    id: "project-2",
    name: "Estruturação de CS",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    objective: "Criar playbooks e cadência de CS",
    scope: "Processos, treinamentos e métricas",
    phase: "Quick wins",
    progress: 60,
    progressSource: "calculated",
    progressOverrideEnabled: false,
    manualProgress: null,
    status: "yellow",
    responsibleUserId: "employee-2",
    responsibleNameLegacy: "Bruna Lira",
    responsible: "Bruna Lira",
    forecastEndDate: "20/04/2025",
    estimatedDuration: "6m",
    forecastAdjustedManually: false,
    startDate: "20/12/2024",
    endDate: "20/04/2025",
    createdAt: "15/12/2024",
  },
  {
    id: "project-3",
    name: "Torre de Controle Logística",
    clientId: "client-2",
    clientName: "Beta Logística S/A",
    objective: "Melhorar visibilidade do lead time",
    scope: "KPIs, reuniões semanais e plano de ação",
    phase: "Estruturação",
    progress: 45,
    progressSource: "calculated",
    progressOverrideEnabled: false,
    manualProgress: null,
    status: "green",
    responsibleUserId: null,
    responsibleNameLegacy: "Marcos Vieira",
    responsible: "Marcos Vieira",
    forecastEndDate: "15/04/2025",
    estimatedDuration: "6m",
    forecastAdjustedManually: false,
    startDate: "05/01/2025",
    endDate: "15/04/2025",
    createdAt: "18/12/2024",
  },
];

const initialOpportunities: Opportunity[] = [
  {
    id: "opp-1",
    projectId: "project-1",
    clientId: "client-1",
    status: "Identificado",
    type: "Receita incremental",
    description: "Redução de churn em 8% via BI operacional",
    estimatedValue: 180000,
    confidence: "media",
    evidenceType: "a_coletar",
    responsibleUserId: "employee-1",
    createdAt: "05/01/2025",
    source: "manual",
  },
  {
    id: "opp-2",
    projectId: "project-2",
    clientId: "client-1",
    status: "Em validação",
    type: "Receita incremental",
    description: "Upsell de CS com playbooks e cadência",
    estimatedValue: 120000,
    confidence: "alta",
    evidenceType: "a_coletar",
    responsibleUserId: "employee-2",
    createdAt: "15/12/2024",
    source: "manual",
  },
  {
    id: "opp-3",
    projectId: "project-3",
    clientId: "client-2",
    status: "Em execução",
    type: "Eficiência operacional",
    description: "Otimização de frete com torre de controle",
    estimatedValue: 95000,
    confidence: "media",
    evidenceType: "upload",
    evidenceReference: "planilha_custos.xlsx",
    responsibleUserId: null,
    createdAt: "18/12/2024",
    source: "manual",
  },
];

const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Mapear integrações do BI",
    description: "Listar fontes, owners e SLA de atualização",
    projectId: "project-1",
    projectName: "Implantação BI Operacional",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    type: "tecnologia",
    responsible: "João Mendes",
    priority: "high",
    dueDate: "28/02/2025",
    status: "next",
    evidenceRequired: true,
    impact: "Reduz esforço manual de reports",
    createdAt: "12/02/2025",
  },
  {
    id: "task-2",
    title: "Rodar treinamento de CS",
    description: "Treinamento sobre jornada e indicadores críticos",
    projectId: "project-2",
    projectName: "Estruturação de CS",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    type: "treinamento",
    responsible: "Bruna Lira",
    priority: "medium",
    dueDate: "05/03/2025",
    status: "in_progress",
    evidenceRequired: false,
    createdAt: "01/02/2025",
  },
  {
    id: "task-3",
    title: "Definir KPIs de logística",
    projectId: "project-3",
    projectName: "Torre de Controle Logística",
    clientId: "client-2",
    clientName: "Beta Logística S/A",
    type: "processo",
    responsible: "Marcos Vieira",
    priority: "medium",
    dueDate: "18/02/2025",
    status: "validation",
    evidenceRequired: true,
    createdAt: "25/01/2025",
  },
];

const initialDeliverables: ProjectDeliverable[] = [
  {
    id: "deliverable-1",
    projectId: "project-1",
    title: "Protótipo de dashboard",
    status: "in_progress",
    dueDate: "15/03/2025",
    createdAt: "01/02/2025",
  },
  {
    id: "deliverable-2",
    projectId: "project-2",
    title: "Playbook CS v1",
    status: "pending",
    dueDate: "28/02/2025",
    createdAt: "18/01/2025",
  },
  {
    id: "deliverable-3",
    projectId: "project-3",
    title: "Kit de KPIs logísticos",
    status: "done",
    dueDate: "10/02/2025",
    createdAt: "05/01/2025",
  },
];

const initialMeetings: Meeting[] = [
  {
    id: "meeting-1",
    title: "Checkpoint BI",
    projectId: "project-1",
    projectName: "Implantação BI Operacional",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    date: "14/02/2025",
    time: "10:00",
    type: "online",
    link: "https://meet.joia/bi",
    status: "scheduled",
    agenda: "Revisar integrações e priorizar fontes",
    participants: ["Fernanda Alves", "João Mendes"],
    hasMinutes: false,
    createdAt: "10/02/2025",
  },
  {
    id: "meeting-2",
    title: "Reunião de Steering",
    projectId: "project-3",
    projectName: "Torre de Controle Logística",
    clientId: "client-2",
    clientName: "Beta Logística S/A",
    date: "17/02/2025",
    time: "15:00",
    type: "presencial",
    location: "Sede BetaLog - Sala 3",
    status: "scheduled",
    agenda: "Aprovar KPIs e roadmap de implantação",
    participants: ["Carlos Menezes", "Marcos Vieira"],
    hasMinutes: false,
    createdAt: "08/02/2025",
  },
];

const initialIndicators: Indicator[] = [
  {
    id: "indicator-1",
    name: "MRR",
    category: "Vendas",
    unit: "R$",
    frequency: "mensal",
    source: "planilha",
    target: 500000,
    projectId: "project-2",
    projectName: "Estruturação de CS",
    responsible: "Bruna Lira",
    values: [
      { date: "01/01/2025", value: 420000 },
      { date: "01/02/2025", value: 438000 },
    ],
    createdAt: "15/12/2024",
  },
  {
    id: "indicator-2",
    name: "Lead time médio",
    category: "Processo",
    unit: "quantidade",
    frequency: "semanal",
    source: "integração",
    target: 3,
    projectId: "project-3",
    projectName: "Torre de Controle Logística",
    responsible: "Marcos Vieira",
    values: [
      { date: "01/02/2025", value: 5 },
      { date: "08/02/2025", value: 4 },
    ],
    createdAt: "20/01/2025",
  },
];

const initialPlaybooks: Playbook[] = [
  {
    id: "playbook-1",
    title: "Diagnóstico JoIA",
    area: "Diagnóstico",
    description: "Roteiro para conduzir diagnóstico inicial com o cliente",
    whenToUse: "Primeiras 2 semanas do projeto",
    howToValidate: "Checklist preenchido e hipóteses priorizadas",
    steps: ["Preparar entrevistas", "Rodar entrevistas", "Consolidar achados", "Apresentar devolutiva"],
    checklist: ["Stakeholders confirmados", "Dados coletados", "Riscos mapeados"],
    commonErrors: ["Não registrar evidências", "Faltar contexto de negócio"],
    tags: ["diagnóstico", "descoberta"],
    createdAt: "01/12/2024",
  },
];

const initialEmployees: Employee[] = [
  {
    id: "employee-1",
    name: "João Mendes",
    email: "joao@joia.com",
    role: "Gestor de Projetos",
    accessRole: "Gestor",
    seniority: "Senior",
    startDate: "01/03/2023",
    projects: 3,
    onboardingProgress: 100,
    status: "active",
    permissions: ["projects", "clients", "finance"],
    createdAt: "01/03/2023",
  },
  {
    id: "employee-2",
    name: "Bruna Lira",
    email: "bruna@joia.com",
    role: "Analista",
    accessRole: "Analista",
    seniority: "Pleno",
    startDate: "10/06/2024",
    projects: 2,
    onboardingProgress: 90,
    status: "active",
    permissions: ["clients", "projects"],
    createdAt: "10/06/2024",
  },
  {
    id: "employee-3",
    name: "Sara Martins",
    email: "sara@joia.com",
    role: "Gestora de Projetos",
    accessRole: "Admin",
    seniority: "Senior",
    startDate: "15/02/2022",
    projects: 4,
    onboardingProgress: 100,
    status: "active",
    permissions: ["clients", "projects", "finance"],
    createdAt: "15/02/2022",
  },
];

const initialLeads: Lead[] = [
  {
    id: "lead-1",
    company: "Gamma Retail",
    contact: "Laura Pires",
    email: "laura@gammaretail.com",
    source: "Inbound",
    status: "meeting",
    value: 85000,
    nextAction: "Enviar proposta revisada",
    nextActionDate: "15/02/2025",
    notes: "Busca projeto de eficiência comercial",
    createdAt: "25/01/2025",
  },
  {
    id: "lead-2",
    company: "Delta Foods",
    contact: "Rafael Costa",
    phone: "(31) 98888-9900",
    source: "Indicação",
    status: "proposal",
    value: 120000,
    nextAction: "Agendar call com financeiro",
    nextActionDate: "18/02/2025",
    notes: "Interessados em torre de controle de estoque",
    createdAt: "12/01/2025",
  },
];

const initialDiagnostics: Diagnostic[] = getDiagnosticsSeed();
const initialTemplates: DiagnosticTemplate[] = getTemplatesSeed();

const initialContentItems: ContentItem[] = [
  {
    id: "content-1",
    title: "Case: Torre de controle logística",
    type: "Case",
    status: "draft",
    publishDate: "10/03/2025",
    tags: ["logística", "operações"],
    createdAt: "02/02/2025",
  },
  {
    id: "content-2",
    title: "Checklist de onboarding de clientes",
    type: "Artigo",
    status: "review",
    publishDate: "20/02/2025",
    tags: ["cs", "playbook"],
    createdAt: "20/01/2025",
  },
];

const initialProjectAuditLogs: ProjectAuditLogEntry[] = [];

const initialClientContacts: ClientContact[] = [
  { id: "contact-1", clientId: "client-1", name: "Fernanda Alves", role: "COO", area: "Diretoria", phone: "(11) 98888-1212", email: "fernanda@alfatech.com", hasPortalAccess: true },
  { id: "contact-2", clientId: "client-2", name: "Carlos Menezes", role: "Head Operações", area: "Diretoria", phone: "(21) 97777-4545", email: "carlos.menezes@betalog.com", hasPortalAccess: false },
];

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const currentUserName = resolveUserName(user);
  const [clients, setClients] = useLocalStorage<Client[]>("joia_clients", initialClients);
  const [projects, setProjects] = useLocalStorage<Project[]>("joia_projects", initialProjects);
  const [tasks, setTasks] = useLocalStorage<Task[]>("joia_tasks", initialTasks);
  const [opportunities, setOpportunities] = useLocalStorage<Opportunity[]>(
    "joia_opportunities",
    initialOpportunities
  );
  const [deliverables, setDeliverables] = useLocalStorage<ProjectDeliverable[]>(
    "joia_deliverables",
    initialDeliverables
  );
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>("joia_meetings", initialMeetings);
  const [indicators, setIndicators] = useLocalStorage<Indicator[]>("joia_indicators", initialIndicators);
  const [documents, setDocuments] = useLocalStorage<Document[]>("joia_documents", []);
  const [playbooks, setPlaybooks] = useLocalStorage<Playbook[]>("joia_playbooks", initialPlaybooks);
  const [employees, setEmployees] = useLocalStorage<Employee[]>("joia_employees", initialEmployees);
  const [leads, setLeads] = useLocalStorage<Lead[]>("joia_leads", initialLeads);
  const [templates, setTemplates] = useLocalStorage<DiagnosticTemplate[]>("joia_diagnostic_templates", initialTemplates);
  const [diagnostics, setDiagnostics] = useLocalStorage<Diagnostic[]>("joia_diagnostics", initialDiagnostics);
  const [contentItems, setContentItems] = useLocalStorage<ContentItem[]>("joia_content", initialContentItems);
  const [contracts, setContracts] = useLocalStorage<Contract[]>("joia_contracts", []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("joia_expenses", []);
  const [projectAuditLogs, setProjectAuditLogs] = useLocalStorage<ProjectAuditLogEntry[]>(
    "joia_project_audit_logs",
    initialProjectAuditLogs
  );
  const [clientContacts, setClientContacts] = useLocalStorage<ClientContact[]>(
    "joia_client_contacts",
    initialClientContacts
  );

  // Normaliza clientes legados salvos no localStorage (uma vez por carregamento do provider)
  useEffect(() => {
    setClients((prev) => prev.map(normalizeClient));
  }, [setClients]);

  // Normaliza projetos legados para novos campos de progresso
  useEffect(() => {
    setProjects((prev) => prev.map(normalizeProject));
  }, [setProjects]);

  // Normaliza oportunidades legadas
  useEffect(() => {
    setOpportunities((prev) => prev.map(normalizeOpportunity));
  }, [setOpportunities]);

  useEffect(() => {
    setDiagnostics((prev) => prev.map(normalizeDiagnostic));
  }, [setDiagnostics]);

  useEffect(() => {
    setTemplates((prev) => prev.map(normalizeTemplate));
  }, [setTemplates]);

  // Sincroniza templates do seed: atualiza templates existentes com dados mais completos do seed
  useEffect(() => {
    if (templates.length === 0 && initialTemplates.length > 0) {
      setTemplates(initialTemplates);
      return;
    }
    
    // Verifica se algum template do seed tem mais conteúdo que o armazenado
    const updatedTemplates = templates.map((localTemplate) => {
      const seedTemplate = initialTemplates.find((t) => t.id === localTemplate.id);
      if (!seedTemplate) return localTemplate;
      
      // Se o seed tem mais seções ou perguntas, usa o seed
      const localQuestions = localTemplate.questionCount ?? localTemplate.sections?.reduce((c, s) => c + (s.questions?.length || 0), 0) ?? 0;
      const seedQuestions = seedTemplate.questionCount ?? seedTemplate.sections?.reduce((c, s) => c + (s.questions?.length || 0), 0) ?? 0;
      
      if (seedQuestions > localQuestions) {
        return { ...seedTemplate, updatedAt: seedTemplate.updatedAt };
      }
      return localTemplate;
    });
    
    // Adiciona templates do seed que não existem localmente
    const localIds = new Set(templates.map((t) => t.id));
    const newTemplates = initialTemplates.filter((t) => !localIds.has(t.id));
    
    const finalTemplates = [...updatedTemplates, ...newTemplates];
    
    // Só atualiza se houver diferença
    if (JSON.stringify(finalTemplates) !== JSON.stringify(templates)) {
      setTemplates(finalTemplates);
    }
  }, []);

  // Migra hipóteses antigas para oportunidades estruturadas
  useEffect(() => {
    const projectsWithLegacyHypothesis = projects.filter(
      (project) => project.moneyHypothesis && !project.legacyOpportunityMigrated
    );

    if (!projectsWithLegacyHypothesis.length) return;

    const migrated = projectsWithLegacyHypothesis.map((project) =>
      normalizeOpportunity({
        projectId: project.id,
        clientId: project.clientId,
        status: "Identificado",
        type: "Outro",
        description: project.moneyHypothesis,
        estimatedValue: null,
        confidence: "media",
        evidenceType: "a_coletar",
        responsibleUserId: project.responsibleUserId ?? null,
        source: "legacy",
      })
    );

    if (migrated.length > 0) {
      setOpportunities((prev) => [...prev, ...migrated]);
      setProjects((prev) =>
        prev.map((project) =>
          projectsWithLegacyHypothesis.some((legacy) => legacy.id === project.id)
            ? { ...project, legacyOpportunityMigrated: true }
            : project
        )
      );
    }
  }, [projects, setOpportunities, setProjects]);

  const refreshDiagnostics = useCallback(async () => {
    const data = await fetchDiagnostics();
    setDiagnostics(data.map(normalizeDiagnostic));
  }, [setDiagnostics]);

  const refreshTemplates = useCallback(async () => {
    const data = await fetchTemplates();
    setTemplates(data.map(normalizeTemplate));
  }, [setTemplates]);

  const handleApplyDiagnostic = useCallback(
    async (diagnostic: ApplyDiagnosticInput) => {
      const template = templates.find((item) => item.id === diagnostic.templateId);
      const created = await applyDiagnosticMock({
        ...diagnostic,
        templateQuestionCount: diagnostic.templateQuestionCount ?? template?.questionCount,
        templateName: diagnostic.templateName || template?.name || diagnostic.templateId,
      });
      const normalized = normalizeDiagnostic(created);
      setDiagnostics((prev) => [...prev, normalized]);
      return normalized;
    },
    [setDiagnostics, templates]
  );

  const handleDuplicateDiagnostic = useCallback(
    async (
      diagnostic: Diagnostic,
      target: { projectId: string; projectName: string; clientId: string; clientName: string }
    ) => {
      const duplicated = await applyDiagnosticMock({
        projectId: target.projectId,
        projectName: target.projectName,
        clientId: target.clientId,
        clientName: target.clientName,
        templateId: diagnostic.templateId,
        templateName: diagnostic.templateName,
        responsibleId: diagnostic.responsibleId,
        responsibleName: diagnostic.responsibleName,
        dueDate: diagnostic.dueDate,
        autoGenerateOpportunities: diagnostic.autoGenerateOpportunities,
        name: getDefaultDiagnosticName(diagnostic.templateName, target.projectName),
        templateQuestionCount: diagnostic.totalQuestions,
      });

      const normalized = normalizeDiagnostic({
        ...duplicated,
        status: "draft",
        progress: 0,
        answeredQuestions: 0,
        hasResponses: false,
      });

      setDiagnostics((prev) => [...prev, normalized]);
      return normalized;
    },
    [setDiagnostics]
  );

  const projectTasks = useCallback(
    (projectId: string) => tasks.filter((task) => task.projectId === projectId),
    [tasks]
  );
  const projectDeliverables = useCallback(
    (projectId: string) => deliverables.filter((deliverable) => deliverable.projectId === projectId),
    [deliverables]
  );
  const projectMeetings = useCallback(
    (projectId: string) => meetings.filter((meeting) => meeting.projectId === projectId),
    [meetings]
  );
  const projectIndicators = useCallback(
    (projectId: string) => indicators.filter((indicator) => indicator.projectId === projectId),
    [indicators]
  );
  const projectDocuments = useCallback(
    (projectId: string) => documents.filter((document) => document.projectId === projectId),
    [documents]
  );
  const projectContracts = useCallback(
    (projectId: string, clientId: string) =>
      contracts.filter((contract) => contract.projectId === projectId || (!contract.projectId && contract.clientId === clientId)),
    [contracts]
  );

  const computeProgressValue = useCallback(
    (project: Project) => {
      const calculatedProgress = calculateWeightedProgress({
        tasks: projectTasks(project.id),
        deliverables: projectDeliverables(project.id),
        currentPhase: project.phase,
        phaseSequence: DEFAULT_PHASES,
      });
      const resolvedProgress = resolveProgressValue({
        computedProgress: calculatedProgress,
        overrideEnabled: project.progressOverrideEnabled,
        manualProgress: project.manualProgress,
      });

      return {
        progress: resolvedProgress,
        progressSource: project.progressOverrideEnabled ? ("manual" as const) : ("calculated" as const),
      };
    },
    [projectDeliverables, projectTasks]
  );

  const computeProjectWithDerivedState = useCallback(
    (project: Project) => {
      const normalizedProject = normalizeProject(project);
      const responsibleEmployee = employees.find((employee) => employee.id === normalizedProject.responsibleUserId);
      const resolvedResponsible =
        responsibleEmployee?.name || normalizedProject.responsible || normalizedProject.responsibleNameLegacy || "";
      const resolvedAvatar = normalizedProject.responsibleAvatarUrl || responsibleEmployee?.avatarUrl || "";

      const projectWithResponsible: Project = {
        ...normalizedProject,
        responsible: resolvedResponsible,
        responsibleAvatarUrl: resolvedAvatar,
      };
      const progressState = computeProgressValue(normalizedProject);
      const statusState = resolveProjectStatus({
        project: projectWithResponsible,
        tasks: projectTasks(normalizedProject.id),
        meetings: projectMeetings(normalizedProject.id),
        indicators: projectIndicators(normalizedProject.id),
        documents: projectDocuments(normalizedProject.id),
        contracts: projectContracts(normalizedProject.id, normalizedProject.clientId),
        client: clients.find((client) => client.id === normalizedProject.clientId),
      });

      const nextProject: Project = {
        ...projectWithResponsible,
        ...progressState,
        status: statusState.status,
        statusReason: statusState.reason,
        statusSource: statusState.source,
      };

      if (statusState.overrideExpired && normalizedProject.statusOverrideEnabled) {
        nextProject.statusOverrideEnabled = false;
        nextProject.statusOverrideValue = null;
        nextProject.statusOverrideExpiresAt = undefined;
      }

      return { project: nextProject, statusOverrideExpired: statusState.overrideExpired };
    },
    [
      clients,
      computeProgressValue,
      projectContracts,
      projectDocuments,
      projectIndicators,
      projectMeetings,
      projectTasks,
      employees,
    ]
  );

  const deriveAuditLogs = useCallback((
    previous: Project | undefined,
    next: Project,
    options?: { statusOverrideExpired?: boolean }
  ): ProjectAuditLogEntry[] => {
    const entries: ProjectAuditLogEntry[] = [];
    const overrideChanged = previous?.progressOverrideEnabled !== next.progressOverrideEnabled;
    const manualChanged = next.progressOverrideEnabled && previous && previous.manualProgress !== next.manualProgress;
    const justificationChanged =
      next.progressOverrideEnabled && previous && previous.progressJustification !== next.progressJustification;

    if (!previous && next.progressOverrideEnabled) {
      const message = buildProgressAuditMessage({
        projectName: next.name,
        overrideEnabled: true,
        manualProgress: next.manualProgress,
        justification: next.progressJustification,
      });
      entries.push({ id: generateId(), projectId: next.id, message, createdAt: getDate() });
    } else if (overrideChanged || manualChanged || justificationChanged) {
      const message = buildProgressAuditMessage({
        projectName: next.name,
        overrideEnabled: next.progressOverrideEnabled,
        manualProgress: next.manualProgress,
        justification: next.progressJustification,
        previousManualProgress: previous?.manualProgress,
        previousOverrideEnabled: previous?.progressOverrideEnabled,
      });

      if (message) {
        entries.push({ id: generateId(), projectId: next.id, message, createdAt: getDate() });
      }
    }

    const statusMessage = buildStatusAuditMessage({
      projectName: next.name,
      overrideEnabled: Boolean(next.statusOverrideEnabled),
      overrideValue: next.statusOverrideValue || next.status,
      justification: next.statusOverrideJustification,
      expiresAt: next.statusOverrideExpiresAt,
      previousOverrideEnabled: previous?.statusOverrideEnabled,
      previousOverrideValue: previous?.statusOverrideValue,
      expired: options?.statusOverrideExpired,
      author: next.statusOverrideAuthor,
    });

    if (statusMessage) {
      entries.push({ id: generateId(), projectId: next.id, message: statusMessage, createdAt: getDate() });
    }

    return entries;
  }, []);

  useEffect(() => {
    const auditEntries: ProjectAuditLogEntry[] = [];
    setProjects((prev) =>
      prev.map((project) => {
        const { project: nextProject, statusOverrideExpired } = computeProjectWithDerivedState(project);
        const derivedLogs = deriveAuditLogs(project, nextProject, { statusOverrideExpired });
        if (derivedLogs.length) {
          auditEntries.push(...derivedLogs);
        }
        return nextProject;
      })
    );

    if (auditEntries.length > 0) {
      setProjectAuditLogs((prev) => [...prev, ...auditEntries]);
    }
  }, [computeProjectWithDerivedState, deriveAuditLogs, setProjectAuditLogs, setProjects]);

  const value: DataContextType = {
    clients,
    addClient: (client) => {
      const newClient = normalizeClient({
        ...client,
        id: generateId(),
        createdAt: getDate(),
        lastContact: getDate(),
      });

      setClients((prev) => [...prev, newClient]);
      return newClient;
    },
    updateClient: (id, client) =>
      setClients((prev) => prev.map((c) => (c.id === id ? normalizeClient({ ...c, ...client }) : c))),
    deleteClient: (id) => setClients((prev) => prev.filter((c) => c.id !== id)),

    projects,
    addProject: (project, options) => {
      const projectId = generateId();
      const baseProject = normalizeProject({
        ...project,
        id: projectId,
        createdAt: getDate(),
      });
      const { project: newProject, statusOverrideExpired } = computeProjectWithDerivedState(baseProject);
      const auditLogs = deriveAuditLogs(undefined, newProject, { statusOverrideExpired });

      setProjects((prev) => [...prev, newProject]);

      if (options?.seedStructure) {
        const responsibleName = newProject.responsible || newProject.responsibleNameLegacy || "Responsável";
        const seededTasks = buildSeedTasks({
          phase: newProject.phase,
          startDate: newProject.startDate,
          responsible: responsibleName,
          projectId,
          projectName: newProject.name,
          clientId: newProject.clientId,
          clientName: newProject.clientName,
        });

        if (seededTasks.length) {
          setTasks((prev) => [...prev, ...seededTasks]);
        }
      }

      if (options?.opportunities?.length) {
        const prepared = options.opportunities.map((opportunity) =>
          normalizeOpportunity({
            ...opportunity,
            projectId,
            clientId: newProject.clientId,
            status: opportunity.status || "Identificado",
            createdAt: getDate(),
            source: "manual" as const,
          })
        );
        setOpportunities((prev) => [...prev, ...prepared]);
      }

      if (auditLogs.length) {
        setProjectAuditLogs((prev) => [...prev, ...auditLogs]);
      }
    },
    updateProject: (id, project) => {
      let auditLogs: ProjectAuditLogEntry[] = [];
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const mergedProject = normalizeProject({ ...p, ...project });
          const { project: nextProject, statusOverrideExpired } = computeProjectWithDerivedState(mergedProject);
          auditLogs = deriveAuditLogs(p, nextProject, { statusOverrideExpired });
          return nextProject;
        })
      );
      if (auditLogs.length) {
        setProjectAuditLogs((prev) => [...prev, ...auditLogs]);
      }
    },
    deleteProject: (id) => setProjects((prev) => prev.filter((p) => p.id !== id)),

    tasks,
    addTask: (task) => setTasks((prev) => [...prev, { ...task, id: generateId(), createdAt: getDate() }]),
    updateTask: (id, task) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...task } : t))),
    deleteTask: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),

    opportunities,
    addOpportunity: (opportunity) => {
      const newOpportunity = normalizeOpportunity({ ...opportunity, id: generateId(), createdAt: getDate() });
      setOpportunities((prev) => [...prev, newOpportunity]);
      return newOpportunity;
    },
    updateOpportunity: (id, opportunity) =>
      setOpportunities((prev) => prev.map((opp) => (opp.id === id ? normalizeOpportunity({ ...opp, ...opportunity, updatedAt: getDate() }) : opp))),
    deleteOpportunity: (id) => setOpportunities((prev) => prev.filter((opp) => opp.id !== id)),

    deliverables,
    addDeliverable: (deliverable) =>
      setDeliverables((prev) => [...prev, { ...deliverable, id: generateId(), createdAt: getDate() }]),
    updateDeliverable: (id, deliverable) =>
      setDeliverables((prev) => prev.map((d) => (d.id === id ? { ...d, ...deliverable } : d))),
    deleteDeliverable: (id) => setDeliverables((prev) => prev.filter((d) => d.id !== id)),

    meetings,
    addMeeting: (meeting) =>
      setMeetings((prev) => [...prev, { ...meeting, id: generateId(), createdAt: getDate() }]),
    updateMeeting: (id, meeting) =>
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...meeting } : m))),
    deleteMeeting: (id) => setMeetings((prev) => prev.filter((m) => m.id !== id)),

    indicators,
    addIndicator: (indicator) =>
      setIndicators((prev) => [...prev, { ...indicator, id: generateId(), createdAt: getDate() }]),
    updateIndicator: (id, indicator) =>
      setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, ...indicator } : i))),
    deleteIndicator: (id) => setIndicators((prev) => prev.filter((i) => i.id !== id)),

    documents,
    addDocument: (document) =>
      setDocuments((prev) => [
        ...prev,
        { ...document, id: generateId(), createdAt: getDate(), updatedAt: getDate() },
      ]),
    updateDocument: (id, document) =>
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...document, updatedAt: getDate() } : d))),
    deleteDocument: (id) => setDocuments((prev) => prev.filter((d) => d.id !== id)),

    playbooks,
    addPlaybook: (playbook) =>
      setPlaybooks((prev) => [...prev, { ...playbook, id: generateId(), createdAt: getDate() }]),
    updatePlaybook: (id, playbook) =>
      setPlaybooks((prev) => prev.map((p) => (p.id === id ? { ...p, ...playbook } : p))),
    deletePlaybook: (id) => setPlaybooks((prev) => prev.filter((p) => p.id !== id)),

    employees,
    addEmployee: (employee) =>
      setEmployees((prev) => [...prev, { ...employee, id: generateId(), createdAt: getDate() }]),
    updateEmployee: (id, employee) =>
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...employee } : e))),
    deleteEmployee: (id) => setEmployees((prev) => prev.filter((e) => e.id !== id)),

    leads,
    addLead: (lead) => setLeads((prev) => [...prev, { ...lead, id: generateId(), createdAt: getDate() }]),
    updateLead: (id, lead) => setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...lead } : l))),
    deleteLead: (id) => setLeads((prev) => prev.filter((l) => l.id !== id)),

    templates,
    addTemplate: (template) => {
      const now = getDate();
      const normalized = normalizeTemplate({
        ...template,
        id: template.id || generateId(),
        createdAt: template.createdAt || now,
        updatedAt: template.updatedAt || now,
        audit: {
          createdAt: template.audit?.createdAt || now,
          updatedAt: template.audit?.updatedAt || now,
          createdBy: template.audit?.createdBy || currentUserName,
          updatedBy: template.audit?.updatedBy || currentUserName,
        },
      });
      setTemplates((prev) => [...prev, normalized]);
      return normalized;
    },
    updateTemplate: (id, template) =>
      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;

          const now = getDate();
          const updatedAt = template.updatedAt || now;

          return normalizeTemplate({
            ...t,
            ...template,
            updatedAt,
            audit: {
              createdAt: template.audit?.createdAt || t.audit?.createdAt || t.createdAt || getDate(),
              updatedAt: template.audit?.updatedAt || updatedAt,
              createdBy: template.audit?.createdBy || t.audit?.createdBy || currentUserName,
              updatedBy: template.audit?.updatedBy || currentUserName,
            },
          });
        })
      ),
    deleteTemplate: (id) => setTemplates((prev) => prev.filter((t) => t.id !== id)),

    diagnostics,
    addDiagnostic: (diagnostic) =>
      setDiagnostics((prev) => [
        ...prev,
        normalizeDiagnostic({ ...diagnostic, id: generateId(), createdAt: getDate(), updatedAt: getDate() }),
      ]),
    updateDiagnostic: (id, diagnostic) =>
      setDiagnostics((prev) =>
        prev.map((d) =>
          d.id === id
            ? normalizeDiagnostic({ ...d, ...diagnostic, updatedAt: diagnostic.updatedAt || getDate() })
            : d
        )
      ),
    deleteDiagnostic: (id) => setDiagnostics((prev) => prev.filter((d) => d.id !== id)),
    refreshDiagnostics,
    refreshTemplates,
    applyDiagnostic: handleApplyDiagnostic,
    duplicateDiagnostic: handleDuplicateDiagnostic,

    contentItems,
    addContentItem: (item) =>
      setContentItems((prev) => [...prev, { ...item, id: generateId(), createdAt: getDate() }]),
    updateContentItem: (id, item) =>
      setContentItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...item } : i))),
    deleteContentItem: (id) => setContentItems((prev) => prev.filter((i) => i.id !== id)),

    contracts,
    addContract: (contract) =>
      setContracts((prev) => [...prev, { ...contract, id: generateId(), createdAt: getDate() }]),
    updateContract: (id, contract) =>
      setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...contract } : c))),
    deleteContract: (id) => setContracts((prev) => prev.filter((c) => c.id !== id)),

    expenses,
    addExpense: (expense) =>
      setExpenses((prev) => [...prev, { ...expense, id: generateId(), createdAt: getDate() }]),
    updateExpense: (id, expense) =>
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...expense } : e))),
    deleteExpense: (id) => setExpenses((prev) => prev.filter((e) => e.id !== id)),

    projectAuditLogs,
    addProjectAuditLog: (entry) => {
      const newEntry = { ...entry, id: generateId(), createdAt: getDate() };
      setProjectAuditLogs((prev) => [...prev, newEntry]);
      return newEntry;
    },

    clientContacts,
    addClientContact: (contact) => {
      const newContact = { ...contact, id: generateId() };
      setClientContacts((prev) => [...prev, newContact]);
      return newContact;
    },
    updateClientContact: (id, contact) =>
      setClientContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...contact } : c))),
    deleteClientContact: (id) => setClientContacts((prev) => prev.filter((c) => c.id !== id)),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
