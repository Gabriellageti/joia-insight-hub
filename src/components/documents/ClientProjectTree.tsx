import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from "lucide-react";
import { FileItem, DocumentCategory, DOCUMENT_CATEGORIES } from "@/types/documents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TreeNode {
  id: string;
  name: string;
  type: "client" | "project" | "category" | "file";
  children?: TreeNode[];
  file?: FileItem;
}

interface ClientProjectTreeProps {
  files: FileItem[];
  onFileClick?: (file: FileItem) => void;
}

export function ClientProjectTree({ files, onFileClick }: ClientProjectTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    const clientMap = new Map<string, { name: string; projects: Map<string, { name: string; files: FileItem[] }> }>();
    const unlinkedFiles: FileItem[] = [];

    files.forEach((file) => {
      if (!file.clienteId) {
        unlinkedFiles.push(file);
        return;
      }

      if (!clientMap.has(file.clienteId)) {
        clientMap.set(file.clienteId, {
          name: file.clienteNome || "Cliente desconhecido",
          projects: new Map(),
        });
      }

      const client = clientMap.get(file.clienteId)!;
      const projectKey = file.projetoId || "sem-projeto";
      const projectName = file.projetoNome || "Sem projeto";

      if (!client.projects.has(projectKey)) {
        client.projects.set(projectKey, { name: projectName, files: [] });
      }

      client.projects.get(projectKey)!.files.push(file);
    });

    const treeNodes: TreeNode[] = [];

    clientMap.forEach((clientData, clientId) => {
      const projectNodes: TreeNode[] = [];

      clientData.projects.forEach((projectData, projectId) => {
        // Group files by category within project
        const categoryMap = new Map<DocumentCategory, FileItem[]>();
        projectData.files.forEach((file) => {
          if (!categoryMap.has(file.categoriaId)) {
            categoryMap.set(file.categoriaId, []);
          }
          categoryMap.get(file.categoriaId)!.push(file);
        });

        const categoryNodes: TreeNode[] = [];
        categoryMap.forEach((categoryFiles, categoryId) => {
          const categoryInfo = DOCUMENT_CATEGORIES.find((c) => c.id === categoryId);
          categoryNodes.push({
            id: `${clientId}-${projectId}-${categoryId}`,
            name: categoryInfo?.name || categoryId,
            type: "category",
            children: categoryFiles.map((file) => ({
              id: file.id,
              name: file.nomeExibicao,
              type: "file" as const,
              file,
            })),
          });
        });

        projectNodes.push({
          id: `${clientId}-${projectId}`,
          name: projectData.name,
          type: "project",
          children: categoryNodes,
        });
      });

      treeNodes.push({
        id: clientId,
        name: clientData.name,
        type: "client",
        children: projectNodes,
      });
    });

    // Add unlinked files
    if (unlinkedFiles.length > 0) {
      const categoryMap = new Map<DocumentCategory, FileItem[]>();
      unlinkedFiles.forEach((file) => {
        if (!categoryMap.has(file.categoriaId)) {
          categoryMap.set(file.categoriaId, []);
        }
        categoryMap.get(file.categoriaId)!.push(file);
      });

      const categoryNodes: TreeNode[] = [];
      categoryMap.forEach((categoryFiles, categoryId) => {
        const categoryInfo = DOCUMENT_CATEGORIES.find((c) => c.id === categoryId);
        categoryNodes.push({
          id: `unlinked-${categoryId}`,
          name: categoryInfo?.name || categoryId,
          type: "category",
          children: categoryFiles.map((file) => ({
            id: file.id,
            name: file.nomeExibicao,
            type: "file" as const,
            file,
          })),
        });
      });

      treeNodes.push({
        id: "unlinked",
        name: "Sem vínculo",
        type: "client",
        children: categoryNodes,
      });
    }

    return treeNodes;
  }, [files]);

  const toggleExpand = (nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = depth * 16 + 8;

    if (node.type === "file") {
      return (
        <button
          key={node.id}
          className="w-full flex items-center gap-2 py-1.5 px-2 hover:bg-muted rounded text-left text-sm"
          style={{ paddingLeft }}
          onClick={() => node.file && onFileClick?.(node.file)}
        >
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      );
    }

    const FolderIcon = isExpanded ? FolderOpen : Folder;
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <div key={node.id}>
        <button
          className={cn(
            "w-full flex items-center gap-2 py-1.5 px-2 hover:bg-muted rounded text-left",
            node.type === "client" && "font-medium"
          )}
          style={{ paddingLeft }}
          onClick={() => toggleExpand(node.id)}
        >
          {hasChildren && (
            <ChevronIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          {!hasChildren && <div className="w-4" />}
          <FolderIcon className={cn(
            "h-4 w-4 shrink-0",
            node.type === "client" ? "text-accent" : "text-muted-foreground"
          )} />
          <span className="truncate text-sm">{node.name}</span>
          {hasChildren && (
            <span className="text-xs text-muted-foreground ml-auto">
              ({node.children!.length})
            </span>
          )}
        </button>
        
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum documento encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => renderNode(node))}
    </div>
  );
}
