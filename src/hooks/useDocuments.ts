import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";
import { FileItem, DocumentCategory, EvidenceStatus, FileVisibility } from "@/types/documents";
import type { Database } from "@/integrations/supabase/types";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
type ClientReference = { id: string; name?: string; nomeFantasia?: string; razaoSocial?: string };
type ProjectReference = { id: string; name: string };

// Map database document to FileItem
function mapDbToFileItem(doc: DocumentRow, clients: ClientReference[], projects: ProjectReference[]): FileItem {
  const client = clients.find((c) => c.id === doc.client_id);
  const project = projects.find((p) => p.id === doc.project_id);
  
  return {
    id: doc.id,
    nomeArquivo: doc.name,
    nomeExibicao: doc.description || doc.name,
    clienteId: doc.client_id || undefined,
    clienteNome: client?.nomeFantasia || client?.razaoSocial || client?.name,
    projetoId: doc.project_id || undefined,
    projetoNome: project?.name,
    categoriaId: (doc.category || "contracts") as DocumentCategory,
    tags: doc.tags || [],
    tipo: doc.file_type === "Evidência" ? "Evidência" : "Documento",
    statusEvidencia: doc.evidence_status as EvidenceStatus | undefined,
    motivoRejeicao: doc.rejection_reason || undefined,
    visibilidade: (doc.visibility || "Interno") as FileVisibility,
    vinculos: {
      taskId: doc.task_id || undefined,
      diagnosticId: doc.diagnostic_id || undefined,
      meetingId: doc.meeting_id || undefined,
    },
    tamanhoBytes: doc.file_size || 0,
    mimeType: doc.mime_type || "application/octet-stream",
    uploadedAt: doc.created_at,
    uploadedBy: doc.uploaded_by || undefined,
    url: doc.url || undefined,
  };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { clients, projects } = useData();
  const hasFetched = useRef(false);
  const clientsRef = useRef(clients);
  const projectsRef = useRef(projects);

  // Keep refs updated
  clientsRef.current = clients;
  projectsRef.current = projects;

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((doc) =>
        mapDbToFileItem(doc, clientsRef.current, projectsRef.current)
      );
      setDocuments(mapped);
    } catch {
      setError("Não foi possível carregar os documentos.");
      toast({
        title: "Erro ao carregar documentos",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch documents only once on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      void fetchDocuments();
    }
    window.addEventListener("joia:documents-changed", fetchDocuments);
    return () => window.removeEventListener("joia:documents-changed", fetchDocuments);
  }, [fetchDocuments]);

  const addDocument = useCallback(async (file: Omit<FileItem, "id" | "uploadedAt">) => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .insert({
          name: file.nomeArquivo,
          description: file.nomeExibicao,
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
          url: file.url || null,
          is_internal: file.visibilidade === "Interno",
        })
        .select()
        .single();

      if (error) throw error;

      const newDoc = mapDbToFileItem(data, clientsRef.current, projectsRef.current);
      setDocuments((prev) => [newDoc, ...prev]);
      window.dispatchEvent(new Event("joia:documents-changed"));
      
      toast({
        title: "Documento adicionado",
        description: `${file.nomeArquivo} foi salvo com sucesso.`,
      });

      return newDoc;
    } catch (caughtError: unknown) {
      toast({
        title: "Erro ao adicionar documento",
        description: "O documento não foi salvo. Tente novamente.",
        variant: "destructive",
      });
      throw caughtError;
    }
  }, []);

  const updateDocument = useCallback(async (id: string, updates: Partial<FileItem>) => {
    try {
      const dbUpdates: DocumentUpdate = {};
      
      if (updates.nomeExibicao !== undefined) dbUpdates.description = updates.nomeExibicao;
      if (updates.categoriaId !== undefined) dbUpdates.category = updates.categoriaId;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.statusEvidencia !== undefined) dbUpdates.evidence_status = updates.statusEvidencia;
      if (updates.motivoRejeicao !== undefined) dbUpdates.rejection_reason = updates.motivoRejeicao;
      if (updates.visibilidade !== undefined) {
        dbUpdates.visibility = updates.visibilidade;
        dbUpdates.is_internal = updates.visibilidade === "Interno";
      }

      const { error } = await supabase
        .from("documents")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
      );
      window.dispatchEvent(new Event("joia:documents-changed"));
    } catch (caughtError: unknown) {
      toast({
        title: "Erro ao atualizar documento",
        description: "As alterações não foram salvas.",
        variant: "destructive",
      });
      throw caughtError;
    }
  }, []);

  const approveDocument = useCallback(async (id: string) => {
    await updateDocument(id, { statusEvidencia: "Aprovada" });
    toast({ title: "Evidência aprovada" });
  }, [updateDocument]);

  const rejectDocument = useCallback(async (id: string, reason: string) => {
    await updateDocument(id, { statusEvidencia: "Rejeitada", motivoRejeicao: reason });
    toast({ title: "Evidência rejeitada" });
  }, [updateDocument]);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const document = documents.find((item) => item.id === id);
      const { error } = await supabase.from("documents").delete().eq("id", id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      if (document?.url) {
        const marker = "/documents/";
        const path = document.url.includes(marker) ? decodeURIComponent(document.url.split(marker)[1]) : document.url;
        const { error: storageError } = await supabase.storage.from("documents").remove([path]);
        if (storageError) toast({ title: "Documento removido", description: "O registro foi excluído; o arquivo será limpo posteriormente." });
      }
      window.dispatchEvent(new Event("joia:documents-changed"));
      toast({ title: "Documento excluído" });
    } catch (caughtError: unknown) {
      toast({
        title: "Erro ao excluir documento",
        description: "O documento foi mantido. Tente novamente.",
        variant: "destructive",
      });
      throw caughtError;
    }
  }, [documents]);

  return {
    documents,
    loading,
    error,
    addDocument,
    updateDocument,
    approveDocument,
    rejectDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
}
