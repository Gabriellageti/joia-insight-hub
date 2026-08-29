import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FileItem } from "@/types/documents";

interface DocumentVersionDialogProps {
  document: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadVersions: (versionGroupId: string) => Promise<FileItem[]>;
}

export function DocumentVersionDialog({ document, open, onOpenChange, loadVersions }: DocumentVersionDialogProps) {
  const [versions, setVersions] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !document) return;
    let active = true;
    setLoading(true);
    setError(false);
    void loadVersions(document.versionGroupId).then((items) => { if (active) setVersions(items); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [document, loadVersions, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Versões de {document?.nomeExibicao}</DialogTitle><DialogDescription>Consulte a sequência de versões preservada para este documento.</DialogDescription></DialogHeader>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : null}
        {error ? <p role="alert" className="py-6 text-sm text-destructive">Não foi possível carregar as versões.</p> : null}
        {!loading && !error ? <div className="space-y-2">{versions.map((version) => <div key={version.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{version.nomeArquivo}</p><p className="text-sm text-muted-foreground">{new Date(version.uploadedAt).toLocaleString("pt-BR")} · {version.uploadedByName || "Usuário"}</p></div><Badge variant={version.id === document?.id ? "default" : "secondary"}>v{version.versao}</Badge></div>)}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
