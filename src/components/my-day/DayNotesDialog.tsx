import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DayNotesDialogProps {
  open: boolean;
  mode: "start" | "end";
  initialNotes?: string | null;
  summary?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (notes: string) => Promise<void>;
}

export function DayNotesDialog({ open, mode, initialNotes, summary, onOpenChange, onSave }: DayNotesDialogProps) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setNotes(initialNotes || ""); setError(null); } }, [initialNotes, open]);
  const start = mode === "start";

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg">
    <DialogHeader><DialogTitle>{start ? "Começar meu dia" : "Encerrar meu dia"}</DialogTitle><DialogDescription>{start ? "Registre uma intenção breve e escolha suas tarefas de foco na tela." : summary}</DialogDescription></DialogHeader>
    <div className="space-y-2"><Label htmlFor={`day-${mode}-notes`}>{start ? "Prioridade e observação do dia" : "Observações do dia"}</Label><Textarea id={`day-${mode}-notes`} value={notes} maxLength={2000} rows={5} placeholder={start ? "Ex.: Finalizar a auditoria e aguardar retorno do cliente." : "Ex.: Finalizamos a análise e aguardamos os documentos restantes."} onChange={(event) => setNotes(event.target.value)} />{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<p className="text-right text-xs text-muted-foreground">{notes.length}/2000</p></div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={saving} onClick={async () => { setSaving(true); setError(null); try { await onSave(notes); onOpenChange(false); } catch (saveError) { setError((saveError as Error).message || "Não foi possível salvar o registro do dia."); } finally { setSaving(false); } }}>{saving ? "Salvando..." : start ? "Começar" : "Encerrar"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
