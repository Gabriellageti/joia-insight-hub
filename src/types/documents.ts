// Types for enhanced Documents module

export type DocumentCategory =
  | "contracts"
  | "diagnostics"
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
  url?: string;
}

export interface CategoryInfo {
  id: DocumentCategory | "all";
  name: string;
  count?: number;
}

export const DOCUMENT_CATEGORIES: CategoryInfo[] = [
  { id: "all", name: "Todos" },
  { id: "contracts", name: "Contratos e Propostas" },
  { id: "diagnostics", name: "Diagnósticos" },
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
