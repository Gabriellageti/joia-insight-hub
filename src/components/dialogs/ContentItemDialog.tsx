import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { ContentItem } from "@/types";
import { toast } from "sonner";

interface ContentItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItem?: ContentItem | null;
}

export function ContentItemDialog({ open, onOpenChange, contentItem }: ContentItemDialogProps) {
  const { addContentItem, updateContentItem } = useData();
  const isEditing = Boolean(contentItem?.id);
  const [formData, setFormData] = useState({
    title: "",
    type: "Post" as ContentItem["type"],
    status: "idea" as ContentItem["status"],
    publishDate: "",
    tags: [] as string[],
    tagsInput: "",
  });

  useEffect(() => {
    if (contentItem) {
      setFormData({
        title: contentItem.title,
        type: contentItem.type,
        status: contentItem.status,
        publishDate: contentItem.publishDate || "",
        tags: contentItem.tags || [],
        tagsInput: (contentItem.tags || []).join(", "),
      });
    } else {
      setFormData({
        title: "",
        type: "Post",
        status: "idea",
        publishDate: "",
        tags: [],
        tagsInput: "",
      });
    }
  }, [contentItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    const tags = formData.tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const data = {
      title: formData.title,
      type: formData.type,
      status: formData.status,
      publishDate: formData.publishDate || undefined,
      tags,
    };

    try {
      if (isEditing && contentItem?.id) {
        await updateContentItem(contentItem.id, data);
        toast.success("Conteúdo atualizado com sucesso");
      } else {
        await addContentItem(data);
        toast.success("Conteúdo criado com sucesso");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar conteúdo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário de conteúdo com tipo, status e tags.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título do conteúdo"
              />
            </div>
            <div className="mobile-form-grid grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: ContentItem["type"]) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Artigo">Artigo</SelectItem>
                    <SelectItem value="Case">Case</SelectItem>
                    <SelectItem value="Post">Post</SelectItem>
                    <SelectItem value="Webinar">Webinar</SelectItem>
                    <SelectItem value="Video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: ContentItem["status"]) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Ideia</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="review">Revisão</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="publishDate">Data de Publicação</Label>
              <Input
                id="publishDate"
                type="date"
                value={formData.publishDate}
                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tagsInput}
                onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                placeholder="marketing, vendas, dicas"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
