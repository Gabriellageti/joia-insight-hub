import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMeetings, type MeetingData } from "@/hooks/useMeetings";
import { MEETING_TEMPLATES, generateTemplateContent, type MeetingTemplate } from "@/lib/meeting-templates";
import { toast } from "sonner";
import { FileText, Wand2 } from "lucide-react";

interface MeetingMinutesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: MeetingData | null;
}

export function MeetingMinutesDialog({ open, onOpenChange, meeting }: MeetingMinutesDialogProps) {
  const { updateMeeting } = useMeetings();
  const [loading, setLoading] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (meeting) {
      setMinutes(meeting.minutes || "");
      setSelectedTemplate("");
    }
  }, [meeting, open]);

  const handleApplyTemplate = (templateId: string) => {
    const template = MEETING_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const content = generateTemplateContent(template);
      if (minutes.trim()) {
        // Append to existing content
        setMinutes((prev) => prev + "\n\n---\n\n" + content);
      } else {
        setMinutes(content);
      }
      setSelectedTemplate(templateId);
      toast.success(`Template "${template.name}" aplicado`);
    }
  };

  const handleSave = async () => {
    if (!meeting) return;

    setLoading(true);
    try {
      await updateMeeting(meeting.id, {
        minutes,
        hasMinutes: minutes.trim().length > 0,
      });
      toast.success("Ata salva com sucesso");
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ata da Reunião: {meeting.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Editor da ata da reunião com aplicação de templates.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            {meeting.date} às {meeting.time} • {meeting.projectName}
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Usar Template
            </Label>
            <div className="flex flex-wrap gap-2">
              {MEETING_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleApplyTemplate(template.id)}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em um template para aplicar a estrutura pré-definida
            </p>
          </div>

          <div className="flex-1 space-y-2 min-h-0">
            <Label htmlFor="minutes">Conteúdo da Ata</Label>
            <Textarea
              id="minutes"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Digite aqui o conteúdo da ata ou selecione um template acima para começar..."
              className="h-[400px] font-mono text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Ata"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
