import { useState, useEffect, useMemo, useCallback } from "react";
import { Upload, Search, Grid, List, FolderTree, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
  DocumentFilters,
  CategorySidebar,
  QuickFilterChips,
  FileCard,
  UploadModal,
  ClientProjectTree,
} from "@/components/documents";
import {
  FileItem,
  DocumentCategory,
  QuickFilter,
  ViewMode,
  LayoutMode,
} from "@/types/documents";
import {
  mockFileItems,
  mockClients,
  mockProjects,
  mockTasks,
  mockDiagnostics,
  mockMeetings,
} from "@/lib/documents/mockData";

const STORAGE_KEY = "documentos-filters";

export default function Documentos() {
  const [files, setFiles] = useState<FileItem[]>(mockFileItems);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "all">("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("category");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Load persisted filters
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { clientId, projectId } = JSON.parse(saved);
        if (clientId) setSelectedClientId(clientId);
        if (projectId) setSelectedProjectId(projectId);
      }
    } catch {}
  }, []);

  // Persist filters
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ clientId: selectedClientId, projectId: selectedProjectId })
    );
  }, [selectedClientId, selectedProjectId]);

  const getProjectsForClient = useCallback(
    (clientId: string) => mockProjects.filter((p) => p.clientId === clientId),
    []
  );

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // Search
      if (search && !file.nomeExibicao.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Client filter
      if (selectedClientId && file.clienteId !== selectedClientId) {
        return false;
      }
      // Project filter
      if (selectedProjectId && file.projetoId !== selectedProjectId) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && file.categoriaId !== selectedCategory) {
        return false;
      }
      // Quick filters
      if (quickFilter === "unlinked" && (file.clienteId || file.projetoId)) {
        return false;
      }
      if (quickFilter === "pending" && !(file.tipo === "Evidência" && file.statusEvidencia === "Pendente")) {
        return false;
      }
      if (quickFilter === "rejected" && !(file.tipo === "Evidência" && file.statusEvidencia === "Rejeitada")) {
        return false;
      }
      return true;
    });
  }, [files, search, selectedClientId, selectedProjectId, selectedCategory, quickFilter]);

  // Category counts (considering client/project filters)
  const categoryCounts = useMemo(() => {
    const baseFiltered = files.filter((file) => {
      if (selectedClientId && file.clienteId !== selectedClientId) return false;
      if (selectedProjectId && file.projetoId !== selectedProjectId) return false;
      return true;
    });

    const counts: Record<string, number> = { all: baseFiltered.length };
    baseFiltered.forEach((file) => {
      counts[file.categoriaId] = (counts[file.categoriaId] || 0) + 1;
    });
    return counts;
  }, [files, selectedClientId, selectedProjectId]);

  // Quick filter counts
  const quickFilterCounts = useMemo(() => {
    const baseFiltered = files.filter((file) => {
      if (selectedClientId && file.clienteId !== selectedClientId) return false;
      if (selectedProjectId && file.projetoId !== selectedProjectId) return false;
      if (selectedCategory !== "all" && file.categoriaId !== selectedCategory) return false;
      return true;
    });

    return {
      all: baseFiltered.length,
      unlinked: baseFiltered.filter((f) => !f.clienteId && !f.projetoId).length,
      pending: baseFiltered.filter((f) => f.tipo === "Evidência" && f.statusEvidencia === "Pendente").length,
      rejected: baseFiltered.filter((f) => f.tipo === "Evidência" && f.statusEvidencia === "Rejeitada").length,
    };
  }, [files, selectedClientId, selectedProjectId, selectedCategory]);

  const handleUpload = (newFile: Omit<FileItem, "id" | "uploadedAt">) => {
    const file: FileItem = {
      ...newFile,
      id: `file-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setFiles((prev) => [file, ...prev]);
  };

  const handleApprove = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, statusEvidencia: "Aprovada" as const } : f))
    );
  };

  const handleReject = (id: string) => {
    const motivo = window.prompt("Informe o motivo da rejeição:");
    if (motivo) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, statusEvidencia: "Rejeitada" as const, motivoRejeicao: motivo } : f
        )
      );
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este arquivo?")) {
      setFiles((prev) => prev.filter((f) => f.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documentos e Evidências</h1>
          <p className="text-muted-foreground">Organize e acesse arquivos dos projetos</p>
        </div>
        <Button
          onClick={() => setUploadModalOpen(true)}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Filters */}
      <DocumentFilters
        clients={mockClients}
        projects={mockProjects}
        selectedClientId={selectedClientId}
        selectedProjectId={selectedProjectId}
        onClientChange={setSelectedClientId}
        onProjectChange={setSelectedProjectId}
        getProjectsForClient={getProjectsForClient}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <CategorySidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg">
              <Toggle
                pressed={viewMode === "category"}
                onPressedChange={() => setViewMode("category")}
                size="sm"
                className="rounded-r-none"
              >
                <Layers className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={viewMode === "tree"}
                onPressedChange={() => setViewMode("tree")}
                size="sm"
                className="rounded-l-none"
              >
                <FolderTree className="h-4 w-4" />
              </Toggle>
            </div>

            {/* Layout Mode Toggle */}
            <div className="flex items-center border rounded-lg">
              <Toggle
                pressed={layoutMode === "grid"}
                onPressedChange={() => setLayoutMode("grid")}
                size="sm"
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={layoutMode === "list"}
                onPressedChange={() => setLayoutMode("list")}
                size="sm"
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Toggle>
            </div>
          </div>

          {/* Quick Filters */}
          <QuickFilterChips
            selectedFilter={quickFilter}
            onFilterChange={setQuickFilter}
            counts={quickFilterCounts}
          />

          {/* Files Display */}
          {viewMode === "tree" ? (
            <ClientProjectTree files={filteredFiles} />
          ) : (
            <div className={layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
              {filteredFiles.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Nenhum documento encontrado.
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUpload={handleUpload}
        clients={mockClients}
        projects={mockProjects}
        tasks={mockTasks}
        diagnostics={mockDiagnostics}
        meetings={mockMeetings}
        defaultClientId={selectedClientId}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
}
