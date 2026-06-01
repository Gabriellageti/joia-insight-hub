import { useState, useCallback, useMemo } from "react";
import { Upload, X, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  FileItem,
  DocumentCategory,
  FileType,
  FileVisibility,
  DOCUMENT_CATEGORIES,
  SUGGESTED_TAGS,
} from "@/types/documents";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ocorreu um erro ao enviar o arquivo.";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: Omit<FileItem, "id" | "uploadedAt">) => void;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  tasks: { id: string; title: string; projectId: string }[];
  diagnostics: { id: string; name: string; projectId: string }[];
  meetings: { id: string; title: string; projectId: string }[];
  defaultClientId?: string | null;
  defaultProjectId?: string | null;
}

export function UploadModal({
  open,
  onOpenChange,
  onUpload,
  clients,
  projects,
  tasks,
  diagnostics,
  meetings,
  defaultClientId,
  defaultProjectId,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState<string | null>(defaultClientId ?? null);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId ?? null);
  const [category, setCategory] = useState<DocumentCategory>("contracts");
  const [tipo, setTipo] = useState<FileType>("Documento");
  const [visibilidade, setVisibilidade] = useState<FileVisibility>("Interno");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [descricaoCurta, setDescricaoCurta] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const availableProjects = useMemo(() => {
    if (clientId) {
      return projects.filter((p) => p.clientId === clientId);
    }
    return projects;
  }, [clientId, projects]);

  const availableTasks = useMemo(() => {
    if (projectId) {
      return tasks.filter((t) => t.projectId === projectId);
    }
    return tasks;
  }, [projectId, tasks]);

  const availableDiagnostics = useMemo(() => {
    if (projectId) {
      return diagnostics.filter((d) => d.projectId === projectId);
    }
    return diagnostics;
  }, [projectId, diagnostics]);

  const availableMeetings = useMemo(() => {
    if (projectId) {
      return meetings.filter((m) => m.projectId === projectId);
    }
    return meetings;
  }, [projectId, meetings]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedProject = availableProjects.find((p) => p.id === projectId);

  const suggestedName = useMemo(() => {
    const parts: string[] = [];
    if (selectedClient) parts.push(selectedClient.name);
    if (selectedProject) parts.push(selectedProject.name);
    
    const categoryLabel = DOCUMENT_CATEGORIES.find(c => c.id === category)?.name || category;
    parts.push(categoryLabel);
    
    const today = new Date().toISOString().split("T")[0];
    parts.push(today);
    
    if (descricaoCurta.trim()) {
      parts.push(descricaoCurta.trim());
    }
    
    return parts.join("_");
  }, [selectedClient, selectedProject, category, descricaoCurta]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags((prev) => [...prev, customTag.trim()]);
      setCustomTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${timestamp}_${sanitizedName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const fileItem: Omit<FileItem, "id" | "uploadedAt"> = {
        nomeArquivo: file.name,
        nomeExibicao: suggestedName || file.name,
        clienteId: clientId ?? undefined,
        clienteNome: selectedClient?.name,
        projetoId: projectId ?? undefined,
        projetoNome: selectedProject?.name,
        categoriaId: category,
        tags,
        tipo,
        statusEvidencia: tipo === "Evidência" ? "Pendente" : undefined,
        visibilidade,
        vinculos: {
          taskId: taskId ?? undefined,
          diagnosticId: diagnosticId ?? undefined,
          meetingId: meetingId ?? undefined,
        },
        tamanhoBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedBy: "current-user",
        url: publicUrl,
      };

      onUpload(fileItem);

      toast({
        title: "Arquivo enviado",
        description: `${file.name} foi enviado com sucesso.`,
      });

      // Reset form
      setFile(null);
      setClientId(defaultClientId ?? null);
      setProjectId(defaultProjectId ?? null);
      setCategory("contracts");
      setTipo("Documento");
      setVisibilidade("Interno");
      setTags([]);
      setDescricaoCurta("");
      setTaskId(null);
      setDiagnosticId(null);
      setMeetingId(null);

      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClientChange = (value: string) => {
    setClientId(value === "none" ? null : value);
    setProjectId(null);
    setTaskId(null);
    setDiagnosticId(null);
    setMeetingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              file ? "border-accent bg-accent/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <Check className="h-5 w-5 text-accent" />
                <span className="font-medium">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste um arquivo ou{" "}
                  <label className="text-accent cursor-pointer hover:underline">
                    selecione
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </p>
              </div>
            )}
          </div>

          {/* Client & Project */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId ?? "none"} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select
                value={projectId ?? "none"}
                onValueChange={(v) => setProjectId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="none">Nenhum</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {DOCUMENT_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as FileType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="Documento">Documento</SelectItem>
                  <SelectItem value="Evidência">Evidência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibilidade *</Label>
            <Select value={visibilidade} onValueChange={(v) => setVisibilidade(v as FileVisibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="Interno">Interno</SelectItem>
                <SelectItem value="Cliente">Cliente</SelectItem>
                <SelectItem value="Ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <Popover open={tagsPopoverOpen} onOpenChange={setTagsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {tags.length > 0
                    ? `${tags.length} tag(s) selecionada(s)`
                    : "Selecionar tags"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-3 bg-popover z-50">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_TAGS.map((tag) => (
                      <Badge
                        key={tag}
                        variant={tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova tag..."
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                    />
                    <Button size="sm" onClick={addCustomTag}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description for auto name */}
          <div className="space-y-2">
            <Label>Descrição curta (para nome automático)</Label>
            <Input
              placeholder="Ex: Contrato Principal, Ata Kickoff..."
              value={descricaoCurta}
              onChange={(e) => setDescricaoCurta(e.target.value)}
            />
          </div>

          {/* Auto-suggested name */}
          {file && (
            <div className="space-y-2">
              <Label>Nome sugerido</Label>
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                {suggestedName}
              </div>
            </div>
          )}

          {/* Link to entities */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Relacionar a (opcional)</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tarefa</Label>
                <Select
                  value={taskId ?? "none"}
                  onValueChange={(v) => setTaskId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {availableTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Diagnóstico</Label>
                <Select
                  value={diagnosticId ?? "none"}
                  onValueChange={(v) => setDiagnosticId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {availableDiagnostics.map((diag) => (
                      <SelectItem key={diag.id} value={diag.id}>
                        {diag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reunião</Label>
                <Select
                  value={meetingId ?? "none"}
                  onValueChange={(v) => setMeetingId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {availableMeetings.map((meeting) => (
                      <SelectItem key={meeting.id} value={meeting.id}>
                        {meeting.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Warning if no client/project */}
          {!clientId && !projectId && (
            <div className="text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg">
              Este arquivo será marcado como "Sem vínculo" pois não possui cliente ou projeto.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !file}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
