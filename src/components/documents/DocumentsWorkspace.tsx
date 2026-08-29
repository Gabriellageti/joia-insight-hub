import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, FileUp, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useDocuments } from "@/hooks/useDocuments";
import { hasWorkspaceRole } from "@/lib/authorization";
import { toast } from "@/hooks/use-toast";
import { DOCUMENT_CATEGORIES, type DocumentCategory, type FileItem, type FileType } from "@/types/documents";
import { DocumentEditDialog } from "./DocumentEditDialog";
import { DocumentVersionDialog } from "./DocumentVersionDialog";
import { FileCard } from "./FileCard";
import { UploadModal } from "./UploadModal";

interface DocumentsWorkspaceProps {
  clientId?: string;
  projectId?: string;
  meetingId?: string;
  taskId?: string;
  compact?: boolean;
}

export function DocumentsWorkspace({ clientId: lockedClientId, projectId: lockedProjectId, meetingId: lockedMeetingId, taskId: lockedTaskId, compact = false }: DocumentsWorkspaceProps) {
  const { clients, projects, tasks, diagnostics, meetings, employees } = useData();
  const { activeMembership } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | null>(lockedClientId ?? null);
  const [projectId, setProjectId] = useState<string | null>(lockedProjectId ?? null);
  const [meetingId, setMeetingId] = useState<string | null>(lockedMeetingId ?? null);
  const [category, setCategory] = useState<DocumentCategory | "all">("all");
  const [uploadedBy, setUploadedBy] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType | "all">("all");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [archived, setArchived] = useState<"active" | "archived" | "all">("active");
  const [page, setPage] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FileItem | null>(null);
  const [versionTarget, setVersionTarget] = useState<FileItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<FileItem | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(searchInput); setPage(0); }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const documentsApi = useDocuments({
    search,
    clientId: lockedClientId ?? clientId,
    projectId: lockedProjectId ?? projectId,
    meetingId: lockedMeetingId ?? meetingId,
    taskId: lockedTaskId,
    category,
    uploadedBy,
    fileType,
    dateFrom,
    dateTo,
    archived,
    page,
  });

  const clientOptions = useMemo(() => clients.map((client) => ({ id: client.id, name: client.name })), [clients]);
  const projectOptions = useMemo(() => projects.filter((project) => !(lockedClientId ?? clientId) || project.clientId === (lockedClientId ?? clientId)).map((project) => ({ id: project.id, name: project.name, clientId: project.clientId })), [clientId, lockedClientId, projects]);
  const taskOptions = useMemo(() => tasks.map((task) => ({ id: task.id, title: task.title, projectId: task.projectId })), [tasks]);
  const diagnosticOptions = useMemo(() => diagnostics.map((diagnostic) => ({ id: diagnostic.id, name: diagnostic.name, projectId: diagnostic.projectId || "" })), [diagnostics]);
  const meetingOptions = useMemo(() => meetings.map((meeting) => ({ id: meeting.id, title: meeting.title, projectId: meeting.projectId || "" })), [meetings]);
  const uploaderOptions = useMemo(() => employees.filter((employee) => employee.userId).map((employee) => ({ id: employee.userId as string, name: employee.name })), [employees]);
  const canDelete = hasWorkspaceRole(activeMembership?.role, "manager");

  const runAction = async (action: () => Promise<unknown>, errorMessage: string) => {
    try { await action(); } catch { toast({ title: errorMessage, variant: "destructive" }); }
  };

  const clearFilters = () => {
    setSearchInput("");
    if (!lockedClientId) setClientId(null);
    if (!lockedProjectId) setProjectId(null);
    if (!lockedMeetingId) setMeetingId(null);
    setCategory("all"); setUploadedBy(null); setFileType("all"); setDateFrom(null); setDateTo(null); setArchived("active"); setPage(0);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-muted-foreground">{documentsApi.total} arquivo(s) encontrado(s)</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={clearFilters}>Limpar filtros</Button><Button onClick={() => { setVersionTarget(null); setUploadOpen(true); }}><FileUp className="mr-2 h-4 w-4" />Enviar arquivo</Button></div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar documentos" className="pl-9" placeholder="Buscar nome, descrição ou categoria" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
        {!lockedClientId ? <Select value={clientId ?? "all"} onValueChange={(value) => { setClientId(value === "all" ? null : value); setProjectId(null); setPage(0); }}><SelectTrigger aria-label="Filtrar por cliente"><SelectValue placeholder="Cliente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clientOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select> : null}
        {!lockedProjectId ? <Select value={projectId ?? "all"} onValueChange={(value) => { setProjectId(value === "all" ? null : value); setPage(0); }}><SelectTrigger aria-label="Filtrar por projeto"><SelectValue placeholder="Projeto" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os projetos</SelectItem>{projectOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select> : null}
        {!lockedMeetingId ? <Select value={meetingId ?? "all"} onValueChange={(value) => { setMeetingId(value === "all" ? null : value); setPage(0); }}><SelectTrigger aria-label="Filtrar por reunião"><SelectValue placeholder="Reunião" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as reuniões</SelectItem>{meetingOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select> : null}
        <Select value={category} onValueChange={(value) => { setCategory(value as DocumentCategory | "all"); setPage(0); }}><SelectTrigger aria-label="Filtrar por categoria"><SelectValue /></SelectTrigger><SelectContent>{DOCUMENT_CATEGORIES.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
        <Select value={uploadedBy ?? "all"} onValueChange={(value) => { setUploadedBy(value === "all" ? null : value); setPage(0); }}><SelectTrigger aria-label="Filtrar por responsável"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{uploaderOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
        <Select value={fileType} onValueChange={(value) => { setFileType(value as FileType | "all"); setPage(0); }}><SelectTrigger aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="Documento">Documento</SelectItem><SelectItem value="Evidência">Evidência</SelectItem></SelectContent></Select>
        <Select value={archived} onValueChange={(value) => { setArchived(value as typeof archived); setPage(0); }}><SelectTrigger aria-label="Filtrar por arquivamento"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativos</SelectItem><SelectItem value="archived">Arquivados</SelectItem><SelectItem value="all">Ativos e arquivados</SelectItem></SelectContent></Select>
        <div className="space-y-1"><Label htmlFor="documents-from" className="text-xs">De</Label><Input id="documents-from" type="date" value={dateFrom ?? ""} onChange={(event) => { setDateFrom(event.target.value || null); setPage(0); }} /></div>
        <div className="space-y-1"><Label htmlFor="documents-to" className="text-xs">Até</Label><Input id="documents-to" type="date" value={dateTo ?? ""} onChange={(event) => { setDateTo(event.target.value || null); setPage(0); }} /></div>
      </div>

      {documentsApi.loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : null}
      {documentsApi.error && !documentsApi.loading ? <div role="alert" className="rounded-lg border border-destructive/40 p-6 text-center"><p>{documentsApi.error}</p><Button className="mt-3" variant="outline" onClick={() => void documentsApi.refetch()}>Tentar novamente</Button></div> : null}
      {!documentsApi.loading && !documentsApi.error && documentsApi.documents.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center"><Archive className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Nenhum documento encontrado</p><p className="text-sm text-muted-foreground">Ajuste os filtros ou envie o primeiro arquivo deste contexto.</p></div> : null}
      {!documentsApi.loading && documentsApi.documents.length ? <div className={compact ? "grid gap-3 md:grid-cols-2" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>{documentsApi.documents.map((file) => <FileCard key={file.id} file={file} onRename={() => setEditTarget(file)} onMoveCategory={() => setEditTarget(file)} onArchive={(id) => void runAction(() => documentsApi.archiveDocument(id), "Não foi possível arquivar") } onRestore={(id) => void runAction(() => documentsApi.restoreDocument(id), "Não foi possível restaurar") } onNewVersion={(target) => { setVersionTarget(target); setUploadOpen(true); }} onVersionHistory={setHistoryTarget} onApprove={(id) => void runAction(() => documentsApi.approveDocument(id), "Não foi possível aprovar") } onReject={(id) => { const reason = window.prompt("Motivo da rejeição:"); if (reason) void runAction(() => documentsApi.rejectDocument(id, reason), "Não foi possível rejeitar"); }} onDelete={canDelete && file.archivedAt ? (id) => { if (window.confirm("Excluir definitivamente este arquivo e seu conteúdo?")) void runAction(() => documentsApi.deleteDocument(id), "Não foi possível excluir"); } : undefined} />)}</div> : null}

      {documentsApi.total > 24 ? <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Página {page + 1}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button variant="outline" size="sm" disabled={!documentsApi.hasNextPage} onClick={() => setPage((value) => value + 1)}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div> : null}

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} onUpload={documentsApi.addDocument} clients={clientOptions} projects={projects.map((project) => ({ id: project.id, name: project.name, clientId: project.clientId }))} tasks={taskOptions} diagnostics={diagnosticOptions} meetings={meetingOptions} defaultClientId={lockedClientId ?? clientId} defaultProjectId={lockedProjectId ?? projectId} defaultMeetingId={lockedMeetingId ?? meetingId} versionOf={versionTarget} />
      <DocumentEditDialog document={editTarget} open={Boolean(editTarget)} onOpenChange={(open) => { if (!open) setEditTarget(null); }} onSave={documentsApi.updateDocument} />
      <DocumentVersionDialog document={historyTarget} open={Boolean(historyTarget)} onOpenChange={(open) => { if (!open) setHistoryTarget(null); }} loadVersions={documentsApi.getVersionHistory} />
    </div>
  );
}
