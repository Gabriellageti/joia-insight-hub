import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { DocumentCategory, DocumentQueryFilters, EvidenceStatus, FileItem, FileVisibility } from "@/types/documents";
import type { Database } from "@/integrations/supabase/types";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
type ClientReference = { id: string; name?: string; nomeFantasia?: string; razaoSocial?: string };
type ProjectReference = { id: string; name: string };
type EmployeeReference = { userId?: string | null; name: string };

const DEFAULT_PAGE_SIZE = 24;

function mapDbToFileItem(doc: DocumentRow, clients: ClientReference[], projects: ProjectReference[], employees: EmployeeReference[]): FileItem {
  const client = clients.find((item) => item.id === doc.client_id);
  const project = projects.find((item) => item.id === doc.project_id);
  const uploader = employees.find((item) => item.userId === doc.uploaded_by);
  return {
    id: doc.id,
    nomeArquivo: doc.name,
    nomeExibicao: doc.display_name || doc.name,
    descricao: doc.description || undefined,
    clienteId: doc.client_id || undefined,
    clienteNome: client?.nomeFantasia || client?.razaoSocial || client?.name,
    projetoId: doc.project_id || undefined,
    projetoNome: project?.name,
    categoriaId: (doc.category || "other") as DocumentCategory,
    tags: doc.tags || [],
    tipo: doc.file_type === "Evidência" ? "Evidência" : "Documento",
    statusEvidencia: doc.evidence_status as EvidenceStatus | undefined,
    motivoRejeicao: doc.rejection_reason || undefined,
    visibilidade: (doc.visibility || "Interno") as FileVisibility,
    vinculos: { taskId: doc.task_id || undefined, diagnosticId: doc.diagnostic_id || undefined, meetingId: doc.meeting_id || undefined },
    tamanhoBytes: doc.file_size || 0,
    mimeType: doc.mime_type || "application/octet-stream",
    uploadedAt: doc.created_at,
    uploadedBy: doc.uploaded_by || undefined,
    uploadedByName: uploader?.name,
    url: doc.url || undefined,
    storagePath: doc.storage_path || doc.url || undefined,
    versionGroupId: doc.version_group_id || doc.id,
    versao: doc.version_number || 1,
    isCurrentVersion: doc.is_current_version,
    previousVersionId: doc.previous_version_id || undefined,
    archivedAt: doc.archived_at || undefined,
    sourceProvider: (doc.source_provider || "supabase_storage") as FileItem["sourceProvider"],
  };
}

export function useDocuments(filters: DocumentQueryFilters = {}) {
  const [documents, setDocuments] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const { clients, projects, employees } = useData();
  const { user, activeMembership } = useAuth();
  const referencesRef = useRef({ clients, projects, employees });
  referencesRef.current = { clients, projects, employees };

  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = filters.search?.trim() || "";
  const clientId = filters.clientId ?? null;
  const projectId = filters.projectId ?? null;
  const meetingId = filters.meetingId ?? null;
  const taskId = filters.taskId ?? null;
  const category = filters.category ?? "all";
  const uploadedBy = filters.uploadedBy ?? null;
  const fileType = filters.fileType ?? "all";
  const dateFrom = filters.dateFrom ?? null;
  const dateTo = filters.dateTo ?? null;
  const archived = filters.archived ?? "active";

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from("documents").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
      query = query.eq("is_current_version", true);
      if (search) query = query.textSearch("search_vector", search, { config: "simple", type: "websearch" });
      if (clientId) query = query.eq("client_id", clientId);
      if (projectId) query = query.eq("project_id", projectId);
      if (meetingId) query = query.eq("meeting_id", meetingId);
      if (taskId) query = query.eq("task_id", taskId);
      if (category !== "all") query = query.eq("category", category);
      if (uploadedBy) query = query.eq("uploaded_by", uploadedBy);
      if (fileType !== "all") query = query.eq("file_type", fileType);
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lt("created_at", `${dateTo}T23:59:59.999`);
      if (archived === "active") query = query.is("archived_at", null);
      if (archived === "archived") query = query.not("archived_at", "is", null);
      const { data, error: queryError, count } = await query;
      if (queryError) throw queryError;
      const refs = referencesRef.current;
      setDocuments((data || []).map((doc) => mapDbToFileItem(doc, refs.clients, refs.projects, refs.employees)));
      setTotal(count ?? 0);
    } catch {
      setError("Não foi possível carregar os documentos.");
    } finally {
      setLoading(false);
    }
  }, [archived, category, clientId, dateFrom, dateTo, fileType, meetingId, page, pageSize, projectId, search, taskId, uploadedBy]);

  useEffect(() => {
    void fetchDocuments();
    window.addEventListener("joia:documents-changed", fetchDocuments);
    return () => window.removeEventListener("joia:documents-changed", fetchDocuments);
  }, [fetchDocuments]);

  const addDocument = useCallback(async (file: Omit<FileItem, "id" | "uploadedAt">) => {
    if (!user || !activeMembership) throw new Error("Sessão ou workspace indisponível.");
    const { data, error: insertError } = await supabase.from("documents").insert({
      workspace_id: activeMembership.workspaceId,
      name: file.nomeArquivo,
      display_name: file.nomeExibicao,
      description: file.descricao || null,
      client_id: file.clienteId || null,
      project_id: file.projetoId || null,
      category: file.categoriaId,
      tags: file.tags,
      file_type: file.tipo,
      evidence_status: file.statusEvidencia || null,
      visibility: file.visibilidade,
      file_size: file.tamanhoBytes,
      mime_type: file.mimeType,
      task_id: file.vinculos.taskId || null,
      diagnostic_id: file.vinculos.diagnosticId || null,
      meeting_id: file.vinculos.meetingId || null,
      url: file.storagePath || file.url || null,
      storage_path: file.storagePath || file.url || null,
      uploaded_by: user.id,
      is_internal: file.visibilidade === "Interno",
      version_group_id: file.versionGroupId,
      version_number: file.versao,
      is_current_version: true,
      previous_version_id: file.previousVersionId || null,
      source_provider: file.sourceProvider,
    }).select().single();
    if (insertError) throw insertError;
    window.dispatchEvent(new Event("joia:documents-changed"));
    toast({ title: file.versao > 1 ? `Versão ${file.versao} adicionada` : "Documento adicionado" });
    const refs = referencesRef.current;
    return mapDbToFileItem(data, refs.clients, refs.projects, refs.employees);
  }, [activeMembership, user]);

  const updateDocument = useCallback(async (id: string, updates: Partial<FileItem>) => {
    const dbUpdates: DocumentUpdate = {};
    if (updates.nomeExibicao !== undefined) dbUpdates.display_name = updates.nomeExibicao;
    if (updates.descricao !== undefined) dbUpdates.description = updates.descricao || null;
    if (updates.categoriaId !== undefined) dbUpdates.category = updates.categoriaId;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.statusEvidencia !== undefined) dbUpdates.evidence_status = updates.statusEvidencia;
    if (updates.motivoRejeicao !== undefined) dbUpdates.rejection_reason = updates.motivoRejeicao;
    if (updates.visibilidade !== undefined) { dbUpdates.visibility = updates.visibilidade; dbUpdates.is_internal = updates.visibilidade === "Interno"; }
    if (updates.clienteId !== undefined) dbUpdates.client_id = updates.clienteId || null;
    if (updates.projetoId !== undefined) dbUpdates.project_id = updates.projetoId || null;
    if (updates.vinculos !== undefined) {
      dbUpdates.task_id = updates.vinculos.taskId || null;
      dbUpdates.diagnostic_id = updates.vinculos.diagnosticId || null;
      dbUpdates.meeting_id = updates.vinculos.meetingId || null;
    }
    const { error: updateError } = await supabase.from("documents").update(dbUpdates).eq("id", id);
    if (updateError) throw updateError;
    window.dispatchEvent(new Event("joia:documents-changed"));
  }, []);

  const archiveDocument = useCallback(async (id: string) => {
    if (!user) throw new Error("Sessão indisponível.");
    const { error: archiveError } = await supabase.from("documents").update({ archived_at: new Date().toISOString(), archived_by: user.id }).eq("id", id);
    if (archiveError) throw archiveError;
    window.dispatchEvent(new Event("joia:documents-changed"));
    toast({ title: "Documento arquivado" });
  }, [user]);

  const restoreDocument = useCallback(async (id: string) => {
    const { error: restoreError } = await supabase.from("documents").update({ archived_at: null, archived_by: null }).eq("id", id);
    if (restoreError) throw restoreError;
    window.dispatchEvent(new Event("joia:documents-changed"));
    toast({ title: "Documento restaurado" });
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    const document = documents.find((item) => item.id === id);
    if (document?.storagePath && document.sourceProvider === "supabase_storage") {
      const { error: storageError } = await supabase.storage.from("documents").remove([document.storagePath]);
      if (storageError) throw storageError;
    }
    const { error: deleteError } = await supabase.from("documents").delete().eq("id", id);
    if (deleteError) throw deleteError;
    window.dispatchEvent(new Event("joia:documents-changed"));
    toast({ title: "Documento excluído definitivamente" });
  }, [documents]);

  const getVersionHistory = useCallback(async (versionGroupId: string) => {
    const { data, error: versionError } = await supabase.from("documents").select("*").eq("version_group_id", versionGroupId).order("version_number", { ascending: false });
    if (versionError) throw versionError;
    const refs = referencesRef.current;
    return (data || []).map((doc) => mapDbToFileItem(doc, refs.clients, refs.projects, refs.employees));
  }, []);

  const approveDocument = useCallback(async (id: string) => { await updateDocument(id, { statusEvidencia: "Aprovada" }); toast({ title: "Evidência aprovada" }); }, [updateDocument]);
  const rejectDocument = useCallback(async (id: string, reason: string) => { await updateDocument(id, { statusEvidencia: "Rejeitada", motivoRejeicao: reason }); toast({ title: "Evidência rejeitada" }); }, [updateDocument]);

  return {
    documents, loading, error, total, hasNextPage: (page + 1) * pageSize < total,
    addDocument, updateDocument, archiveDocument, restoreDocument, deleteDocument,
    getVersionHistory, approveDocument, rejectDocument, refetch: fetchDocuments,
  };
}
