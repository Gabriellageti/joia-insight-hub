
import type { ProjectType } from "@/lib/project-delivery";

// Types for JoIA Ops

export interface ClientContactInfo {
  nome: string;
  whatsapp?: string;
  email?: string;
}

export interface ClientAddress {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface ClientRelationshipPreferences {
  diaReuniao?: string;
  frequencia?: "semanal" | "quinzenal" | "mensal";
}

export interface Client {
  id: string;

  // Estrutura atual (padrão)
  razaoSocial: string;
  nomeFantasia?: string;
  /** Compatibilidade com cadastros legados */
  name?: string;
  tradeName?: string;
  cnpj?: string;
  segmentoTags: string[];
  status: "ativo" | "inativo";
  contatoPrincipal: ClientContactInfo;
  endereco: ClientAddress;
  observacoesInternas?: string;
  preferenciasRelacionamento: ClientRelationshipPreferences;

  projects: number;
  nps: number;
  risk: "low" | "medium" | "high";
  lastContact: string;
  createdAt: string;

  // Campos legados (compatibilidade)
  segment?: string;
  city?: string;
  address?: ClientAddress | string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  preferredMeetingDay?: string;
  followUpFrequency?: "semanal" | "quinzenal" | "mensal";
  whatsapp?: string;
  email?: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  role: string;
  area: "Compras" | "Vendas" | "Financeiro" | "Administrativo" | "Diretoria";
  phone?: string;
  email?: string;
  hasPortalAccess: boolean;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  objective?: string;
  scope?: string;
  phase: string;
  projectType?: ProjectType;
  progress: number;
  progressSource?: "calculated" | "manual";
  progressOverrideEnabled: boolean;
  manualProgress: number | null;
  progressJustification?: string;
  status: "green" | "yellow" | "red";
  statusReason?: string;
  statusSource?: "calculated" | "manual";
  statusOverrideEnabled?: boolean;
  statusOverrideValue?: "green" | "yellow" | "red" | null;
  statusOverrideJustification?: string;
  statusOverrideExpiresAt?: string;
  statusOverrideAuthor?: string;
  responsibleUserId?: string | null;
  responsibleNameLegacy?: string;
  responsibleAvatarUrl?: string;
  responsible: string;
  startDate: string;
  endDate: string;
  forecastEndDate?: string;
  estimatedDuration?: "2w" | "4w" | "8w" | "3m" | "6m" | "manual" | null;
  forecastAdjustedManually?: boolean;
  legacyOpportunityMigrated?: boolean;
  moneyHypothesis?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  projectId: string;
  clientId: string;
  status: "Identificado" | "Em validação" | "Em execução" | "Resgatado";
  type: "Receita incremental" | "Redução de custos" | "Eficiência operacional" | "Risco evitado" | "Outro";
  description: string;
  estimatedValue?: number | null;
  confidence: "baixa" | "media" | "alta";
  evidenceType: "a_coletar" | "upload";
  evidenceReference?: string;
  responsibleUserId?: string | null;
  createdAt: string;
  updatedAt?: string;
  source?: "manual" | "legacy";
}

export interface ProjectDeliverable {
  id: string;
  projectId: string;
  title: string;
  status: "pending" | "in_progress" | "done";
  dueDate?: string;
  description?: string;
  responsibleUserId?: string;
  responsibleName?: string;
  itemType?: "deliverable" | "milestone";
  createdAt: string;
}

export interface ProjectAuditLogEntry {
  id: string;
  projectId: string;
  message: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  type: "processo" | "financeiro" | "tecnologia" | "treinamento" | "compras" | "vendas";
  responsible: string;
  priority: "low" | "medium" | "high" | "urgent";
  taskType?: "personal" | "client" | "project";
  assignedTo?: string;
  startDate?: string;
  dueDate: string;
  impact?: string;
  status: "not_started" | "in_progress" | "waiting" | "blocked" | "done";
  checklist?: { id: string; text: string; completed: boolean }[];
  evidenceRequired: boolean;
  evidenceFile?: string;
  what?: string;
  why?: string;
  where?: string;
  when?: string;
  who?: string;
  how?: string;
  howMuch?: string;
  createdAt: string;
  updatedAt?: string;
  sourceDiagnosticId?: string;
  sourceActionId?: string;
  sourceMeetingId?: string;
  sourceDecisionId?: string;
  sourceNextStepId?: string;
  consultingDay?: number;
  createdBy?: string;
  completedAt?: string;
  completedBy?: string;
  previousStatus?: Task["status"];
  observations?: string;
  blockReason?: string;
  blockReasonCategory?: "client" | "dependency" | "decision" | "resource" | "technical" | "other";
  blockedAt?: string;
}

export interface ConsultingDayPlan {
  id: string;
  projectId: string;
  dayNumber: number;
  theme: string;
  objective: string;
  expectedDecisions: string[];
  meetingDate?: string;
}

export type ActionPriority = "alta" | "media" | "baixa";
export type ActionImpact = "alto" | "medio" | "baixo";

export interface ImpactProjection {
  expectedBenefit: string;
  avoidedRisk: string;
  estimatedCostOrTime?: string;
}

export interface ActionRecommendation {
  id: string;

  title: string;
  description: string;
  priority: ActionPriority;
  impact: ActionImpact;
  positiveImpact: ImpactProjection;
  negativeImpact: ImpactProjection;
  responsible: string;
  dueDate: string;
  what?: string;
  why?: string;
  where?: string;
  when?: string;
  who?: string;
  how?: string;
  howMuch?: string;
  relatedQuestionId?: string;
  rationale?: string;
}

export interface ActionPlan {
  title: string;
  description: string;
  generatedAt: string;
  positiveImpact: ImpactProjection;
  negativeImpact: ImpactProjection;
  actions: ActionRecommendation[];
}

export interface DiagnosticReportPayload {
  diagnosticId: string;
  generatedAt: string;
  score?: number;
  recommendations: ActionRecommendation[];
  actionPlanSummary?: {
    title: string;
    actions: number;
    taskIds: string[];
  };
}

export interface Diagnostic {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  templateId: string;
  templateName: string;
  status: "draft" | "in_progress" | "completed";
  progress: number;
  score?: number;
  opportunities: number;
  createdAt: string;
  updatedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  autoGenerateOpportunities?: boolean;
  responsibleName?: string;
  responsibleId?: string;
  hasResponses?: boolean;
  dueDate?: string;
  actionPlan?: ActionPlan;
  reportPayload?: DiagnosticReportPayload;
}

export interface AuditMetadata {
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export type DiagnosticTemplateStatus = "draft" | "published" | "archived";

export type DiagnosticQuestionType = "yes_no" | "scale" | "text" | "number" | "attachment" | "multiple_choice";
export type QuestionCriticality = "baixa" | "media" | "alta";

export type OpportunityRuleCondition =
  | { type: "yes_no"; expectedAnswer: "yes" | "no" }
  | { type: "scale"; minValue?: number | null; maxValue?: number | null }
  | { type: "number"; operator: ">" | ">=" | "<" | "<=" | "="; value?: number | null; unit?: "numero" | "moeda" | "percentual" }
  | { type: "multiple_choice"; matchingOptions?: string[]; matchStrategy?: "any" | "all" }
  | { type: "text"; keyword?: string }
  | { type: "always" };

export interface QuestionOption {
  label: string;
  weight?: number | null;
}

export interface TemplateOpportunityRule {
  id: string;
  name: string;
  description?: string;
  type: Opportunity["type"];
  estimatedValue?: number | null;
  confidence?: Opportunity["confidence"];
  evidenceType?: Opportunity["evidenceType"];
  enabled: boolean;
  autoGenerate: boolean;
  condition?: OpportunityRuleCondition;
  audit?: AuditMetadata;
}

export interface TemplateQuestion {
  id: string;
  title: string;
  description?: string;
  type: DiagnosticQuestionType;
  weight: number;
  criticality: QuestionCriticality;
  required: boolean;
  helperText?: string;
  placeholder?: string;
  order: number;
  includeInScore?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  unit?: string;
  options?: string[];
  optionsWithWeight?: QuestionOption[];
  regraOportunidade?: TemplateOpportunityRule;
  maxFileSizeMB?: number | null;
  allowedFileTypes?: string[];
  audit?: AuditMetadata;

  // Compatibilidade com contratos legados
  text?: string;
  critical?: boolean;
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  weight: number;
  questions: TemplateQuestion[];
  audit?: AuditMetadata;
}

export interface DiagnosticTemplate {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  status: DiagnosticTemplateStatus;
  version?: string;
  revision?: number;
  sections: TemplateSection[];
  questionCount?: number;
  sectionsCount?: number;
  estimatedTimeMinutes?: number | null;
  lastPublishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  audit?: AuditMetadata;
}

// Compatibilidade com importações existentes
export type DiagnosticQuestion = TemplateQuestion;

export interface Meeting {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  type: "online" | "presencial";
  location?: string;
  link?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  agenda?: string;
  participants: string[];
  hasMinutes: boolean;
  minutes?: MeetingMinutes;
  createdAt: string;
  updatedAt?: string;
  endTime?: string;
  responsibleUserId?: string | null;
  notes?: string;
}

export interface MeetingMinutes {
  context?: string;
  decisions: string[];
  pendencies: string[];
  tasksCreated: string[];
  risksIdentified: string[];
  nextMeeting?: string;
}

export interface Indicator {
  id: string;
  name: string;
  category?: string | null;
  formula?: string;
  unit?: string | null;
  frequency?: string | null;
  source?: "manual" | "planilha" | "integração";
  currentValue?: number | null;

  targetValue?: number | null;
  trend?: "up" | "down" | "stable" | null;
  status?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  responsible?: string;
  isPrimary?: boolean;
  values?: { date: string; value: number }[];
  alertEnabled?: boolean;
  alertThreshold?: number | null;
  alertType?: string | null;
  createdAt?: string;
}

export interface Document {
  id: string;
  name: string;
  category:
    | "contrato"
    | "proposta"
    | "diagnóstico"
    | "indicadores"
    | "evidências"
    | "reuniões"
    | "processos"
    | "treinamento";
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  tags: string[];
  version: number;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Playbook {
  id: string;
  title: string;
  area: string;
  description: string;
  whenToUse: string;
  howToValidate: string;
  steps: string[];
  checklist: string[];
  commonErrors: string[];
  tags: string[];
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role: string;
  accessRole?: "Admin" | "Gestor" | "Analista";
  seniority: "Junior" | "Pleno" | "Senior";
  startDate: string;
  projects: number;
  onboardingProgress: number;
  status: "active" | "onboarding";
  permissions: string[];
  avatarUrl?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  company: string;
  contact: string;
  email?: string;
  phone?: string;
  source: string;
  status: "new" | "contacted" | "meeting" | "proposal" | "won" | "lost";
  value: number;
  nextAction: string;
  nextActionDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  value: number;
  startDate: string;
  endDate: string;
  billingType: "mensal" | "parcela" | "projeto";
  installments: { id: string; value: number; dueDate: string; status: "pending" | "overdue" | "paid" }[];
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  projectId?: string;
  projectName?: string;
  value: number;
  date: string;
  receipt?: string;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  type: "Artigo" | "Case" | "Post" | "Webinar" | "Video";
  status: "idea" | "draft" | "review" | "published";
  publishDate?: string;
  tags: string[];
  createdAt: string;
}
