import React, { createContext, useContext, useEffect, ReactNode, useState, useCallback } from "react";
import {
  Client,
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
  ClientContact,
  ProjectDeliverable,
  ProjectAuditLogEntry,
} from "@/types";
import {
  buildProgressAuditMessage,
  calculateWeightedProgress,
  DEFAULT_PHASES,
  resolveProgressValue,
} from "@/lib/projects/progress";

interface DataContextType {
  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Projects
  projects: Project[];
  addProject: (project: Omit<Project, "id" | "createdAt" | "progress">) => void;
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

  // Client contacts
  clientContacts: ClientContact[];
  addClientContact: (contact: Omit<ClientContact, "id">) => ClientContact;
  updateClientContact: (id: string, contact: Partial<ClientContact>) => void;
  deleteClientContact: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);
const getDate = () => new Date().toLocaleDateString("pt-BR");

type LegacyClient = Partial<Client> & {
  name?: string;
  tradeName?: string;
  segment?: string;
  city?: string;
  address?: string;
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

  const endereco = {
    cep: client.endereco?.cep || "",
    logradouro: client.endereco?.logradouro || client.address || "",
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
    address: client.address || endereco.logradouro || "",
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
    responsible: project.responsible || "",
    startDate: project.startDate || "",
    endDate: project.endDate || "",
    moneyHypothesis: project.moneyHypothesis || "",
    createdAt: project.createdAt || getDate(),
  };
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
    responsible: "João Mendes",
    startDate: "10/01/2025",
    endDate: "30/03/2025",
    createdAt: "05/01/2025",
    moneyHypothesis: "Redução de churn em 8%",
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
    responsible: "Bruna Lira",
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
    responsible: "Marcos Vieira",
    startDate: "05/01/2025",
    endDate: "15/04/2025",
    createdAt: "18/12/2024",
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
    role: "Consultor",
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
    role: "CS Lead",
    seniority: "Pleno",
    startDate: "10/06/2024",
    projects: 2,
    onboardingProgress: 90,
    status: "active",
    permissions: ["clients", "projects"],
    createdAt: "10/06/2024",
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

const initialDiagnostics: Diagnostic[] = [
  {
    id: "diagnostic-1",
    projectId: "project-1",
    projectName: "Implantação BI Operacional",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    templateId: "template-1",
    templateName: "Operações SaaS",
    status: "in_progress",
    progress: 55,
    opportunities: 7,
    createdAt: "22/01/2025",
  },
];

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
  const [clients, setClients] = useLocalStorage<Client[]>("joia_clients", initialClients);
  const [projects, setProjects] = useLocalStorage<Project[]>("joia_projects", initialProjects);
  const [tasks, setTasks] = useLocalStorage<Task[]>("joia_tasks", initialTasks);
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

  const projectTasks = useCallback(
    (projectId: string) => tasks.filter((task) => task.projectId === projectId),
    [tasks]
  );
  const projectDeliverables = useCallback(
    (projectId: string) => deliverables.filter((deliverable) => deliverable.projectId === projectId),
    [deliverables]
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

  const deriveAuditLog = (previous: Project | undefined, next: Project): ProjectAuditLogEntry | null => {
    const overrideChanged = previous?.progressOverrideEnabled !== next.progressOverrideEnabled;
    const manualChanged =
      next.progressOverrideEnabled && previous && previous.manualProgress !== next.manualProgress;
    const justificationChanged =
      next.progressOverrideEnabled && previous && previous.progressJustification !== next.progressJustification;

    if (!previous && next.progressOverrideEnabled) {
      const message = buildProgressAuditMessage({
        projectName: next.name,
        overrideEnabled: true,
        manualProgress: next.manualProgress,
        justification: next.progressJustification,
      });
      return { id: generateId(), projectId: next.id, message, createdAt: getDate() };
    }

    if (!overrideChanged && !manualChanged && !justificationChanged) return null;

    const message = buildProgressAuditMessage({
      projectName: next.name,
      overrideEnabled: next.progressOverrideEnabled,
      manualProgress: next.manualProgress,
      justification: next.progressJustification,
      previousManualProgress: previous?.manualProgress,
      previousOverrideEnabled: previous?.progressOverrideEnabled,
    });

    return { id: generateId(), projectId: next.id, message, createdAt: getDate() };
  };

  useEffect(() => {
    setProjects((prev) =>
      prev.map((project) => {
        const normalizedProject = normalizeProject(project);
        const computed = computeProgressValue(normalizedProject);
        return { ...normalizedProject, ...computed };
      })
    );
  }, [computeProgressValue, setProjects]);

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
    addProject: (project) => {
      const projectId = generateId();
      const baseProject = normalizeProject({
        ...project,
        id: projectId,
        createdAt: getDate(),
      });
      const computed = computeProgressValue(baseProject);
      const newProject = { ...baseProject, ...computed };
      const auditLog = deriveAuditLog(undefined, newProject);

      setProjects((prev) => [...prev, newProject]);
      if (auditLog) {
        setProjectAuditLogs((prev) => [...prev, auditLog]);
      }
    },
    updateProject: (id, project) => {
      let auditLog: ProjectAuditLogEntry | null = null;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const mergedProject = normalizeProject({ ...p, ...project });
          const computed = computeProgressValue(mergedProject);
          const nextProject = { ...mergedProject, ...computed };
          auditLog = deriveAuditLog(p, nextProject);
          return nextProject;
        })
      );
      if (auditLog) {
        setProjectAuditLogs((prev) => [...prev, auditLog!]);
      }
    },
    deleteProject: (id) => setProjects((prev) => prev.filter((p) => p.id !== id)),

    tasks,
    addTask: (task) => setTasks((prev) => [...prev, { ...task, id: generateId(), createdAt: getDate() }]),
    updateTask: (id, task) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...task } : t))),
    deleteTask: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),

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

    diagnostics,
    addDiagnostic: (diagnostic) =>
      setDiagnostics((prev) => [...prev, { ...diagnostic, id: generateId(), createdAt: getDate() }]),
    updateDiagnostic: (id, diagnostic) =>
      setDiagnostics((prev) => prev.map((d) => (d.id === id ? { ...d, ...diagnostic } : d))),
    deleteDiagnostic: (id) => setDiagnostics((prev) => prev.filter((d) => d.id !== id)),

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
