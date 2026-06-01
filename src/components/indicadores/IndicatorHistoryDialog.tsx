import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Indicator } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro ao registrar valor";

interface IndicatorHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: Indicator;
  onSuccess?: () => void;
}

export function IndicatorHistoryDialog({
  open,
  onOpenChange,
  indicator,
  onSuccess,
}: IndicatorHistoryDialogProps) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!value) {
      toast.error("Informe o valor");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("indicator_history").insert({
        indicator_id: indicator.id,
        value: Number(value),
        recorded_at: date,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      toast.success("Valor registrado com sucesso");
      setValue("");
      setNotes("");
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Erro ao registrar valor:", err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Valor: {indicator.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">
                Valor {indicator.unit && `(${indicator.unit})`}
              </Label>
              <Input
                id="value"
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto ou justificativa do valor..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
