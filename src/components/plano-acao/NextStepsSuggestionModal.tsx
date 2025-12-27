import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ClipboardList, FileSearch } from "lucide-react";

export interface SuggestedNextStep {
  id: string;
  title: string;
  description: string;
  type: "diagnostic" | "task";
  templateId?: string;
  templateName?: string;
  priority: "alta" | "media" | "baixa";
  estimatedTime?: string;
}

interface NextStepsSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosticName: string;
  projectName: string;
  clientName: string;
  suggestions: SuggestedNextStep[];
  onConfirm: (selectedIds: string[]) => Promise<void>;
}

const priorityColors = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-blue-100 text-blue-700",
};

export function NextStepsSuggestionModal({
  open,
  onOpenChange,
  diagnosticName,
  projectName,
  clientName,
  suggestions,
  onConfirm,
}: NextStepsSuggestionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(suggestions.filter((s) => s.priority === "alta").map((s) => s.id))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(Array.from(selectedIds));
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Próximos Passos Sugeridos
          </DialogTitle>
          <DialogDescription>
            Com base no diagnóstico <strong>{diagnosticName}</strong> concluído
            para <strong>{projectName}</strong> ({clientName}), sugerimos as
            seguintes ações:
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma sugestão de próximo passo disponível.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {selectedIds.size} de {suggestions.length} selecionados
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                  >
                    Selecionar todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedIds.has(suggestion.id)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => toggleSelection(suggestion.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(suggestion.id)}
                    onCheckedChange={() => toggleSelection(suggestion.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {suggestion.type === "diagnostic" ? (
                        <FileSearch className="h-4 w-4 text-accent" />
                      ) : (
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm truncate">
                        {suggestion.title}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={priorityColors[suggestion.priority]}
                      >
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="outline">
                        {suggestion.type === "diagnostic"
                          ? "Diagnóstico"
                          : "Tarefa"}
                      </Badge>
                      {suggestion.estimatedTime && (
                        <span className="text-xs text-muted-foreground">
                          ~{suggestion.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Pular por agora
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || selectedIds.size === 0}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              `Criar ${selectedIds.size} ${selectedIds.size === 1 ? "item" : "itens"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
