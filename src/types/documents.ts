// Types for enhanced Documents module

export type DocumentCategory =
  | "contracts"
  | "proposals"
  | "reports"
  | "diagnostics"
  | "spreadsheets"
  | "presentations"
  | "client_documents"
  | "internal_documents"
  | "other"
  | "indicators"
  | "evidence"
  | "meetings"
  | "processes"
  | "training";

export type FileType = "Documento" | "Evidência";

export type EvidenceStatus = "Pendente" | "Aprovada" | "Rejeitada";

export type FileVisibility = "Interno" | "Cliente" | "Ambos";

export interface FileItemLinks {
  taskId?: string;
  diagnosticId?: string;
  meetingId?: string;
}

export interface FileItem {
  id: string;
  nomeArquivo: string;
  nomeExibicao: string;
  descricao?: string;
  clienteId?: string;
  clienteNome?: string;
  projetoId?: string;
  projetoNome?: string;
  categoriaId: DocumentCategory;
  tags: string[];
  tipo: FileType;
  statusEvidencia?: EvidenceStatus;
  motivoRejeicao?: string;
  visibilidade: FileVisibility;
  vinculos: FileItemLinks;
  tamanhoBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: string;
  uploadedByName?: string;
  url?: string;
  storagePath?: string;
  versionGroupId: string;
  versao: number;
  isCurrentVersion: boolean;
  previousVersionId?: string;
  archivedAt?: string;
  sourceProvider: "supabase_storage" | "google_drive" | "external";
}

export interface CategoryInfo {
  id: DocumentCategory | "all";
  name: string;
  count?: number;
}

export const DOCUMENT_CATEGORIES: CategoryInfo[] = [
  { id: "all", name: "Todos" },
  { id: "contracts", name: "Contratos e Propostas" },
  { id: "proposals", name: "Propostas" },
  { id: "reports", name: "Relatórios" },
  { id: "diagnostics", name: "Diagnósticos" },
  { id: "spreadsheets", name: "Planilhas" },
  { id: "presentations", name: "Apresentações" },
  { id: "client_documents", name: "Enviados pelo cliente" },
  { id: "internal_documents", name: "Documentos internos" },
  { id: "other", name: "Outros" },
  { id: "indicators", name: "Indicadores" },
  { id: "evidence", name: "Evidências de Execução" },
  { id: "meetings", name: "Reuniões e Atas" },
  { id: "processes", name: "Processos e POPs" },
  { id: "training", name: "Materiais de Treinamento" },
];

export const SUGGESTED_TAGS = [
  "Compras",
  "Vendas",
  "Financeiro",
  "Estoque",
  "Processos",
  "Treinamento",
  "Contrato",
  "Reunião",
  "KPI",
];

export type QuickFilter = "all" | "unlinked" | "pending" | "rejected";

export type ViewMode = "category" | "tree";
export type LayoutMode = "grid" | "list";

export interface DocumentQueryFilters {
  search?: string;
  clientId?: string | null;
  projectId?: string | null;
  meetingId?: string | null;
  taskId?: string | null;
  category?: DocumentCategory | "all";
  uploadedBy?: string | null;
  fileType?: FileType | "all";
  dateFrom?: string | null;
  dateTo?: string | null;
  archived?: "active" | "archived" | "all";
  page?: number;
  pageSize?: number;
}
