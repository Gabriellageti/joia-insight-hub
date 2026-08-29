import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_CATEGORIES, type DocumentCategory, type FileItem, type FileVisibility } from "@/types/documents";

interface DocumentEditDialogProps {
  document: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<FileItem>) => Promise<void>;
}

export function DocumentEditDialog({ document, open, onOpenChange, onSave }: DocumentEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [visibility, setVisibility] = useState<FileVisibility>("Interno");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!document) return;
    setName(document.nomeExibicao);
    setDescription(document.descricao ?? "");
    setCategory(document.categoriaId);
    setVisibility(document.visibilidade);
  }, [document]);

  const handleSave = async () => {
    if (!document || !name.trim()) return;
    setSaving(true);
    try {
      await onSave(document.id, { nomeExibicao: name.trim(), descricao: description.trim(), categoriaId: category, visibilidade: visibility });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar documento</DialogTitle><DialogDescription>Atualize o nome, a descrição, a categoria e a visibilidade.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label htmlFor="edit-document-name">Nome</Label><Input id="edit-document-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={180} /></div>
          <div className="space-y-2"><Label htmlFor="edit-document-description">Descrição</Label><Textarea id="edit-document-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={4} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Categoria</Label><Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOCUMENT_CATEGORIES.filter((item) => item.id !== "all").map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Visibilidade</Label><Select value={visibility} onValueChange={(value) => setVisibility(value as FileVisibility)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Interno">Interno</SelectItem><SelectItem value="Cliente">Cliente</SelectItem><SelectItem value="Ambos">Ambos</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={() => void handleSave()} disabled={saving || !name.trim()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
