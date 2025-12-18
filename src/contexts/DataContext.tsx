import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Client, Project, Task, Meeting, Indicator, Document, 
  Playbook, Employee, Lead, Contract, Expense, ContentItem, Diagnostic 
} from '@/types';

interface DataContextType {
  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // Projects
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Meetings
  meetings: Meeting[];
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => void;
  updateMeeting: (id: string, meeting: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  
  // Indicators
  indicators: Indicator[];
  addIndicator: (indicator: Omit<Indicator, 'id' | 'createdAt'>) => void;
  updateIndicator: (id: string, indicator: Partial<Indicator>) => void;
  deleteIndicator: (id: string) => void;
  
  // Documents
  documents: Document[];
  addDocument: (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDocument: (id: string, document: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  
  // Playbooks
  playbooks: Playbook[];
  addPlaybook: (playbook: Omit<Playbook, 'id' | 'createdAt'>) => void;
  updatePlaybook: (id: string, playbook: Partial<Playbook>) => void;
  deletePlaybook: (id: string) => void;
  
  // Employees
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  
  // Leads
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => void;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  
  // Diagnostics
  diagnostics: Diagnostic[];
  addDiagnostic: (diagnostic: Omit<Diagnostic, 'id' | 'createdAt'>) => void;
  updateDiagnostic: (id: string, diagnostic: Partial<Diagnostic>) => void;
  deleteDiagnostic: (id: string) => void;

  // Content
  contentItems: ContentItem[];
  addContentItem: (item: Omit<ContentItem, 'id' | 'createdAt'>) => void;
  updateContentItem: (id: string, item: Partial<ContentItem>) => void;
  deleteContentItem: (id: string) => void;

  // Contracts
  contracts: Contract[];
  addContract: (contract: Omit<Contract, 'id' | 'createdAt'>) => void;
  updateContract: (id: string, contract: Partial<Contract>) => void;
  deleteContract: (id: string) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);
const getDate = () => new Date().toLocaleDateString('pt-BR');

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
  const segmentoTags = (client.segmentoTags && client.segmentoTags.length > 0
    ? client.segmentoTags
    : client.segment
      ? [client.segment]
      : []
  ).map((tag) => tag.trim()).filter(Boolean);

  return {
    id: client.id || generateId(),
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
    endereco: {
      cep: client.endereco?.cep || "",
      logradouro: client.endereco?.logradouro || client.address || "",
      numero: client.endereco?.numero || "",
      complemento: client.endereco?.complemento || "",
      bairro: client.endereco?.bairro || "",
      cidade: client.endereco?.cidade || client.city || "",
      uf: client.endereco?.uf || "",
    },
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

// Initial mock data
const initialClients: Client[] = [
  {
    id: "1",
    razaoSocial: "Empresa ABC Ltda",
    nomeFantasia: "ABC Indústrias",
    cnpj: "12.345.678/0001-90",
    segmentoTags: ["Indústria", "Manufatura"],
    status: "ativo",
    contatoPrincipal: { nome: "Paula Andrade", whatsapp: "+55 11 98888-1111", email: "paula.andrade@abc.com" },
    endereco: { cep: "01000-000", logradouro: "Rua das Flores", numero: "123", complemento: "Conj. 12", bairro: "Centro", cidade: "São Paulo", uf: "SP" },
    observacoesInternas: "Cliente estratégico focado em redução de custos e eficiência operacional.",
    preferenciasRelacionamento: { diaReuniao: "Quarta", frequencia: "semanal" },
    projects: 2,
    nps: 9,
    risk: "low",
    lastContact: "15/12/2024",
    createdAt: "01/10/2024"
  },
  {
    id: "2",
    razaoSocial: "Indústria XYZ S.A.",
    nomeFantasia: "XYZ Manufatura",
    cnpj: "98.765.432/0001-00",
    segmentoTags: ["Manufatura"],
    status: "ativo",
    contatoPrincipal: { nome: "Rodrigo Lima", whatsapp: "+55 19 97777-2222", email: "rodrigo.lima@xyz.com" },
    endereco: { cep: "13000-000", logradouro: "Avenida das Américas", numero: "500", bairro: "Jardim América", cidade: "Campinas", uf: "SP" },
    observacoesInternas: "Equipe aberta a melhorias rápidas, priorizar quick wins.",
    preferenciasRelacionamento: { diaReuniao: "Terça", frequencia: "quinzenal" },
    projects: 1,
    nps: 7,
    risk: "medium",
    lastContact: "10/12/2024",
    createdAt: "15/09/2024"
  },
  {
    id: "3",
    razaoSocial: "Comércio 123 Ltda",
    nomeFantasia: "Loja 123",
    cnpj: "11.222.333/0001-44",
    segmentoTags: ["Varejo", "E-commerce"],
    status: "ativo",
    contatoPrincipal: { nome: "Fernanda Souza", whatsapp: "+55 21 96666-3333", email: "fernanda@comercio123.com" },
    endereco: { cep: "20000-000", logradouro: "Rua do Mercado", numero: "45", complemento: "Sala 2", bairro: "Centro", cidade: "Rio de Janeiro", uf: "RJ" },
    observacoesInternas: "Foco em digitalização do estoque e canais online.",
    preferenciasRelacionamento: { diaReuniao: "Quinta", frequencia: "mensal" },
    projects: 3,
    nps: 8,
    risk: "low",
    lastContact: "18/12/2024",
    createdAt: "01/08/2024"
  },
  {
    id: "4",
    razaoSocial: "Serviços JKL ME",
    nomeFantasia: "JKL Serviços",
    cnpj: "22.333.444/0001-55",
    segmentoTags: ["Serviços"],
    status: "inativo",
    contatoPrincipal: { nome: "Juliana Castro", whatsapp: "+55 31 95555-4444", email: "juliana@jklservicos.com" },
    endereco: { cep: "30000-000", logradouro: "Rua Central", numero: "900", bairro: "Savassi", cidade: "Belo Horizonte", uf: "MG" },
    observacoesInternas: "Retomar contato após revisão de proposta anual.",
    preferenciasRelacionamento: { diaReuniao: "Segunda", frequencia: "mensal" },
    projects: 0,
    nps: 6,
    risk: "high",
    lastContact: "01/11/2024",
    createdAt: "01/06/2024"
  },
];

const initialProjects: Project[] = [
  { id: "1", name: "Otimização de Compras", clientId: "1", clientName: "ABC Indústrias", phase: "Estruturação", progress: 75, status: "green", responsible: "Ana Silva", startDate: "01/10/2024", endDate: "31/01/2025", createdAt: "01/10/2024" },
  { id: "2", name: "Gestão de Estoque", clientId: "2", clientName: "XYZ Manufatura", phase: "Quick wins", progress: 45, status: "yellow", responsible: "Carlos Santos", startDate: "15/11/2024", endDate: "28/02/2025", createdAt: "15/11/2024" },
  { id: "3", name: "Controle Financeiro", clientId: "3", clientName: "Loja 123", phase: "Diagnóstico", progress: 20, status: "red", responsible: "Maria Oliveira", startDate: "01/12/2024", endDate: "31/03/2025", createdAt: "01/12/2024" },
  { id: "4", name: "Processos de Vendas", clientId: "4", clientName: "JKL Serviços", phase: "Acompanhamento", progress: 90, status: "green", responsible: "João Costa", startDate: "01/08/2024", endDate: "31/12/2024", createdAt: "01/08/2024" },
];

const initialTasks: Task[] = [
  { id: "1", title: "Mapear fornecedores críticos", projectId: "1", projectName: "Otimização de Compras", clientId: "1", clientName: "Empresa ABC", type: "processo", responsible: "Ana Silva", priority: "high", dueDate: "20/12/2024", impact: "R$ 15.000", status: "backlog", evidenceRequired: true, createdAt: "01/12/2024" },
  { id: "2", title: "Implantar curva ABC", projectId: "2", projectName: "Gestão de Estoque", clientId: "2", clientName: "Indústria XYZ", type: "processo", responsible: "Carlos Santos", priority: "medium", dueDate: "22/12/2024", impact: "R$ 8.000", status: "next", evidenceRequired: true, createdAt: "05/12/2024" },
  { id: "3", title: "Treinar equipe de compras", projectId: "1", projectName: "Otimização de Compras", clientId: "1", clientName: "Empresa ABC", type: "treinamento", responsible: "Maria Oliveira", priority: "low", dueDate: "28/12/2024", impact: "R$ 5.000", status: "in_progress", evidenceRequired: false, createdAt: "10/12/2024" },
  { id: "4", title: "Configurar dashboard financeiro", projectId: "3", projectName: "Controle Financeiro", clientId: "3", clientName: "Comércio 123", type: "tecnologia", responsible: "João Costa", priority: "high", dueDate: "19/12/2024", impact: "R$ 12.000", status: "validation", evidenceRequired: true, createdAt: "12/12/2024" },
];

const initialMeetings: Meeting[] = [
  { id: "1", title: "Reunião de Alinhamento Semanal", projectId: "1", projectName: "Otimização de Compras", clientId: "1", clientName: "Empresa ABC", date: "18/12/2024", time: "14:00", type: "online", status: "scheduled", hasMinutes: false, participants: ["Ana Silva", "Cliente"], createdAt: "10/12/2024" },
  { id: "2", title: "Review do Diagnóstico", projectId: "2", projectName: "Gestão de Estoque", clientId: "2", clientName: "Indústria XYZ", date: "19/12/2024", time: "10:00", type: "presencial", status: "scheduled", hasMinutes: false, participants: ["Carlos Santos", "Cliente"], createdAt: "12/12/2024" },
  { id: "3", title: "Apresentação de Resultados", projectId: "4", projectName: "Processos de Vendas", clientId: "4", clientName: "Serviços JKL", date: "16/12/2024", time: "15:30", type: "online", status: "completed", hasMinutes: true, participants: ["João Costa", "Cliente"], createdAt: "01/12/2024" },
];

const initialEmployees: Employee[] = [
  { id: "1", name: "Ana Silva", role: "Gestora de Projetos", seniority: "Senior", startDate: "15/03/2023", projects: 4, onboardingProgress: 100, status: "active", permissions: [], createdAt: "15/03/2023" },
  { id: "2", name: "Carlos Santos", role: "Analista", seniority: "Pleno", startDate: "01/08/2023", projects: 3, onboardingProgress: 100, status: "active", permissions: [], createdAt: "01/08/2023" },
  { id: "3", name: "Maria Oliveira", role: "Analista", seniority: "Junior", startDate: "10/11/2024", projects: 1, onboardingProgress: 65, status: "onboarding", permissions: [], createdAt: "10/11/2024" },
  { id: "4", name: "João Costa", role: "Gestor de Projetos", seniority: "Pleno", startDate: "20/06/2024", projects: 2, onboardingProgress: 100, status: "active", permissions: [], createdAt: "20/06/2024" },
];

const initialLeads: Lead[] = [
  { id: "1", company: "Tech Solutions", contact: "Roberto Almeida", source: "LinkedIn", status: "proposal", value: 15000, nextAction: "Aguardando retorno", createdAt: "01/12/2024" },
  { id: "2", company: "Distribuidora Norte", contact: "Patrícia Lima", source: "Indicação", status: "meeting", value: 22000, nextAction: "Reunião 20/12", createdAt: "05/12/2024" },
  { id: "3", company: "Indústria Sul", contact: "Fernando Costa", source: "Site", status: "contacted", value: 18000, nextAction: "Ligar amanhã", createdAt: "10/12/2024" },
  { id: "4", company: "Comércio Central", contact: "Amanda Silva", source: "Evento", status: "new", value: 12000, nextAction: "Primeiro contato", createdAt: "15/12/2024" },
];

const initialDiagnostics: Diagnostic[] = [
  { id: "1", projectId: "1", projectName: "Otimização de Compras", clientId: "1", clientName: "Empresa ABC", templateId: "1", templateName: "Diagnóstico Completo JoIA", status: "completed", progress: 100, score: 68, opportunities: 12, createdAt: "05/10/2024" },
  { id: "2", projectId: "2", projectName: "Gestão de Estoque", clientId: "2", clientName: "Indústria XYZ", templateId: "3", templateName: "Diagnóstico de Estoque", status: "in_progress", progress: 65, opportunities: 5, createdAt: "20/11/2024" },
  { id: "3", projectId: "3", projectName: "Controle Financeiro", clientId: "3", clientName: "Comércio 123", templateId: "4", templateName: "Diagnóstico Financeiro", status: "draft", progress: 0, opportunities: 0, createdAt: "15/12/2024" },
];

const initialIndicators: Indicator[] = [
  { id: "1", name: "Saving em Compras", category: "Compras", unit: "R$", frequency: "mensal", source: "manual", target: 50000, responsible: "Ana Silva", values: [{ date: "01/11/2024", value: 35000 }, { date: "01/12/2024", value: 42000 }], createdAt: "01/10/2024" },
  { id: "2", name: "Giro de Estoque", category: "Estoque", unit: "quantidade", frequency: "mensal", source: "manual", target: 6, responsible: "Carlos Santos", values: [{ date: "01/11/2024", value: 4.2 }, { date: "01/12/2024", value: 4.8 }], createdAt: "15/11/2024" },
];

const initialContentItems: ContentItem[] = [
  { id: "1", title: "Como reduzir custos de compras em 30 dias", type: "Artigo", status: "published", tags: ["compras", "redução de custos"], createdAt: "01/11/2024" },
  { id: "2", title: "Case: Empresa ABC economiza R$ 200k", type: "Case", status: "review", tags: ["case", "resultados"], createdAt: "10/12/2024" },
  { id: "3", title: "5 erros em gestão de estoque", type: "Post", status: "draft", tags: ["estoque", "erros comuns"], createdAt: "15/12/2024" },
];

const initialPlaybooks: Playbook[] = [
  { id: "1", title: "Como rodar o diagnóstico JoIA", area: "Diagnóstico", description: "Guia completo para aplicação do diagnóstico", whenToUse: "No início de todo projeto", howToValidate: "Score preenchido e oportunidades identificadas", steps: ["Selecionar template", "Agendar com cliente", "Aplicar perguntas", "Gerar relatório"], checklist: ["Template selecionado", "Reunião agendada", "Perguntas respondidas"], commonErrors: ["Não registrar evidências", "Pular seções"], tags: ["diagnóstico", "início"], createdAt: "01/01/2024" },
];

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useLocalStorage<Client[]>('joia_clients', initialClients);
  const [projects, setProjects] = useLocalStorage<Project[]>('joia_projects', initialProjects);
  const [tasks, setTasks] = useLocalStorage<Task[]>('joia_tasks', initialTasks);
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('joia_meetings', initialMeetings);
  const [indicators, setIndicators] = useLocalStorage<Indicator[]>('joia_indicators', initialIndicators);
  const [documents, setDocuments] = useLocalStorage<Document[]>('joia_documents', []);
  const [playbooks, setPlaybooks] = useLocalStorage<Playbook[]>('joia_playbooks', initialPlaybooks);
  const [employees, setEmployees] = useLocalStorage<Employee[]>('joia_employees', initialEmployees);
  const [leads, setLeads] = useLocalStorage<Lead[]>('joia_leads', initialLeads);
  const [diagnostics, setDiagnostics] = useLocalStorage<Diagnostic[]>('joia_diagnostics', initialDiagnostics);
  const [contentItems, setContentItems] = useLocalStorage<ContentItem[]>('joia_content', initialContentItems);
  const [contracts, setContracts] = useLocalStorage<Contract[]>('joia_contracts', []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('joia_expenses', []);

  useEffect(() => {
    setClients(prev => prev.map(normalizeClient));
  }, [setClients]);

  const value: DataContextType = {
    clients,
    addClient: (client) => setClients(prev => [...prev, normalizeClient({ ...client, id: generateId(), createdAt: getDate(), lastContact: getDate() })]),
    updateClient: (id, client) => setClients(prev => prev.map(c => c.id === id ? normalizeClient({ ...c, ...client }) : c)),
    deleteClient: (id) => setClients(prev => prev.filter(c => c.id !== id)),

    projects,
    addProject: (project) => setProjects(prev => [...prev, { ...project, id: generateId(), createdAt: getDate() }]),
    updateProject: (id, project) => setProjects(prev => prev.map(p => p.id === id ? { ...p, ...project } : p)),
    deleteProject: (id) => setProjects(prev => prev.filter(p => p.id !== id)),

    tasks,
    addTask: (task) => setTasks(prev => [...prev, { ...task, id: generateId(), createdAt: getDate() }]),
    updateTask: (id, task) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...task } : t)),
    deleteTask: (id) => setTasks(prev => prev.filter(t => t.id !== id)),

    meetings,
    addMeeting: (meeting) => setMeetings(prev => [...prev, { ...meeting, id: generateId(), createdAt: getDate() }]),
    updateMeeting: (id, meeting) => setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...meeting } : m)),
    deleteMeeting: (id) => setMeetings(prev => prev.filter(m => m.id !== id)),

    indicators,
    addIndicator: (indicator) => setIndicators(prev => [...prev, { ...indicator, id: generateId(), createdAt: getDate() }]),
    updateIndicator: (id, indicator) => setIndicators(prev => prev.map(i => i.id === id ? { ...i, ...indicator } : i)),
    deleteIndicator: (id) => setIndicators(prev => prev.filter(i => i.id !== id)),

    documents,
    addDocument: (document) => setDocuments(prev => [...prev, { ...document, id: generateId(), createdAt: getDate(), updatedAt: getDate() }]),
    updateDocument: (id, document) => setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...document, updatedAt: getDate() } : d)),
    deleteDocument: (id) => setDocuments(prev => prev.filter(d => d.id !== id)),

    playbooks,
    addPlaybook: (playbook) => setPlaybooks(prev => [...prev, { ...playbook, id: generateId(), createdAt: getDate() }]),
    updatePlaybook: (id, playbook) => setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, ...playbook } : p)),
    deletePlaybook: (id) => setPlaybooks(prev => prev.filter(p => p.id !== id)),

    employees,
    addEmployee: (employee) => setEmployees(prev => [...prev, { ...employee, id: generateId(), createdAt: getDate() }]),
    updateEmployee: (id, employee) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...employee } : e)),
    deleteEmployee: (id) => setEmployees(prev => prev.filter(e => e.id !== id)),

    leads,
    addLead: (lead) => setLeads(prev => [...prev, { ...lead, id: generateId(), createdAt: getDate() }]),
    updateLead: (id, lead) => setLeads(prev => prev.map(l => l.id === id ? { ...l, ...lead } : l)),
    deleteLead: (id) => setLeads(prev => prev.filter(l => l.id !== id)),

    diagnostics,
    addDiagnostic: (diagnostic) => setDiagnostics(prev => [...prev, { ...diagnostic, id: generateId(), createdAt: getDate() }]),
    updateDiagnostic: (id, diagnostic) => setDiagnostics(prev => prev.map(d => d.id === id ? { ...d, ...diagnostic } : d)),
    deleteDiagnostic: (id) => setDiagnostics(prev => prev.filter(d => d.id !== id)),

    contentItems,
    addContentItem: (item) => setContentItems(prev => [...prev, { ...item, id: generateId(), createdAt: getDate() }]),
    updateContentItem: (id, item) => setContentItems(prev => prev.map(i => i.id === id ? { ...i, ...item } : i)),
    deleteContentItem: (id) => setContentItems(prev => prev.filter(i => i.id !== id)),

    contracts,
    addContract: (contract) => setContracts(prev => [...prev, { ...contract, id: generateId(), createdAt: getDate() }]),
    updateContract: (id, contract) => setContracts(prev => prev.map(c => c.id === id ? { ...c, ...contract } : c)),
    deleteContract: (id) => setContracts(prev => prev.filter(c => c.id !== id)),

    expenses,
    addExpense: (expense) => setExpenses(prev => [...prev, { ...expense, id: generateId(), createdAt: getDate() }]),
    updateExpense: (id, expense) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...expense } : e)),
    deleteExpense: (id) => setExpenses(prev => prev.filter(e => e.id !== id)),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
