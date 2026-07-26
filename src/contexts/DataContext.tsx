
import React, { createContext, useContext, useEffect, ReactNode, useState, useCallback, useRef } from "react";
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
  ActionPlan,
  ActionPriority,
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
import { addDays, format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  ApplyDiagnosticInput,
  applyDiagnostic as applyDiagnosticMock,
  createTemplate,
  deleteTemplateRecord,
  fetchTemplates,
  getDefaultDiagnosticName,
  isMissingTemplatesTableMessage,
  updateTemplateRecord,
} from "@/lib/diagnostics";
// Template sync removed - templates are 100% database-driven
import {
  createClient as createSupabaseClient,
  deleteClient as deleteSupabaseClient,
  listClients,
  updateClient as updateSupabaseClient,
  type ClientRow,
} from "@/integrations/supabase/clients";
import {
  createProject as createSupabaseProject,
  deleteProject as deleteSupabaseProject,
  listProjects,
  updateProject as updateSupabaseProject,
  type ProjectRow,
} from "@/integrations/supabase/projects";
import {
  createTask as createSupabaseTask,
  createTasksBatch,
  deleteTask as deleteSupabaseTask,
  listTasks,
  updateTask as updateSupabaseTask,
  type TaskRow,
} from "@/integrations/supabase/tasks";
import {
  createPlaybook,
  deletePlaybookRecord,
  listPlaybooks,
  updatePlaybookRecord,
  type PlaybookRow,
} from "@/integrations/supabase/playbooks";
import {
  createExpense as createSupabaseExpense,
  deleteExpense as deleteSupabaseExpense,
  isMissingExpensesTableMessage,
  listExpenses,
  updateExpense as updateSupabaseExpense,
  type ExpenseRow,
} from "@/integrations/supabase/expenses";
import {
  createEmployee as createSupabaseEmployee,
  deleteEmployee as deleteSupabaseEmployee,
  listEmployees,
  updateEmployee as updateSupabaseEmployee,
  type EmployeeRow,
} from "@/integrations/supabase/employees";
import {
  createDiagnostic as createSupabaseDiagnostic,
  deleteDiagnostic as deleteSupabaseDiagnostic,
  listDiagnostics,
  updateDiagnostic as updateSupabaseDiagnostic,
  type DiagnosticRow,
} from "@/integrations/supabase/diagnostics";
import {
  createIndicator as createSupabaseIndicator,
  deleteIndicator as deleteSupabaseIndicator,
  listIndicators,
  updateIndicator as updateSupabaseIndicator,
  type IndicatorRow,
} from "@/integrations/supabase/indicators";
import {
  createLead as createSupabaseLead,
  deleteLead as deleteSupabaseLead,
  listLeads,
  updateLead as updateSupabaseLead,
  type LeadRow,
} from "@/integrations/supabase/leads";
import {
  createDeliverable as createSupabaseDeliverable,
  deleteDeliverable as deleteSupabaseDeliverable,
  listDeliverables,
  updateDeliverable as updateSupabaseDeliverable,
  type DeliverableRow,
} from "@/integrations/supabase/deliverables";
import {
  createContentItem as createSupabaseContentItem,
  deleteContentItem as deleteSupabaseContentItem,
  listContentItems,
  updateContentItem as updateSupabaseContentItem,
  type ContentItemRow,
} from "@/integrations/supabase/content-items";
import {
  createContract as createSupabaseContract,
  deleteContract as deleteSupabaseContract,
  listContracts,
  updateContract as updateSupabaseContract,
  type ContractRow,
} from "@/integrations/supabase/contracts";
import {
  createClientContact as createSupabaseClientContact,
  deleteClientContact as deleteSupabaseClientContact,
  listClientContacts,
  updateClientContact as updateSupabaseClientContact,
  type ClientContactRow,
} from "@/integrations/supabase/client-contacts";
import {
  createAuditLog as createSupabaseAuditLog,
  listAuditLogs,
  type AuditLogRow,
} from "@/integrations/supabase/audit-logs";
import type { Database } from "@/integrations/supabase/types";
import { hasTaskValidationErrors, validateTask } from "@/lib/tasks/validation";
import { assertExpectedTaskStatus } from "@/lib/tasks/completion";

interface DataContextType {
  // Clients
  clients: Client[];
  clientsLoading: boolean;
  clientsError?: string | null;
  addClient: (client: Omit<Client, "id" | "createdAt">) => Promise<Client>;
  updateClient: (id: string, client: Partial<Client>) => Promise<Client | undefined>;
  deleteClient: (id: string) => Promise<void>;

  // Projects
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
  addProject: (
    project: Omit<Project, "id" | "createdAt" | "progress" | "status" | "statusReason" | "statusSource">,
    options?: {
      opportunities?: Omit<Opportunity, "id" | "createdAt" | "updatedAt" | "source">[];
      seedStructure?: boolean;
    }
  ) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Tasks
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: string | null;
  savingTaskIds: string[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>, options?: { expectedStatus?: Task["status"] }) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;

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
  addEmployee: (employee: Omit<Employee, "id" | "createdAt">) => Promise<Employee>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<Employee | undefined>;
  deleteEmployee: (id: string) => Promise<void>;

  // Leads
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => Promise<Lead>;
  updateLead: (id: string, lead: Partial<Lead>) => Promise<Lead | undefined>;
  deleteLead: (id: string) => Promise<void>;

  // Diagnostics
  diagnostics: Diagnostic[];
  addDiagnostic: (diagnostic: Omit<Diagnostic, "id" | "createdAt">) => Promise<Diagnostic | undefined>;
  updateDiagnostic: (id: string, diagnostic: Partial<Diagnostic>) => Promise<Diagnostic | undefined>;
  deleteDiagnostic: (id: string) => Promise<void>;
  templates: DiagnosticTemplate[];
  templatesLoading: boolean;
  templatesError?: string | null;
  addTemplate: (template: Omit<DiagnosticTemplate, "id"> & { id?: string }) => Promise<DiagnosticTemplate>;
  updateTemplate: (id: string, template: Partial<DiagnosticTemplate>) => Promise<DiagnosticTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  applyDiagnostic: (diagnostic: ApplyDiagnosticInput) => Promise<Diagnostic>;
  duplicateDiagnostic: (
    diagnostic: Diagnostic,
    target: { projectId: string; projectName: string; clientId: string; clientName: string }
  ) => Promise<Diagnostic>;
  createActionPlan: (input: { diagnostic: Diagnostic; actionPlan: ActionPlan }) => Promise<Task[]>;

  // Content
  contentItems: ContentItem[];
  addContentItem: (item: Omit<ContentItem, "id" | "createdAt">) => Promise<ContentItem>;
  updateContentItem: (id: string, item: Partial<ContentItem>) => Promise<ContentItem | undefined>;
  deleteContentItem: (id: string) => Promise<void>;

  // Contracts
  contracts: Contract[];
  addContract: (contract: Omit<Contract, "id" | "createdAt">) => Promise<Contract>;
  updateContract: (id: string, contract: Partial<Contract>) => void;
  deleteContract: (id: string) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => Promise<Expense | undefined>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<Expense | undefined>;
  deleteExpense: (id: string) => Promise<void>;

  // Project audit log
  projectAuditLogs: ProjectAuditLogEntry[];
  addProjectAuditLog: (entry: Omit<ProjectAuditLogEntry, "id" | "createdAt">) => ProjectAuditLogEntry;

  // Client contacts
  clientContacts: ClientContact[];
  addClientContact: (contact: Omit<ClientContact, "id">) => ClientContact;
  updateClientContact: (id: string, contact: Partial<ClientContact>) => void;
  deleteClientContact: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
const getDate = () => new Date().toLocaleDateString("pt-BR");

const formatDateFromIso = (value?: string | null) => {
  if (!value) return getDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? getDate() : parsed.toLocaleDateString("pt-BR");
};

type PlaybookContent = {
  area?: string;
  whenToUse?: string;
  howToValidate?: string;
  steps?: string[];
  checklist?: string[];
  commonErrors?: string[];
  tags?: string[];
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

const parsePlaybookContent = (content?: string | null): PlaybookContent => {
  if (!content) return {};
  try {
    return JSON.parse(content) as PlaybookContent;
  } catch {
    return {};
  }
};

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

const mapSupabaseClientToLegacy = (client: ClientRow): LegacyClient => ({
  id: client.id,
  name: client.name,
  tradeName: client.name,
  razaoSocial: client.name,
  cnpj: client.cnpj || "",
  segment: client.segment || "",
  status: (client.status as Client["status"]) || "ativo",
  contatoPrincipal: {
    nome: client.contact_name || "",
    whatsapp: client.contact_phone || "",
    email: client.contact_email || "",
  },
  projects: 0,
  nps: 0,
  risk: "low",
  lastContact: formatDateFromIso(client.updated_at || client.created_at),
  createdAt: formatDateFromIso(client.created_at),
  endereco: {},
  preferenciasRelacionamento: {},
});

type SupabaseClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type SupabaseClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

const buildSupabaseClientInsert = (client: LegacyClient): SupabaseClientInsert => {
  const timestamp = new Date().toISOString();

  return {
    name: client.razaoSocial || client.name || client.tradeName || "Cliente",
    cnpj: client.cnpj || null,
    segment: client.segment || client.segmentoTags?.[0] || null,
    status: client.status || "ativo",
    contact_name: client.contatoPrincipal?.nome || client.primaryContactName || null,
    contact_email: client.contatoPrincipal?.email || client.primaryContactEmail || null,
    contact_phone: client.contatoPrincipal?.whatsapp || client.primaryContactPhone || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const buildSupabaseClientUpdate = (client: LegacyClient): SupabaseClientUpdate => {
  const payload: SupabaseClientUpdate = { updated_at: new Date().toISOString() };

  if (typeof client.razaoSocial !== "undefined" || typeof client.name !== "undefined" || typeof client.tradeName !== "undefined") {
    payload.name = client.razaoSocial || client.name || client.tradeName;
  }

  if (typeof client.cnpj !== "undefined") {
    payload.cnpj = client.cnpj || null;
  }

  if (typeof client.segment !== "undefined" || client.segmentoTags) {
    payload.segment = client.segment || client.segmentoTags?.[0] || null;
  }

  if (typeof client.status !== "undefined") {
    payload.status = client.status;
  }

  if (client.contatoPrincipal || client.primaryContactName || client.primaryContactEmail || client.primaryContactPhone) {
    payload.contact_name = client.contatoPrincipal?.nome || client.primaryContactName || null;
    payload.contact_email = client.contatoPrincipal?.email || client.primaryContactEmail || null;
    payload.contact_phone = client.contatoPrincipal?.whatsapp || client.primaryContactPhone || null;
  }

  return payload;
};

const serializePlaybookContent = (playbook: Partial<Playbook>): string =>
  JSON.stringify({
    area: playbook.area,
    whenToUse: playbook.whenToUse,
    howToValidate: playbook.howToValidate,

    steps: playbook.steps,
    checklist: playbook.checklist,
    commonErrors: playbook.commonErrors,
    tags: playbook.tags,
    fileName: playbook.fileName,
    fileType: playbook.fileType,
    fileSize: playbook.fileSize,
  });

const mapSupabasePlaybook = (playbook: PlaybookRow): Playbook => {
  const content = parsePlaybookContent(playbook.content);

  return {
    id: playbook.id,
    title: playbook.title,
    area: playbook.category || content.area || "",
    description: playbook.description || "",
    whenToUse: content.whenToUse || "",
    howToValidate: content.howToValidate || "",
    steps: content.steps || [],
    checklist: content.checklist || [],
    commonErrors: content.commonErrors || [],
    tags: content.tags || [],
    fileName: content.fileName,
    fileType: content.fileType,
    fileSize: content.fileSize,
    createdAt: formatDateFromIso(playbook.created_at),
  };
};

const mapSupabaseEmployee = (employee: EmployeeRow): Employee => {
  const status = employee.status === "onboarding" ? "onboarding" : "active";

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email || "",
    role: employee.role || "Analista",
    seniority: "Pleno",
    startDate: formatDateFromIso(employee.hire_date || employee.created_at),
    projects: 0,
    onboardingProgress: status === "onboarding" ? 0 : 100,
    status,
    permissions: [],
    avatarUrl: employee.avatar_url || undefined,
    createdAt: formatDateFromIso(employee.created_at),
  };
};

const buildSupabasePlaybookInsert = (playbook: Omit<Playbook, "id" | "createdAt">): Database["public"]["Tables"]["playbooks"]["Insert"] => {
  const timestamp = new Date().toISOString();

  return {
    title: playbook.title,
    description: playbook.description || null,
    category: playbook.area || null,
    content: serializePlaybookContent(playbook),
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const buildSupabasePlaybookUpdate = (playbook: Playbook): Database["public"]["Tables"]["playbooks"]["Update"] => ({
  title: playbook.title,
  description: playbook.description || null,
  category: playbook.area || null,
  content: serializePlaybookContent(playbook),
  updated_at: new Date().toISOString(),
});

// Mapping functions for new Supabase integrations

const mapSupabaseIndicatorToLegacy = (indicator: IndicatorRow): Indicator => ({
  id: indicator.id,
  name: indicator.name,
  category: indicator.category || "",
  unit: indicator.unit || "",
  frequency: (indicator.frequency as Indicator["frequency"]) || "Mensal",
  source: "planilha",
  targetValue: indicator.target_value ? Number(indicator.target_value) : undefined,
  currentValue: indicator.current_value ? Number(indicator.current_value) : undefined,
  trend: (indicator.trend as Indicator["trend"]) || "stable",
  projectId: indicator.project_id || undefined,
  projectName: "",
  responsible: "",
  values: [],
  createdAt: formatDateFromIso(indicator.created_at),
});

const mapSupabaseLeadToLegacy = (lead: LeadRow): Lead => ({
  id: lead.id,
  company: lead.company || "",
  contact: lead.name,
  email: lead.email || undefined,
  phone: lead.phone || undefined,
  source: lead.source || "Inbound",
  status: (lead.status?.toLowerCase() as Lead["status"]) || "new",
  value: (lead as { value?: number }).value || 0,
  nextAction: (lead as { next_action?: string }).next_action || "",
  nextActionDate: (lead as { next_action_date?: string }).next_action_date || undefined,
  notes: lead.notes || undefined,
  createdAt: formatDateFromIso(lead.created_at),
});

const mapSupabaseDeliverableToLegacy = (del: DeliverableRow): ProjectDeliverable => ({
  id: del.id,
  projectId: del.project_id,
  title: del.title,
  status: (del.status as ProjectDeliverable["status"]) || "pending",
  dueDate: del.due_date || undefined,
  createdAt: formatDateFromIso(del.created_at),
});

const mapSupabaseContentItemToLegacy = (item: ContentItemRow): ContentItem => {
  const validTypes: ContentItem["type"][] = ["Artigo", "Case", "Post", "Webinar", "Video"];
  return {
    id: item.id,
    title: item.title,
    type: validTypes.includes(item.type as ContentItem["type"]) ? (item.type as ContentItem["type"]) : "Artigo",
    status: (item.status as ContentItem["status"]) || "idea",
    publishDate: item.scheduled_date || undefined,
    tags: item.tags || [],
    createdAt: formatDateFromIso(item.created_at),
  };
};

const mapSupabaseContractToLegacy = (contract: ContractRow): Contract => ({
  id: contract.id,
  clientId: contract.client_id || "",
  clientName: "",
  projectId: contract.project_id || undefined,
  projectName: undefined,
  value: contract.value ? Number(contract.value) : 0,
  startDate: contract.start_date || "",
  endDate: contract.end_date || "",
  billingType: (contract.billing_type as Contract["billingType"]) || "mensal",
  installments: (contract.installments as Contract["installments"]) || [],
  createdAt: formatDateFromIso(contract.created_at),
});

const mapSupabaseClientContactToLegacy = (contact: ClientContactRow): ClientContact => ({
  id: contact.id,
  clientId: contact.client_id,
  name: contact.name,
  role: contact.role || "",
  area: "Diretoria",
  phone: contact.phone || "",
  email: contact.email || "",
  hasPortalAccess: false,
});

const mapSupabaseAuditLogToLegacy = (log: AuditLogRow): ProjectAuditLogEntry => ({
  id: log.id,
  projectId: log.project_id || "",
  message: log.action + (log.field_changed ? `: ${log.field_changed}` : ""),
  createdAt: formatDateFromIso(log.created_at),
});

// Tipos de despesas agora são definidos em expenses.ts

const mapSupabaseExpense = (expense: ExpenseRow): Expense => ({
  id: expense.id,
  description: expense.description,
  category: expense.category ?? "",
  projectId: expense.project_id ?? undefined,
  projectName: expense.project_name ?? undefined,
  value: Number(expense.value ?? 0),
  date: expense.date ?? "",
  receipt: expense.receipt ?? undefined,
  createdAt: formatDateFromIso(expense.created_at),
});

const buildSupabaseExpenseInsert = (
  expense: Omit<Expense, "id" | "createdAt">
) => ({
  description: expense.description,
  category: expense.category || null,
  project_id: expense.projectId ?? null,
  project_name: expense.projectName ?? null,
  value: expense.value,
  date: expense.date || null,
  receipt: expense.receipt ?? null,
});

const buildSupabaseExpenseUpdate = (expense: Partial<Expense>) => {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof expense.description !== "undefined") {
    payload.description = expense.description;
  }

  if (typeof expense.category !== "undefined") {
    payload.category = expense.category;
  }

  if ("projectId" in expense) {
    payload.project_id = expense.projectId ?? null;
  }


  if ("projectName" in expense) {
    payload.project_name = expense.projectName ?? null;
  }

  if (typeof expense.value !== "undefined") {
    payload.value = expense.value;
  }

  if ("date" in expense) {
    payload.date = expense.date ?? null;
  }

  if ("receipt" in expense) {
    payload.receipt = expense.receipt ?? null;
  }

  return payload;
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
    projectType: project.projectType || "consulting",
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
    templateSnapshot: diagnostic.templateSnapshot,
    status: diagnostic.status || "draft",
    progress: progressValue,
    score: diagnostic.score,
    opportunities: diagnostic.opportunities ?? 0,
    createdAt,
    updatedAt: diagnostic.updatedAt || createdAt,
    totalQuestions,
    answeredQuestions,
    answers: diagnostic.answers || {},
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
    
    // Preenche 5W2H automaticamente
    const what = template.title;
    const why = `Necessário para conclusão da fase "${phase}" do projeto`;
    const where = projectName;
    const when = dueDate;
    const who = responsible;
    const how = `Executar conforme playbook da fase ${phase}. ${template.evidenceRequired ? "Anexar evidências ao finalizar." : ""}`.trim();
    const howMuch = template.impact || "A definir conforme escopo";

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
      // Campos 5W2H preenchidos automaticamente
      what,
      why,
      where,
      when,
      who,
      how,
      howMuch,
    } as Task;
  });
};

const mapActionPriorityToTask = (priority: ActionPriority): Task["priority"] => {
  switch (priority) {
    case "alta":
      return "high";
    case "media":
      return "medium";
    default:
      return "low";
  }
};

const initialStatusFromPriority = (priority: Task["priority"]): Task["status"] =>
  priority === "high" ? "next" : "backlog";

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

// Projetos são carregados do banco de dados - não usar dados mock

const mapSupabaseProjectToLegacy = (project: ProjectRow): Partial<Project> => ({
  id: project.id,
  name: project.name,
  clientId: project.client_id || "",
  clientName: "",
  objective: project.objective || "",
  scope: project.scope || "",
  phase: project.phase || "Diagnóstico",
  projectType: (project.project_type as Project["projectType"]) || "consulting",
  progress: project.progress || 0,
  progressSource: "calculated",
  progressOverrideEnabled: false,
  manualProgress: null,
  status: "green",
  responsibleUserId: null,
  responsibleNameLegacy: project.responsible || "",
  responsible: project.responsible || "",
  forecastEndDate: project.end_date || "",
  estimatedDuration: null,
  forecastAdjustedManually: false,
  startDate: project.start_date || "",
  endDate: project.end_date || "",
  createdAt: formatDateFromIso(project.created_at),
  moneyHypothesis: project.money_hypothesis ? String(project.money_hypothesis) : "",
  legacyOpportunityMigrated: false,
});

type SupabaseProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type SupabaseProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toSupabaseUuid = (value?: string | null): string | null =>
  value && uuidRegex.test(value) ? value : null;

const toSupabaseDate = (value?: string | null): string | null => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = parseDatePtBR(value || undefined);
  return parsed ? format(parsed, "yyyy-MM-dd") : null;
};

type SupabaseEmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
type SupabaseEmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"];

const buildSupabaseEmployeeInsert = (
  employee: Omit<Employee, "id" | "createdAt">,
  userId?: string | null
): SupabaseEmployeeInsert => {
  const timestamp = new Date().toISOString();

  return {
    name: employee.name,
    email: employee.email || null,
    role: employee.role || null,
    status: employee.status || "onboarding",
    hire_date: toSupabaseDate(employee.startDate),
    avatar_url: employee.avatarUrl || null,
    user_id: userId || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const buildSupabaseEmployeeUpdate = (employee: Partial<Employee>): SupabaseEmployeeUpdate => {
  const payload: SupabaseEmployeeUpdate = { updated_at: new Date().toISOString() };

  if (typeof employee.name !== "undefined") {
    payload.name = employee.name;
  }

  if (typeof employee.email !== "undefined") {
    payload.email = employee.email || null;
  }

  if (typeof employee.role !== "undefined") {
    payload.role = employee.role || null;
  }

  if (typeof employee.status !== "undefined") {
    payload.status = employee.status;
  }

  if (typeof employee.startDate !== "undefined") {
    payload.hire_date = toSupabaseDate(employee.startDate);
  }

  if (typeof employee.avatarUrl !== "undefined") {
    payload.avatar_url = employee.avatarUrl || null;
  }

  return payload;
};

const buildSupabaseProjectInsert = (project: Partial<Project>, clientId: string): SupabaseProjectInsert => {
  const timestamp = new Date().toISOString();

  return {
    name: project.name || "Projeto",
    client_id: clientId,
    objective: project.objective || null,
    scope: project.scope || null,
    phase: project.phase || "Diagnóstico",
    project_type: project.projectType || "consulting",
    progress: project.progress || 0,

    responsible: project.responsible || project.responsibleNameLegacy || null,
    start_date: toSupabaseDate(project.startDate),
    end_date: toSupabaseDate(project.endDate || project.forecastEndDate || null),
    money_hypothesis: project.moneyHypothesis
      ? parseFloat(project.moneyHypothesis.replace(/[^\d.-]/g, "")) || null
      : null,
    status: project.status || "Em andamento",
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const buildSupabaseProjectUpdate = (project: Partial<Project>): SupabaseProjectUpdate => {
  const payload: SupabaseProjectUpdate = { updated_at: new Date().toISOString() };

  if (typeof project.name !== "undefined") {
    payload.name = project.name;
  }

  if (typeof project.objective !== "undefined") {
    payload.objective = project.objective || null;
  }

  if (typeof project.scope !== "undefined") {
    payload.scope = project.scope || null;
  }

  if (typeof project.phase !== "undefined") {
    payload.phase = project.phase || null;
  }

  if (typeof project.projectType !== "undefined") {
    payload.project_type = project.projectType || "consulting";
  }

  if (typeof project.progress !== "undefined") {
    payload.progress = project.progress;
  }

  if (typeof project.responsible !== "undefined" || typeof project.responsibleNameLegacy !== "undefined") {
    payload.responsible = project.responsible || project.responsibleNameLegacy || null;
  }

  if (typeof project.startDate !== "undefined") {
    payload.start_date = toSupabaseDate(project.startDate);
  }

  if (typeof project.endDate !== "undefined" || typeof project.forecastEndDate !== "undefined") {
    payload.end_date = toSupabaseDate(project.endDate || project.forecastEndDate || null);
  }

  return payload;
};

const normalizeTaskStatus = (value?: string | null): Task["status"] => {
  const status = (value || "").trim().toLowerCase().replace(/_/g, " ");
  if (["next", "próximas", "proximas"].includes(status)) return "next";
  if (["in progress", "em andamento"].includes(status)) return "in_progress";
  if (["waiting", "aguardando"].includes(status)) return "waiting";
  if (["review", "em revisão", "em revisao", "validation", "em validação", "em validacao"].includes(status)) return "review";
  if (["done", "concluída", "concluida", "concluído", "concluido"].includes(status)) return "done";
  return "backlog";
};

const normalizeTaskPriority = (value?: string | null): Task["priority"] => {
  const priority = (value || "").trim().toLowerCase();
  if (["urgent", "urgente"].includes(priority)) return "urgent";
  if (["high", "alta"].includes(priority)) return "high";
  if (["low", "baixa"].includes(priority)) return "low";
  return "medium";
};

// Funções de mapeamento para tarefas
const mapSupabaseTaskToLegacy = (task: TaskRow, projectName: string, clientName: string): Task => ({
  id: task.id,
  title: task.title,
  description: task.description || "",
  projectId: task.project_id || "",
  projectName,
  clientId: task.client_id || "",
  clientName,
  type: (task.type as Task["type"]) || "processo",
  responsible: task.responsible || "",
  priority: normalizeTaskPriority(task.priority),
  taskType: task.task_type === "personal" ? "personal" : "project",
  assignedTo: task.assigned_to || "",
  startDate: task.start_date || "",
  dueDate: task.due_date || "",
  impact: "",
  status: normalizeTaskStatus(task.status),
  checklist: [],
  evidenceRequired: task.evidence_required || false,
  evidenceFile: task.evidence_url || undefined,
  what: task.what || "",
  why: task.why || "",
  where: task.where_location || "",
  when: task.when_date || "",
  who: task.who || "",
  how: task.how || "",
  howMuch: task.how_much ? String(task.how_much) : "",
  createdAt: formatDateFromIso(task.created_at),
  updatedAt: task.updated_at,
  sourceDiagnosticId: task.source_diagnostic_id || undefined,
  sourceActionId: task.source_action_id || undefined,
  consultingDay: task.consulting_day || undefined,
  createdBy: task.created_by || "",
  completedAt: task.completed_at || undefined,
  completedBy: task.completed_by || undefined,
  previousStatus: task.previous_status
    ? normalizeTaskStatus(task.previous_status)
    : undefined,
});

type SupabaseTaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type SupabaseTaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

const buildSupabaseTaskInsert = (task: Omit<Task, "id" | "createdAt">): SupabaseTaskInsert => ({
  title: task.title,
  description: task.description || null,
  project_id: task.projectId || null,
  client_id: task.clientId || null,
  type: task.type || "processo",
  responsible: task.responsible || null,
  priority: task.priority || "medium",
  task_type: task.taskType || "project",
  assigned_to: task.assignedTo || null,
  start_date: toSupabaseDate(task.startDate),
  due_date: toSupabaseDate(task.dueDate),
  status: task.status || "backlog",
  evidence_required: task.evidenceRequired || false,
  evidence_url: task.evidenceFile || null,
  what: task.what || null,
  why: task.why || null,
  where_location: task.where || null,
  when_date: task.when || null,
  who: task.who || null,
  how: task.how || null,
  how_much: task.howMuch ? parseFloat(task.howMuch.replace(/[^\d.-]/g, "")) || null : null,
  created_by: task.createdBy || undefined,
  completed_at: task.completedAt || null,
  completed_by: task.completedBy || null,
  previous_status: task.previousStatus || null,
  source_diagnostic_id: task.sourceDiagnosticId || null,
  source_action_id: task.sourceActionId || null,
  consulting_day: task.consultingDay || null,
});

const buildSupabaseTaskUpdate = (task: Partial<Task>): SupabaseTaskUpdate => {
  const payload: SupabaseTaskUpdate = { updated_at: new Date().toISOString() };

  if (typeof task.title !== "undefined") payload.title = task.title;
  if (typeof task.description !== "undefined") payload.description = task.description || null;
  if (typeof task.projectId !== "undefined") payload.project_id = task.projectId || null;
  if (typeof task.clientId !== "undefined") payload.client_id = task.clientId || null;
  if (typeof task.responsible !== "undefined") payload.responsible = task.responsible || null;
  if (typeof task.priority !== "undefined") {
    payload.priority = task.priority || null;
  }
  if (typeof task.dueDate !== "undefined") payload.due_date = toSupabaseDate(task.dueDate);
  if (typeof task.status !== "undefined") {
    payload.status = task.status || null;
  }
  if (typeof task.evidenceRequired !== "undefined") payload.evidence_required = task.evidenceRequired;
  if (typeof task.evidenceFile !== "undefined") payload.evidence_url = task.evidenceFile || null;
  if (typeof task.what !== "undefined") payload.what = task.what || null;
  if (typeof task.why !== "undefined") payload.why = task.why || null;
  if (typeof task.where !== "undefined") payload.where_location = task.where || null;
  if (typeof task.when !== "undefined") payload.when_date = task.when || null;
  if (typeof task.who !== "undefined") payload.who = task.who || null;
  if (typeof task.how !== "undefined") payload.how = task.how || null;
  if (typeof task.howMuch !== "undefined") {
    payload.how_much = task.howMuch ? parseFloat(task.howMuch.replace(/[^\d.-]/g, "")) || null : null;
  }
  if (typeof task.taskType !== "undefined") payload.task_type = task.taskType || "project";
  if (typeof task.assignedTo !== "undefined") payload.assigned_to = task.assignedTo || null;
  if (typeof task.startDate !== "undefined") payload.start_date = toSupabaseDate(task.startDate);
  if (typeof task.completedAt !== "undefined") payload.completed_at = task.completedAt || null;
  if (typeof task.completedBy !== "undefined") payload.completed_by = task.completedBy || null;
  if (typeof task.previousStatus !== "undefined") payload.previous_status = task.previousStatus || null;
  if (typeof task.sourceDiagnosticId !== "undefined") payload.source_diagnostic_id = task.sourceDiagnosticId || null;
  if (typeof task.sourceActionId !== "undefined") payload.source_action_id = task.sourceActionId || null;
  if (typeof task.consultingDay !== "undefined") payload.consulting_day = task.consultingDay || null;

  return payload;
};

// Tipos temporários para colunas que existem no banco mas ainda não estão no types.ts gerado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtendedDiagnosticRow = DiagnosticRow & Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseDiagnosticInsert = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseDiagnosticUpdate = Record<string, any>;

const mapSupabaseDiagnosticToLegacy = (diagnostic: ExtendedDiagnosticRow): Diagnostic => ({
  id: diagnostic.id,
  name: diagnostic.name,
  projectId: diagnostic.project_id || "",
  projectName: diagnostic.project_name || "",
  clientId: diagnostic.client_id || "",

  clientName: diagnostic.client_name || "",
  templateId: diagnostic.template_id || "",
  templateName: diagnostic.template_name || "",
  templateSnapshot: diagnostic.template_snapshot as Diagnostic["templateSnapshot"],
  status: (diagnostic.status as Diagnostic["status"]) || "draft",
  progress: diagnostic.progress ?? 0,
  score: diagnostic.score ?? undefined,
  opportunities: diagnostic.opportunities_count ?? 0,
  createdAt: formatDateFromIso(diagnostic.created_at),
  updatedAt: formatDateFromIso(diagnostic.updated_at),
  totalQuestions: diagnostic.total_questions ?? 0,
  answeredQuestions: diagnostic.answered_questions ?? 0,
  answers: (diagnostic.answers as Diagnostic["answers"]) || {},
  autoGenerateOpportunities: diagnostic.auto_generate_opportunities ?? true,
  responsibleName: diagnostic.responsible_name || undefined,
  responsibleId: diagnostic.responsible_id || undefined,
  dueDate: formatDatePtBR(diagnostic.due_date),
  actionPlan: diagnostic.action_plan as unknown as Diagnostic["actionPlan"],
  reportPayload: diagnostic.report_payload as unknown as Diagnostic["reportPayload"],
});

const buildSupabaseDiagnosticInsert = (diagnostic: Diagnostic): SupabaseDiagnosticInsert => {
  const timestamp = new Date().toISOString();
  const id = toSupabaseUuid(diagnostic.id) || undefined;

  return {
    id,
    name: diagnostic.name,
    client_id: toSupabaseUuid(diagnostic.clientId),
    client_name: diagnostic.clientName || null,
    project_id: toSupabaseUuid(diagnostic.projectId),
    project_name: diagnostic.projectName || null,
    template_id: toSupabaseUuid(diagnostic.templateId),
    template_name: diagnostic.templateName || null,
    template_snapshot: diagnostic.templateSnapshot ?? null,
    status: diagnostic.status,
    progress: diagnostic.progress ?? 0,
    score: diagnostic.score ?? null,
    opportunities_count: diagnostic.opportunities ?? 0,
    total_questions: diagnostic.totalQuestions ?? 0,
    answered_questions: diagnostic.answeredQuestions ?? 0,
    answers: diagnostic.answers ?? {},
    auto_generate_opportunities: diagnostic.autoGenerateOpportunities ?? true,
    responsible_name: diagnostic.responsibleName || null,
    responsible_id: toSupabaseUuid(diagnostic.responsibleId),
    due_date: toSupabaseDate(diagnostic.dueDate),
    action_plan: diagnostic.actionPlan ?? null,
    report_payload: diagnostic.reportPayload ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const buildSupabaseDiagnosticUpdate = (diagnostic: Partial<Diagnostic>): SupabaseDiagnosticUpdate => {
  const payload: SupabaseDiagnosticUpdate = { updated_at: new Date().toISOString() };

  if (typeof diagnostic.name !== "undefined") payload.name = diagnostic.name;
  if (typeof diagnostic.clientId !== "undefined") payload.client_id = toSupabaseUuid(diagnostic.clientId);
  if (typeof diagnostic.clientName !== "undefined") payload.client_name = diagnostic.clientName || null;
  if (typeof diagnostic.projectId !== "undefined") payload.project_id = toSupabaseUuid(diagnostic.projectId);
  if (typeof diagnostic.projectName !== "undefined") payload.project_name = diagnostic.projectName || null;
  if (typeof diagnostic.templateId !== "undefined") payload.template_id = toSupabaseUuid(diagnostic.templateId);
  if (typeof diagnostic.templateName !== "undefined") payload.template_name = diagnostic.templateName || null;
  if (typeof diagnostic.templateSnapshot !== "undefined") payload.template_snapshot = diagnostic.templateSnapshot ?? null;
  if (typeof diagnostic.status !== "undefined") payload.status = diagnostic.status;
  if (typeof diagnostic.progress !== "undefined") payload.progress = diagnostic.progress;
  if (typeof diagnostic.score !== "undefined") payload.score = diagnostic.score ?? null;
  if (typeof diagnostic.opportunities !== "undefined") payload.opportunities_count = diagnostic.opportunities ?? 0;
  if (typeof diagnostic.totalQuestions !== "undefined") payload.total_questions = diagnostic.totalQuestions;
  if (typeof diagnostic.answeredQuestions !== "undefined") payload.answered_questions = diagnostic.answeredQuestions;
  if (typeof diagnostic.answers !== "undefined") payload.answers = diagnostic.answers ?? {};
  if (typeof diagnostic.autoGenerateOpportunities !== "undefined") {
    payload.auto_generate_opportunities = diagnostic.autoGenerateOpportunities ?? true;
  }
  if (typeof diagnostic.responsibleName !== "undefined") payload.responsible_name = diagnostic.responsibleName || null;
  if (typeof diagnostic.responsibleId !== "undefined") payload.responsible_id = toSupabaseUuid(diagnostic.responsibleId);
  if (typeof diagnostic.dueDate !== "undefined") payload.due_date = toSupabaseDate(diagnostic.dueDate);
  if (typeof diagnostic.actionPlan !== "undefined") payload.action_plan = diagnostic.actionPlan ?? null;
  if (typeof diagnostic.reportPayload !== "undefined") payload.report_payload = diagnostic.reportPayload ?? null;

  return payload;
};

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

// Tarefas são carregadas do banco de dados - não usar dados mock

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
    frequency: "Mensal",
    source: "planilha",
    targetValue: 500000,
    currentValue: 438000,
    trend: "up",

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
    category: "Operacional",
    unit: "dias",
    frequency: "Semanal",
    source: "integração",
    targetValue: 3,
    currentValue: 4,
    trend: "down",
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

const initialDiagnostics: Diagnostic[] = [];

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

// useLocalStorage removed - no longer used for templates

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentUserName = resolveUserName(user);
  const [clients, setClients] = useState<Client[]>(initialClients.map(normalizeClient));
  const clientsRef = useRef<Client[]>(clients);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const projectsRef = useRef<Project[]>(projects);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [savingTaskIds, setSavingTaskIds] = useState<string[]>([]);
  const savingTaskIdsRef = useRef(new Set<string>());
  const tasksLoadVersionRef = useRef(0);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    clientsRef.current = clients;
  }, [clients]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>(initialPlaybooks);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<DiagnosticTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  // Removed localStorage for template seeds - templates are 100% database-driven
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>(initialDiagnostics);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projectAuditLogs, setProjectAuditLogs] = useState<ProjectAuditLogEntry[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      setClientsLoading(true);
      setClientsError(null);

      try {
        const data = await listClients();
        const normalized = data.map(mapSupabaseClientToLegacy).map(normalizeClient);
        setClients(normalized);
      } catch (error) {
        const message = (error as Error).message || "Não foi possível carregar os clientes";
        setClientsError(message);
        toast({
          title: "Erro ao carregar clientes",
          description: message,
          variant: "destructive",
        });
      } finally {
        setClientsLoading(false);
      }
    };

    fetchClients();
  }, [toast]);

  // Fetch projetos do banco de dados
  useEffect(() => {
    const fetchProjectsData = async () => {
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const projectsData = await listProjects();
        const normalized = projectsData.map((project) => {
          const client = clients.find((c) => c.id === project.client_id);
          const clientName = client?.nomeFantasia || client?.razaoSocial || client?.name || "";
          return normalizeProject({ ...mapSupabaseProjectToLegacy(project), clientName });
        });
        setProjects(normalized);
      } catch (error) {
        const message = (error as Error).message || "Não foi possível carregar os projetos";
        setProjectsError(message);
        toast({

          title: "Erro ao carregar projetos",
          description: message,
          variant: "destructive",
        });
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    // Só busca projetos depois que clientes foram carregados
    if (!clientsLoading) {
      fetchProjectsData();
    }
  }, [toast, clients, clientsLoading]);

  // Fetch tarefas do banco de dados
  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      ++tasksLoadVersionRef.current;
      tasksRef.current = [];
      setTasks([]);
      setTasksError(null);
      setTasksLoading(false);
      return;
    }

    const fetchTasksData = async () => {
      const requestVersion = ++tasksLoadVersionRef.current;
      setTasksLoading(true);
      setTasksError(null);

      try {
        const tasksData = await listTasks();
        const normalized = tasksData.map((task) => {
          const project = projectsRef.current.find((item) => item.id === task.project_id);
          const client = clientsRef.current.find((item) => item.id === task.client_id);
          const projectName = project?.name || "";
          const clientName = client?.nomeFantasia || client?.razaoSocial || client?.name || "";
          return mapSupabaseTaskToLegacy(task, projectName, clientName);
        });
        if (requestVersion === tasksLoadVersionRef.current) {
          tasksRef.current = normalized;
          setTasks(normalized);
        }
      } catch (error) {
        const message = (error as Error).message || "Não foi possível carregar as tarefas";
        setTasksError(message);
        toast({
          title: "Erro ao carregar tarefas",
          description: message,
          variant: "destructive",
        });
        if (requestVersion === tasksLoadVersionRef.current) setTasks([]);
      } finally {
        if (requestVersion === tasksLoadVersionRef.current) setTasksLoading(false);
      }
    };

    // Só busca tarefas depois que projetos e clientes foram carregados
    if (!projectsLoading && !clientsLoading) {
      fetchTasksData();
    }
  }, [toast, user?.id, projectsLoading, clientsLoading]);

  useEffect(() => {
    if (!user) {
      setPlaybooks(initialPlaybooks);
      return;
    }

    const fetchPlaybooks = async () => {
      try {
        const data = await listPlaybooks();
        setPlaybooks(data.map(mapSupabasePlaybook));
      } catch (error) {
        const message = (error as Error).message || "Não foi possível carregar os playbooks";
        toast({
          title: "Erro ao carregar playbooks",
          description: message,
          variant: "destructive",
        });
        setPlaybooks(initialPlaybooks);
      }
    };

    fetchPlaybooks();
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchExpenses = async () => {
      try {
        const data = await listExpenses();
        setExpenses(data.map(mapSupabaseExpense));
      } catch (error) {
        const message = (error as Error).message || "Não foi possível carregar as despesas";
        if (isMissingExpensesTableMessage(message)) {
          setExpenses([]);
          return;
        }
        toast({
          title: "Erro ao carregar despesas",
          description: message,
          variant: "destructive",
        });
      }
    };

    fetchExpenses();
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      setEmployees([]);
      return;
    }

    const fetchEmployees = async () => {
      try {
        const data = await listEmployees();
        setEmployees(data.map(mapSupabaseEmployee));
      } catch (error) {
        const message = (error as Error).message || "Não foi possível carregar os colaboradores";
        toast({
          title: "Erro ao carregar colaboradores",
          description: message,
          variant: "destructive",
        });
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, [toast, user]);

  // Fetch indicators from Supabase
  useEffect(() => {
    if (!user) {
      setIndicators([]);
      return;
    }

    const fetchIndicatorsData = async () => {
      try {
        const data = await listIndicators();
        setIndicators(data.map(mapSupabaseIndicatorToLegacy));
      } catch (error) {
        console.error("Error fetching indicators:", error);
        setIndicators([]);
      }
    };

    fetchIndicatorsData();
  }, [user]);

  // Fetch leads from Supabase
  useEffect(() => {
    if (!user) {
      setLeads([]);
      return;
    }

    const fetchLeadsData = async () => {
      try {
        const data = await listLeads();
        setLeads(data.map(mapSupabaseLeadToLegacy));
      } catch (error) {
        console.error("Error fetching leads:", error);
        setLeads([]);
      }
    };

    fetchLeadsData();
  }, [user]);

  // Fetch deliverables from Supabase
  useEffect(() => {
    if (!user) {
      setDeliverables([]);
      return;
    }

    const fetchDeliverablesData = async () => {
      try {
        const data = await listDeliverables();
        setDeliverables(data.map(mapSupabaseDeliverableToLegacy));
      } catch (error) {
        console.error("Error fetching deliverables:", error);
        setDeliverables([]);
      }
    };

    fetchDeliverablesData();
  }, [user]);


  // Fetch content items from Supabase
  useEffect(() => {
    if (!user) {
      setContentItems([]);
      return;
    }

    const fetchContentItemsData = async () => {
      try {
        const data = await listContentItems();
        setContentItems(data.map(mapSupabaseContentItemToLegacy));
      } catch (error) {
        console.error("Error fetching content items:", error);
        setContentItems([]);
      }
    };

    fetchContentItemsData();
  }, [user]);

  // Fetch contracts from Supabase
  useEffect(() => {
    if (!user) {
      setContracts([]);
      return;
    }

    const fetchContractsData = async () => {
      try {
        const data = await listContracts();
        setContracts(data.map(mapSupabaseContractToLegacy));
      } catch (error) {
        console.error("Error fetching contracts:", error);
        setContracts([]);
      }
    };

    fetchContractsData();
  }, [user]);

  // Fetch client contacts from Supabase
  useEffect(() => {
    if (!user) {
      setClientContacts([]);
      return;
    }

    const fetchClientContactsData = async () => {
      try {
        const data = await listClientContacts();
        setClientContacts(data.map(mapSupabaseClientContactToLegacy));
      } catch (error) {
        console.error("Error fetching client contacts:", error);
        setClientContacts([]);
      }
    };

    fetchClientContactsData();
  }, [user]);

  // Fetch audit logs from Supabase
  useEffect(() => {
    if (!user) {
      setProjectAuditLogs([]);
      return;
    }

    const fetchAuditLogsData = async () => {
      try {
        const data = await listAuditLogs();
        setProjectAuditLogs(data.map(mapSupabaseAuditLogToLegacy));
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        setProjectAuditLogs([]);
      }
    };

    fetchAuditLogsData();
  }, [user]);

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
    if (!user) {
      setDiagnostics([]);
      return;
    }

    try {
      const data = await listDiagnostics();
      const mapped = data.map(mapSupabaseDiagnosticToLegacy).map(normalizeDiagnostic);
      setDiagnostics(mapped);
    } catch (error) {
      const message = (error as Error).message || "Não foi possível carregar os diagnósticos";
      toast({
        title: "Erro ao carregar diagnósticos",
        description: message,
        variant: "destructive",
      });
      setDiagnostics([]);
    }
  }, [setDiagnostics, toast, user]);

  const refreshTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);

    try {
      const data = await fetchTemplates();
      setTemplates(data.map(normalizeTemplate));
    } catch (error) {
      console.error(error);
      setTemplatesError((error as Error).message || "Não foi possível carregar os templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    refreshDiagnostics();
  }, [refreshDiagnostics]);

  const handleApplyDiagnostic = useCallback(
    async (diagnostic: ApplyDiagnosticInput) => {
      const template = templates.find((item) => item.id === diagnostic.templateId);
      const created = await applyDiagnosticMock({
        ...diagnostic,
        templateQuestionCount: diagnostic.templateQuestionCount ?? template?.questionCount,
        templateName: diagnostic.templateName || template?.name || diagnostic.templateId,
      });
      const normalized = normalizeDiagnostic({ ...created, templateSnapshot: template });

      try {
        const payload = buildSupabaseDiagnosticInsert(normalized);
        const stored = await createSupabaseDiagnostic(payload);
        const mapped = normalizeDiagnostic(mapSupabaseDiagnosticToLegacy(stored));
        setDiagnostics((prev) => [...prev, mapped]);
        return mapped;
      } catch (error) {
        const message = (error as Error).message || "Erro ao aplicar diagnóstico";
        toast({
          title: "Não foi possível aplicar o diagnóstico",
          description: message,
          variant: "destructive",
        });

        throw error;
      }
    },
    [setDiagnostics, templates, toast]
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

      try {
        const payload = buildSupabaseDiagnosticInsert(normalized);
        const stored = await createSupabaseDiagnostic(payload);
        const mapped = normalizeDiagnostic(mapSupabaseDiagnosticToLegacy(stored));
        setDiagnostics((prev) => [...prev, mapped]);
        return mapped;
      } catch (error) {
        const message = (error as Error).message || "Erro ao duplicar diagnóstico";
        toast({
          title: "Não foi possível duplicar o diagnóstico",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    [setDiagnostics, toast]
  );

  const createActionPlan = useCallback(
    async ({ diagnostic, actionPlan }: { diagnostic: Diagnostic; actionPlan: ActionPlan }) => {
      const existingActionIds = new Set(
        tasks
          .filter(
            (task) =>
              task.sourceDiagnosticId === diagnostic.id && typeof task.sourceActionId === "string"
          )
          .map((task) => task.sourceActionId as string)
      );

      const newTasks = actionPlan.actions
        .filter((action) => !existingActionIds.has(action.id))
        .map((action) => {
          const priority = mapActionPriorityToTask(action.priority);
          return {
            title: action.title,
            description: action.description,
            projectId: diagnostic.projectId,
            projectName: diagnostic.projectName,
            clientId: diagnostic.clientId,
            clientName: diagnostic.clientName,
            type: "processo",
            responsible: currentUserName,
            priority,
            dueDate: action.dueDate,
            impact: `Impacto ${action.impact}`,
            status: initialStatusFromPriority(priority),
            taskType: "project" as const,
            assignedTo: user?.id || "",
            createdBy: user?.id,
            checklist: [],
            evidenceRequired: false,
            sourceDiagnosticId: diagnostic.id,
            sourceActionId: action.id,
            what: action.what || action.title,
            why: action.why || action.positiveImpact?.expectedBenefit,
            where: action.where || diagnostic.projectName,
            when: action.when || action.dueDate,
            who: action.who || action.responsible,
            how: action.how || action.description,
            howMuch:
              action.howMuch ||
              action.positiveImpact?.estimatedCostOrTime ||
              action.negativeImpact?.estimatedCostOrTime,
          } as Omit<Task, "id" | "createdAt">;
        });

      if (newTasks.length === 0) return [];

      const createdRows = await createTasksBatch(newTasks.map(buildSupabaseTaskInsert));
      const normalizedTasks = createdRows.map((row) =>
        mapSupabaseTaskToLegacy(row, diagnostic.projectName, diagnostic.clientName)
      );
      tasksLoadVersionRef.current += 1;
      setTasksLoading(false);
      tasksRef.current = [...tasksRef.current, ...normalizedTasks];
      setTasks((prev) => [...prev, ...normalizedTasks]);
      return normalizedTasks;
    },
    [currentUserName, tasks, user?.id]
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
    setProjects((prev) => {
      let changed = false;
      const next = prev.map((project) => {
        const { project: nextProject, statusOverrideExpired } = computeProjectWithDerivedState(project);
        const derivedLogs = deriveAuditLogs(project, nextProject, { statusOverrideExpired });
        if (derivedLogs.length) {
          auditEntries.push(...derivedLogs);
        }
        const derivedChanged =
          project.responsible !== nextProject.responsible
          || project.responsibleAvatarUrl !== nextProject.responsibleAvatarUrl
          || project.progress !== nextProject.progress
          || project.progressSource !== nextProject.progressSource
          || project.status !== nextProject.status
          || project.statusReason !== nextProject.statusReason
          || project.statusSource !== nextProject.statusSource
          || project.statusOverrideEnabled !== nextProject.statusOverrideEnabled
          || project.statusOverrideValue !== nextProject.statusOverrideValue
          || project.statusOverrideExpiresAt !== nextProject.statusOverrideExpiresAt;
        if (!derivedChanged) return project;
        changed = true;
        return nextProject;
      });
      return changed ? next : prev;
    });

    if (auditEntries.length > 0) {
      setProjectAuditLogs((prev) => [...prev, ...auditEntries]);
    }
  }, [computeProjectWithDerivedState, deriveAuditLogs, setProjectAuditLogs, setProjects]);

  const value: DataContextType = {
    clients,
    clientsLoading,
    clientsError,
    addClient: async (client) => {
      const payload = buildSupabaseClientInsert(client);

      try {
        const created = await createSupabaseClient(payload);
        const normalized = normalizeClient({ ...client, ...mapSupabaseClientToLegacy(created) });
        setClients((prev) => [...prev, normalized]);
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar cliente";
        toast({
          title: "Não foi possível criar o cliente",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    updateClient: async (id, client) => {
      const payload = buildSupabaseClientUpdate(client);

      try {
        const updated = await updateSupabaseClient(id, payload);
        let normalized: Client | undefined;

        setClients((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            normalized = normalizeClient({ ...c, ...client, ...mapSupabaseClientToLegacy(updated) });
            return normalized;
          })
        );

        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao atualizar cliente";
        toast({
          title: "Não foi possível atualizar o cliente",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    deleteClient: async (id) => {
      try {
        await deleteSupabaseClient(id);
        setClients((prev) => prev.filter((c) => c.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover cliente";
        toast({
          title: "Não foi possível remover o cliente",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },

    projects,
    projectsLoading,
    projectsError,
    addProject: async (project, options) => {
      try {
        const payload = buildSupabaseProjectInsert(project, project.clientId);
        const created = await createSupabaseProject(payload);
        
        const client = clients.find((c) => c.id === project.clientId);
        const clientName = client?.nomeFantasia || client?.razaoSocial || project.clientName || "";
        
        const baseProject = normalizeProject({
          ...mapSupabaseProjectToLegacy(created),
          clientName,
          responsibleUserId: project.responsibleUserId,
          responsibleNameLegacy: project.responsibleNameLegacy,
          ...project,
          id: created.id,
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
            projectId: created.id,
            projectName: newProject.name,
            clientId: newProject.clientId,

            clientName: newProject.clientName,
          });

          if (seededTasks.length) {
            // Salva tarefas no banco com 5W2H preenchido
            const taskPayloads = seededTasks.map((task) => buildSupabaseTaskInsert({ ...task, responsible: currentUserName, taskType: "project", assignedTo: user?.id || "", createdBy: user?.id || "" }));
            try {
              const createdTasks = await createTasksBatch(taskPayloads);
              const normalizedTasks = createdTasks.map((task) => 
                mapSupabaseTaskToLegacy(task, newProject.name, newProject.clientName)
              );
              tasksLoadVersionRef.current += 1;
              setTasksLoading(false);
              tasksRef.current = [...tasksRef.current, ...normalizedTasks];
              setTasks((prev) => [...prev, ...normalizedTasks]);
            } catch (error) {
              console.error("Erro ao criar tarefas:", error);
              toast({
                title: "Projeto criado sem tarefas iniciais",
                description: "As tarefas automáticas não foram persistidas. Tente criá-las novamente.",
                variant: "destructive",
              });
            }
          }
        }

        if (options?.opportunities?.length) {
          const prepared = options.opportunities.map((opportunity) =>
            normalizeOpportunity({
              ...opportunity,
              projectId: created.id,
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
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar projeto";
        toast({
          title: "Não foi possível criar o projeto",
          description: message,
          variant: "destructive",
        });
        throw new Error(message);
      }
    },
    updateProject: async (id, project) => {
      try {
        const payload = buildSupabaseProjectUpdate(project);
        await updateSupabaseProject(id, payload);

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
      } catch (error) {
        const message = (error as Error).message || "Erro ao atualizar projeto";
        toast({
          title: "Não foi possível atualizar o projeto",
          description: message,
          variant: "destructive",
        });
      }
    },
    deleteProject: async (id) => {
      try {
        await deleteSupabaseProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover projeto";
        toast({
          title: "Não foi possível remover o projeto",
          description: message,
          variant: "destructive",
        });
      }
    },

    tasks,
    tasksLoading,
    tasksError,
    savingTaskIds,
    addTask: async (task) => {
      try {
        const project = task.taskType === "project" ? projects.find((item) => item.id === task.projectId) : undefined;
        const client = project ? clients.find((item) => item.id === project.clientId) : undefined;
        const preparedTask = {
          ...task,
          assignedTo: task.assignedTo || user?.id,
          createdBy: task.createdBy || user?.id,
          projectId: project?.id || "",
          projectName: project?.name || "",
          clientId: client?.id || "",
          clientName: client?.nomeFantasia || client?.razaoSocial || client?.name || "",
        };
        const validationErrors = validateTask(preparedTask, projects);
        if (hasTaskValidationErrors(validationErrors)) {
          throw new Error(Object.values(validationErrors)[0]);
        }
        const payload = buildSupabaseTaskInsert(preparedTask);
        const created = await createSupabaseTask(payload);
        const normalized = mapSupabaseTaskToLegacy(
          created,
          preparedTask.projectName,
          preparedTask.clientName
        );
        tasksLoadVersionRef.current += 1;
        setTasksLoading(false);
        tasksRef.current = [...tasksRef.current, normalized];
        setTasks((prev) => [...prev, normalized]);
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar tarefa";
        toast({
          title: "Não foi possível criar a tarefa",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    updateTask: async (id, task, options) => {
      if (savingTaskIdsRef.current.has(id)) {
        throw new Error("Esta tarefa já está sendo salva.");
      }
      const current = tasksRef.current.find((item) => item.id === id);
      if (!current) throw new Error("Tarefa não encontrada.");
      assertExpectedTaskStatus(current, options?.expectedStatus);

      savingTaskIdsRef.current.add(id);
      tasksLoadVersionRef.current += 1;
      setTasksLoading(false);
      setSavingTaskIds(Array.from(savingTaskIdsRef.current));
      let optimisticTask = current;
      try {
        const completionPatch: Partial<Task> = task.status === "done" && current?.status !== "done"
          ? { previousStatus: current?.status || "backlog", completedAt: new Date().toISOString(), completedBy: user?.id }
          : current?.status === "done" && task.status && task.status !== "done"
            ? { completedAt: "", completedBy: "" }
            : {};
        const nextTask = { ...task, ...completionPatch };
        optimisticTask = { ...current, ...nextTask };
        const validationErrors = validateTask(optimisticTask, projects);
        if (hasTaskValidationErrors(validationErrors)) throw new Error(Object.values(validationErrors)[0]);

        tasksRef.current = tasksRef.current.map((item) => item.id === id ? optimisticTask : item);
        setTasks((previous) => previous.map((item) => item.id === id ? optimisticTask : item));
        const payload = buildSupabaseTaskUpdate(nextTask);
        const stored = await updateSupabaseTask(id, payload, current.updatedAt);
        const persistedTask = mapSupabaseTaskToLegacy(stored, optimisticTask.projectName, optimisticTask.clientName);
        tasksRef.current = tasksRef.current.map((item) => item.id === id ? persistedTask : item);
        setTasks((previous) => previous.map((item) => item.id === id ? persistedTask : item));
        return persistedTask;
      } catch (error) {
        tasksRef.current = tasksRef.current.map((item) => item.id === id ? current : item);
        setTasks((previous) => previous.map((item) => item.id === id ? current : item));
        const message = (error as Error).message || "Erro ao atualizar tarefa";
        toast({
          title: "Não foi possível atualizar a tarefa",
          description: message,
          variant: "destructive",
        });
        throw error;
      } finally {
        savingTaskIdsRef.current.delete(id);
        setSavingTaskIds(Array.from(savingTaskIdsRef.current));
      }
    },
    deleteTask: async (id) => {
      try {
        await deleteSupabaseTask(id);
        tasksLoadVersionRef.current += 1;
        setTasksLoading(false);
        tasksRef.current = tasksRef.current.filter((task) => task.id !== id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover tarefa";
        toast({
          title: "Não foi possível remover a tarefa",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },


    deliverables,
    addDeliverable: (deliverable) => {
      const newDeliverable = { ...deliverable, id: generateId(), createdAt: getDate() };
      
      void (async () => {
        try {
          const payload = {
            project_id: newDeliverable.projectId,
            title: newDeliverable.title,
            description: null,
            status: newDeliverable.status,
            due_date: toSupabaseDate(newDeliverable.dueDate),
          };
          const created = await createSupabaseDeliverable(payload);
          setDeliverables((prev) => prev.map((d) => d.id === newDeliverable.id ? mapSupabaseDeliverableToLegacy(created) : d));
        } catch (error) {
          console.error("Error creating deliverable:", error);
        }
      })();

      setDeliverables((prev) => [...prev, newDeliverable]);
    },
    updateDeliverable: (id, deliverable) => {
      setDeliverables((prev) => prev.map((d) => (d.id === id ? { ...d, ...deliverable } : d)));
      
      void (async () => {
        try {
          const payload: Record<string, unknown> = {};
          if (deliverable.title !== undefined) payload.title = deliverable.title;
          if (deliverable.status !== undefined) payload.status = deliverable.status;
          if (deliverable.dueDate !== undefined) payload.due_date = toSupabaseDate(deliverable.dueDate);
          await updateSupabaseDeliverable(id, payload);
        } catch (error) {
          console.error("Error updating deliverable:", error);
        }
      })();
    },
    deleteDeliverable: (id) => {
      setDeliverables((prev) => prev.filter((d) => d.id !== id));
      void deleteSupabaseDeliverable(id).catch((e) => console.error("Error deleting deliverable:", e));
    },

    meetings,
    addMeeting: (meeting) =>
      setMeetings((prev) => [...prev, { ...meeting, id: generateId(), createdAt: getDate() }]),
    updateMeeting: (id, meeting) =>
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...meeting } : m))),
    deleteMeeting: (id) => setMeetings((prev) => prev.filter((m) => m.id !== id)),

    indicators,
    addIndicator: (indicator) => {
      const newIndicator = { ...indicator, id: generateId(), createdAt: getDate() };
      
      void (async () => {
        try {
          const payload = {
            name: newIndicator.name,
            category: newIndicator.category || null,
            unit: newIndicator.unit || null,
            frequency: newIndicator.frequency || null,
            target_value: newIndicator.targetValue ?? null,
            current_value: newIndicator.currentValue ?? null,
            project_id: newIndicator.projectId || null,
            trend: newIndicator.trend || "stable",
          };
          const created = await createSupabaseIndicator(payload);
          setIndicators((prev) => prev.map((i) => i.id === newIndicator.id ? mapSupabaseIndicatorToLegacy(created) : i));
        } catch (error) {
          console.error("Error creating indicator:", error);
        }
      })();

      setIndicators((prev) => [...prev, newIndicator]);
    },
    updateIndicator: (id, indicator) => {
      setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, ...indicator } : i)));
      
      void (async () => {
        try {
          const payload: Record<string, unknown> = {};
          if (indicator.name !== undefined) payload.name = indicator.name;
          if (indicator.category !== undefined) payload.category = indicator.category;
          if (indicator.unit !== undefined) payload.unit = indicator.unit;
          if (indicator.frequency !== undefined) payload.frequency = indicator.frequency;
          if (indicator.targetValue !== undefined) payload.target_value = indicator.targetValue;
          if (indicator.currentValue !== undefined) payload.current_value = indicator.currentValue;
          if (indicator.trend !== undefined) payload.trend = indicator.trend;
          await updateSupabaseIndicator(id, payload);
        } catch (error) {
          console.error("Error updating indicator:", error);
        }
      })();
    },
    deleteIndicator: (id) => {
      setIndicators((prev) => prev.filter((i) => i.id !== id));
      void deleteSupabaseIndicator(id).catch((e) => console.error("Error deleting indicator:", e));
    },

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
    addPlaybook: (playbook) => {
      if (!user) {
        setPlaybooks((prev) => [...prev, { ...playbook, id: generateId(), createdAt: getDate() }]);
        return;
      }

      const payload = buildSupabasePlaybookInsert(playbook);

      void (async () => {
        try {
          const created = await createPlaybook(payload);
          setPlaybooks((prev) => [...prev, mapSupabasePlaybook(created)]);
        } catch (error) {
          const message = (error as Error).message || "Erro ao salvar playbook";
          toast({
            title: "Não foi possível criar o playbook",
            description: message,
            variant: "destructive",
          });
        }
      })();
    },
    updatePlaybook: (id, playbook) => {
      if (!user) {
        setPlaybooks((prev) => prev.map((p) => (p.id === id ? { ...p, ...playbook } : p)));
        return;
      }

      const existing = playbooks.find((item) => item.id === id);
      if (!existing) return;
      const merged = { ...existing, ...playbook };
      const payload = buildSupabasePlaybookUpdate(merged);

      void (async () => {
        try {
          const updated = await updatePlaybookRecord(id, payload);
          setPlaybooks((prev) => prev.map((item) => (item.id === id ? mapSupabasePlaybook(updated) : item)));
        } catch (error) {
          const message = (error as Error).message || "Erro ao atualizar playbook";
          toast({
            title: "Não foi possível atualizar o playbook",
            description: message,
            variant: "destructive",
          });
        }
      })();
    },
    deletePlaybook: (id) => {
      if (!user) {
        setPlaybooks((prev) => prev.filter((p) => p.id !== id));
        return;
      }

      void (async () => {
        try {
          await deletePlaybookRecord(id);
          setPlaybooks((prev) => prev.filter((p) => p.id !== id));
        } catch (error) {
          const message = (error as Error).message || "Erro ao remover playbook";
          toast({
            title: "Não foi possível remover o playbook",
            description: message,
            variant: "destructive",
          });
        }
      })();
    },

    employees,
    addEmployee: async (employee) => {
      const payload = buildSupabaseEmployeeInsert(employee, user?.id);

      try {
        const created = await createSupabaseEmployee(payload);
        const normalized = mapSupabaseEmployee(created);
        setEmployees((prev) => [...prev, normalized]);
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar colaborador";
        toast({
          title: "Não foi possível criar o colaborador",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    updateEmployee: async (id, employee) => {
      const payload = buildSupabaseEmployeeUpdate(employee);


      try {
        const updated = await updateSupabaseEmployee(id, payload);
        let normalized: Employee | undefined;

        setEmployees((prev) =>
          prev.map((e) => {
            if (e.id !== id) return e;
            normalized = { ...e, ...mapSupabaseEmployee(updated) };
            return normalized;
          })
        );

        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao atualizar colaborador";
        toast({
          title: "Não foi possível atualizar o colaborador",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    deleteEmployee: async (id) => {
      try {
        await deleteSupabaseEmployee(id);
        setEmployees((prev) => prev.filter((e) => e.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover colaborador";
        toast({
          title: "Não foi possível remover o colaborador",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },

    leads,
    addLead: async (lead) => {
      const payload = {
        name: lead.contact,
        company: lead.company || null,
        email: lead.email || null,
        phone: lead.phone || null,
        source: lead.source || null,
        status: lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : "Novo",
        notes: lead.notes || null,
        value: lead.value || 0,
        next_action: lead.nextAction || null,
        next_action_date: lead.nextActionDate || null,
      };

      try {
        const created = await createSupabaseLead(payload as Parameters<typeof createSupabaseLead>[0]);
        const normalized = mapSupabaseLeadToLegacy(created);
        setLeads((prev) => [...prev, normalized]);
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar lead";
        toast({
          title: "Não foi possível criar o lead",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    updateLead: async (id, lead) => {
      const payload: Record<string, unknown> = {};
      if (lead.contact !== undefined) payload.name = lead.contact;
      if (lead.company !== undefined) payload.company = lead.company;
      if (lead.email !== undefined) payload.email = lead.email;
      if (lead.phone !== undefined) payload.phone = lead.phone;
      if (lead.source !== undefined) payload.source = lead.source;
      if (lead.status !== undefined) payload.status = lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : null;
      if (lead.notes !== undefined) payload.notes = lead.notes;
      if (lead.value !== undefined) payload.value = lead.value;
      if (lead.nextAction !== undefined) payload.next_action = lead.nextAction;
      if (lead.nextActionDate !== undefined) payload.next_action_date = lead.nextActionDate || null;

      try {
        const updated = await updateSupabaseLead(id, payload);
        let normalized: Lead | undefined;
        setLeads((prev) =>
          prev.map((l) => {
            if (l.id !== id) return l;
            normalized = { ...l, ...mapSupabaseLeadToLegacy(updated) };
            return normalized;
          })
        );
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao atualizar lead";
        toast({
          title: "Não foi possível atualizar o lead",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    deleteLead: async (id) => {
      try {
        await deleteSupabaseLead(id);
        setLeads((prev) => prev.filter((l) => l.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover lead";
        toast({
          title: "Não foi possível remover o lead",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },

    templates,
    templatesLoading,
    templatesError,
    addTemplate: async (template) => {
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        const created = await createTemplate(template);
        const normalized = normalizeTemplate(created);
        setTemplates((prev) => [...prev, normalized]);
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar template";
        setTemplatesError(message);
        throw error;
      } finally {
        setTemplatesLoading(false);
      }
    },
    updateTemplate: async (id, template) => {
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        const updated = await updateTemplateRecord(id, template);
        const normalized = normalizeTemplate(updated);
        setTemplates((prev) => prev.map((item) => (item.id === id ? normalized : item)));
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao atualizar template";
        setTemplatesError(message);
        throw error;
      } finally {
        setTemplatesLoading(false);
      }
    },
    deleteTemplate: async (id) => {
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        await deleteTemplateRecord(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover template";
        setTemplatesError(message);
        throw error;
        setTemplatesError(message);
        throw error;
      } finally {
        setTemplatesLoading(false);
      }
    },

    diagnostics,
    addDiagnostic: async (diagnostic) => {
      const normalized = normalizeDiagnostic({ ...diagnostic, id: generateId(), createdAt: getDate(), updatedAt: getDate() });

      try {
        const payload = buildSupabaseDiagnosticInsert(normalized);
        const stored = await createSupabaseDiagnostic(payload);
        const mapped = normalizeDiagnostic(mapSupabaseDiagnosticToLegacy(stored));
        setDiagnostics((prev) => [...prev, mapped]);
        return mapped;
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar diagnóstico";
        toast({
          title: "Não foi possível criar o diagnóstico",
          description: message,
          variant: "destructive",
        });
        return undefined;
      }
    },
    updateDiagnostic: async (id, diagnostic) => {
      try {
        const payload = buildSupabaseDiagnosticUpdate(diagnostic);
        const stored = await updateSupabaseDiagnostic(id, payload);
        const mapped = normalizeDiagnostic(mapSupabaseDiagnosticToLegacy(stored));
        setDiagnostics((prev) => prev.map((d) => (d.id === id ? mapped : d)));
        return mapped;
      } catch (error) {

        const message = (error as Error).message || "Erro ao atualizar diagnóstico";
        toast({
          title: "Não foi possível atualizar o diagnóstico",
          description: message,
          variant: "destructive",
        });
        return undefined;
      }
    },
    deleteDiagnostic: async (id) => {
      try {
        await deleteSupabaseDiagnostic(id);
        setDiagnostics((prev) => prev.filter((d) => d.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover diagnóstico";
        toast({
          title: "Não foi possível remover o diagnóstico",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    refreshDiagnostics,
    refreshTemplates,
    applyDiagnostic: handleApplyDiagnostic,
    duplicateDiagnostic: handleDuplicateDiagnostic,
    createActionPlan,

    contentItems,
    addContentItem: async (item) => {
      const payload = {
        title: item.title,
        type: item.type || null,
        status: item.status || "idea",
        scheduled_date: toSupabaseDate(item.publishDate),
        tags: item.tags || [],
      };

      try {
        const created = await createSupabaseContentItem(payload);
        const normalized = mapSupabaseContentItemToLegacy(created);
        setContentItems((prev) => [...prev, normalized]);
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar conteúdo";
        toast({
          title: "Não foi possível criar o conteúdo",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    updateContentItem: async (id, item) => {
      const payload: Record<string, unknown> = {};
      if (item.title !== undefined) payload.title = item.title;
      if (item.type !== undefined) payload.type = item.type;
      if (item.status !== undefined) payload.status = item.status;
      if (item.publishDate !== undefined) payload.scheduled_date = toSupabaseDate(item.publishDate);
      if (item.tags !== undefined) payload.tags = item.tags;

      try {
        const updated = await updateSupabaseContentItem(id, payload);
        let normalized: ContentItem | undefined;
        setContentItems((prev) =>
          prev.map((i) => {
            if (i.id !== id) return i;
            normalized = { ...i, ...mapSupabaseContentItemToLegacy(updated) };
            return normalized;
          })
        );
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao atualizar conteúdo";
        toast({
          title: "Não foi possível atualizar o conteúdo",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    deleteContentItem: async (id) => {
      try {
        await deleteSupabaseContentItem(id);
        setContentItems((prev) => prev.filter((i) => i.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover conteúdo";
        toast({
          title: "Não foi possível remover o conteúdo",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },

    contracts,
    addContract: async (contract) => {
      const newContract = { ...contract, id: generateId(), createdAt: getDate() };
      const payload = {
        title: newContract.projectName || "Contrato",
        client_id: newContract.clientId || null,
        project_id: newContract.projectId || null,
        value: newContract.value || null,
        start_date: toSupabaseDate(newContract.startDate),
        end_date: toSupabaseDate(newContract.endDate),
        status: "ativo",
        billing_type: newContract.billingType || null,
        installments: newContract.installments || [],
      };

      try {
        const created = mapSupabaseContractToLegacy(await createSupabaseContract(payload));
        setContracts((prev) => [...prev, created]);
        return created;
      } catch (error) {
        console.error("Error creating contract:", error);
        throw error;
      }
    },
    updateContract: (id, contract) => {
      setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...contract } : c)));
      
      void (async () => {
        try {
          const payload: Record<string, unknown> = {};
          if (contract.value !== undefined) payload.value = contract.value;
          if (contract.startDate !== undefined) payload.start_date = toSupabaseDate(contract.startDate);
          if (contract.endDate !== undefined) payload.end_date = toSupabaseDate(contract.endDate);
          if (contract.billingType !== undefined) payload.billing_type = contract.billingType;
          if (contract.installments !== undefined) payload.installments = contract.installments;
          await updateSupabaseContract(id, payload);
        } catch (error) {
          console.error("Error updating contract:", error);
        }
      })();
    },
    deleteContract: (id) => {
      setContracts((prev) => prev.filter((c) => c.id !== id));
      void deleteSupabaseContract(id).catch((e) => console.error("Error deleting contract:", e));
    },

    expenses,
    addExpense: async (expense) => {
      if (!user) {
        const created = { ...expense, id: generateId(), createdAt: getDate() };
        setExpenses((prev) => [...prev, created]);
        return created;
      }

      const payload = buildSupabaseExpenseInsert(expense);

      try {
        const created = await createSupabaseExpense(payload);
        const normalized = mapSupabaseExpense(created);
        setExpenses((prev) => [...prev, normalized]);
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao criar despesa";
        toast({
          title: "Não foi possível criar a despesa",
          description: message,
          variant: "destructive",
        });
        return undefined;
      }
    },
    updateExpense: async (id, expense) => {
      if (!user) {
        let updated: Expense | undefined;
        setExpenses((prev) =>
          prev.map((e) => {
            if (e.id !== id) return e;
            updated = { ...e, ...expense };
            return updated;
          })
        );
        return updated;
      }

      const payload = buildSupabaseExpenseUpdate(expense);

      try {
        const updated = await updateSupabaseExpense(id, payload);
        const normalized = mapSupabaseExpense(updated);
        setExpenses((prev) => prev.map((e) => (e.id === id ? normalized : e)));
        return normalized;
      } catch (error) {
        const message = (error as Error).message || "Erro ao atualizar despesa";
        toast({
          title: "Não foi possível atualizar a despesa",
          description: message,
          variant: "destructive",
        });
        return undefined;
      }

    },
    deleteExpense: async (id) => {
      if (!user) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        return;
      }

      try {
        await deleteSupabaseExpense(id);
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } catch (error) {
        const message = (error as Error).message || "Erro ao remover despesa";
        toast({
          title: "Não foi possível remover a despesa",
          description: message,
          variant: "destructive",
        });
      }
    },

    projectAuditLogs,
    addProjectAuditLog: (entry) => {
      const newEntry = { ...entry, id: generateId(), createdAt: getDate() };
      
      void (async () => {
        try {
          const payload = {
            project_id: newEntry.projectId || null,
            action: newEntry.message,
            user_name: currentUserName,
            user_id: user?.id || null,
          };
          await createSupabaseAuditLog(payload);
        } catch (error) {
          console.error("Error creating audit log:", error);
        }
      })();

      setProjectAuditLogs((prev) => [...prev, newEntry]);
      return newEntry;
    },

    clientContacts,
    addClientContact: (contact) => {
      const newContact = { ...contact, id: generateId() };
      
      void (async () => {
        try {
          const payload = {
            client_id: newContact.clientId,
            name: newContact.name,
            role: newContact.role || null,
            email: newContact.email || null,
            phone: newContact.phone || null,
            is_primary: newContact.hasPortalAccess || false,
          };
          const created = await createSupabaseClientContact(payload);
          setClientContacts((prev) => prev.map((c) => c.id === newContact.id ? mapSupabaseClientContactToLegacy(created) : c));
        } catch (error) {
          console.error("Error creating client contact:", error);
        }
      })();

      setClientContacts((prev) => [...prev, newContact]);
      return newContact;
    },
    updateClientContact: (id, contact) => {
      setClientContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...contact } : c)));
      
      void (async () => {
        try {
          const payload: Record<string, unknown> = {};
          if (contact.name !== undefined) payload.name = contact.name;
          if (contact.role !== undefined) payload.role = contact.role;
          if (contact.email !== undefined) payload.email = contact.email;
          if (contact.phone !== undefined) payload.phone = contact.phone;
          if (contact.hasPortalAccess !== undefined) payload.is_primary = contact.hasPortalAccess;
          await updateSupabaseClientContact(id, payload);
        } catch (error) {
          console.error("Error updating client contact:", error);
        }
      })();
    },
    deleteClientContact: (id) => {
      setClientContacts((prev) => prev.filter((c) => c.id !== id));
      void deleteSupabaseClientContact(id).catch((e) => console.error("Error deleting client contact:", e));
    },
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
