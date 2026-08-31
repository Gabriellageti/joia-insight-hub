import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  MoreVertical,
  Download,
  Pencil,
  FolderInput,
  Tag,
  Eye,
  Link,
  Check,
  X,
  Trash2,
  Archive,
  ArchiveRestore,
  History,
  UploadCloud,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileItem, EvidenceStatus } from "@/types/documents";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileCardProps {
  file: FileItem;
  onRename?: (id: string, newName: string) => void;
  onMoveCategory?: (id: string) => void;
  onEditTags?: (id: string) => void;
  onChangeVisibility?: (id: string) => void;
  onLink?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onNewVersion?: (file: FileItem) => void;
  onVersionHistory?: (file: FileItem) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) {
    return { icon: FileText, colorClass: "text-red-500" };
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return { icon: FileSpreadsheet, colorClass: "text-green-500" };
  }
  if (mimeType.includes("word") || mimeType.includes("document")) {
    return { icon: FileText, colorClass: "text-blue-500" };
  }
  if (mimeType.includes("image")) {
    return { icon: FileImage, colorClass: "text-purple-500" };
  }
  return { icon: File, colorClass: "text-muted-foreground" };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

function getStatusBadgeVariant(status: EvidenceStatus): "default" | "secondary" | "destructive" {
  switch (status) {
    case "Aprovada":
      return "default";
    case "Pendente":
      return "secondary";
    case "Rejeitada":
      return "destructive";
    default:
      return "secondary";
  }
}

export function FileCard({
  file,
  onRename,
  onMoveCategory,
  onEditTags,
  onChangeVisibility,
  onLink,
  onApprove,
  onReject,
  onDelete,
  onArchive,
  onRestore,
  onNewVersion,
  onVersionHistory,
}: FileCardProps) {
  const [opening, setOpening] = useState(false);
  const { icon: FileIcon, colorClass } = getFileIcon(file.mimeType);
  const isEvidence = file.tipo === "Evidência";
  const displayTags = file.tags.slice(0, 2);
  const remainingTags = file.tags.length - 2;

  const openDocument = async () => {
    const path = file.storagePath || file.url;
    if (!path || opening) return;
    setOpening(true);
    try {
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir este documento.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* File Icon */}
          <div className={cn("p-2 rounded bg-muted shrink-0", colorClass)}>
            <FileIcon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* File Name */}
            <h4 className="font-medium text-sm line-clamp-2 text-foreground">
              {file.nomeExibicao}
            </h4>
            {file.descricao ? <p className="line-clamp-2 text-xs text-muted-foreground">{file.descricao}</p> : null}

            {/* Client/Project */}
            {(file.clienteNome || file.projetoNome) && (
              <div className="text-xs text-muted-foreground">
                {file.clienteNome && <span>{file.clienteNome}</span>}
                {file.clienteNome && file.projetoNome && <span> • </span>}
                {file.projetoNome && <span>{file.projetoNome}</span>}
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(file.uploadedAt)}</span>
              <span>•</span>
              <span>{formatFileSize(file.tamanhoBytes)}</span>
              {file.uploadedByName ? <><span>•</span><span>{file.uploadedByName}</span></> : null}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              {/* Type Badge */}
              <Badge variant="outline" className="text-xs">
                {file.tipo}
              </Badge>
              <Badge variant="secondary" className="text-xs">v{file.versao}</Badge>
              {file.archivedAt ? <Badge variant="outline" className="text-xs">Arquivado</Badge> : null}

              {/* Evidence Status */}
              {isEvidence && file.statusEvidencia && (
                <Badge 
                  variant={getStatusBadgeVariant(file.statusEvidencia)}
                  className="text-xs"
                >
                  {file.statusEvidencia}
                </Badge>
              )}

              {/* Visibility */}
              <Badge variant="outline" className="text-xs">
                {file.visibilidade}
              </Badge>

              {/* Tags */}
              {displayTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {remainingTags > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{remainingTags}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={`Abrir ações de ${file.nomeExibicao}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
              <DropdownMenuItem 
                onClick={() => void openDocument()}
                disabled={!(file.storagePath || file.url) || opening}
              >
                <Download className="h-4 w-4 mr-2" />
                {opening ? "Abrindo..." : "Abrir / Baixar"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename?.(file.id, file.nomeExibicao)}>
                <Pencil className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveCategory?.(file.id)}>
                <FolderInput className="h-4 w-4 mr-2" />
                Mover categoria
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditTags?.(file.id)}>
                <Tag className="h-4 w-4 mr-2" />
                Editar tags
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeVisibility?.(file.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Alterar visibilidade
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLink?.(file.id)}>
                <Link className="h-4 w-4 mr-2" />
                Vincular a...
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNewVersion?.(file)}>
                <UploadCloud className="h-4 w-4 mr-2" />
                Adicionar versão
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onVersionHistory?.(file)}>
                <History className="h-4 w-4 mr-2" />
                Histórico de versões
              </DropdownMenuItem>
              
              {isEvidence && (
                <>
                  <DropdownMenuSeparator />
                  {file.statusEvidencia !== "Aprovada" && (
                    <DropdownMenuItem 
                      onClick={() => onApprove?.(file.id)}
                      className="text-green-600"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Marcar como Aprovada
                    </DropdownMenuItem>
                  )}
                  {file.statusEvidencia !== "Rejeitada" && (
                    <DropdownMenuItem 
                      onClick={() => onReject?.(file.id)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Marcar como Rejeitada
                    </DropdownMenuItem>
                  )}
                </>
              )}

              <DropdownMenuSeparator />
              {file.archivedAt ? (
                <DropdownMenuItem onClick={() => onRestore?.(file.id)}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onArchive?.(file.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
              )}
              {onDelete ? (
                <DropdownMenuItem onClick={() => onDelete(file.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir definitivamente
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
