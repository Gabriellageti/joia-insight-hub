import React, { createContext, useContext, useEffect, ReactNode, useState } from "react";
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
} from "@/types";

interface DataContextType {
  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Projects
  projects: Project[];
  addProject: (project: Omit<Project, "id" | "createdAt">) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;

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
  const [clientContacts, setClientContacts] = useLocalStorage<ClientContact[]>(
    "joia_client_contacts",
    initialClientContacts
  );

  // Normaliza clientes legados salvos no localStorage (uma vez por carregamento do provider)
  useEffect(() => {
    setClients((prev) => prev.map(normalizeClient));
  }, [setClients]);

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
    addProject: (project) =>
      setProjects((prev) => [...prev, { ...project, id: generateId(), createdAt: getDate() }]),
    updateProject: (id, project) =>
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...project } : p))),
    deleteProject: (id) => setProjects((prev) => prev.filter((p) => p.id !== id)),

    tasks,
    addTask: (task) => setTasks((prev) => [...prev, { ...task, id: generateId(), createdAt: getDate() }]),
    updateTask: (id, task) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...task } : t))),
    deleteTask: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),

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
