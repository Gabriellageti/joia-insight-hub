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
  razaoSocial: string;
  nomeFantasia?: string;
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
  progress: number;
  status: "green" | "yellow" | "red";
  responsible: string;
  startDate: string;
  endDate: string;
  moneyHypothesis?: string;
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
  priority: "low" | "medium" | "high";
  dueDate: string;
  impact?: string;
  status: "backlog" | "next" | "in_progress" | "validation" | "done";
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
}

export interface Diagnostic {
  id: string;
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
}

export interface DiagnosticTemplate {
  id: string;
  name: string;
  sections: { id: string; name: string; questions: DiagnosticQuestion[] }[];
}

export interface DiagnosticQuestion {
  id: string;
  text: string;
  type: "yes_no" | "scale" | "text" | "number" | "attachment";
  weight: number;
  critical: boolean;
}

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
  status: "scheduled" | "completed" | "cancelled";
  agenda?: string;
  participants: string[];
  hasMinutes: boolean;
  minutes?: MeetingMinutes;
  createdAt: string;
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
  category: "Compras" | "Vendas" | "Financeiro" | "Estoque" | "Processo" | "Pessoas";
  formula?: string;
  unit: "R$" | "%" | "quantidade";
  frequency: "diário" | "semanal" | "mensal";
  source: "manual" | "planilha" | "integração";
  target?: number;
  projectId?: string;
  projectName?: string;
  responsible: string;
  values: { date: string; value: number }[];
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  category: "contrato" | "proposta" | "diagnóstico" | "indicadores" | "evidências" | "reuniões" | "processos" | "treinamento";
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
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role: string;
  seniority: "Junior" | "Pleno" | "Senior";
  startDate: string;
  projects: number;
  onboardingProgress: number;
  status: "active" | "onboarding";
  permissions: string[];
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
