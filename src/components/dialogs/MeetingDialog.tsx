import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Meeting } from "@/types";
import { toast } from "sonner";

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
}

export function MeetingDialog({ open, onOpenChange, meeting }: MeetingDialogProps) {
  const { addMeeting, updateMeeting, projects, clients } = useData();
  const [formData, setFormData] = useState({
    title: "",
    projectId: "",
    projectName: "",
    clientId: "",
    clientName: "",
    date: "",
    time: "",
    type: "online" as "online" | "presencial",
    location: "",
    link: "",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
    agenda: "",
    participants: [] as string[],
    hasMinutes: false,
  });
  const [participantsInput, setParticipantsInput] = useState("");

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title,
        projectId: meeting.projectId,
        projectName: meeting.projectName,
        clientId: meeting.clientId,
        clientName: meeting.clientName,
        date: meeting.date,
        time: meeting.time,
        type: meeting.type,
        location: meeting.location || "",
        link: meeting.link || "",
        status: meeting.status,
        agenda: meeting.agenda || "",
        participants: meeting.participants,
        hasMinutes: meeting.hasMinutes,
      });
      setParticipantsInput(meeting.participants.join(", "));
    } else {
      setFormData({
        title: "",
        projectId: "",
        projectName: "",
        clientId: "",
        clientName: "",
        date: "",
        time: "",
        type: "online",
        location: "",
        link: "",
        status: "scheduled",
        agenda: "",
        participants: [],
        hasMinutes: false,
      });
      setParticipantsInput("");
    }
  }, [meeting, open]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const client = clients.find(c => c.id === project?.clientId);
    setFormData({ 
      ...formData, 
      projectId, 
      projectName: project?.name || "",
      clientId: project?.clientId || "",
      clientName: client?.name || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!formData.projectId) {
      toast.error("Selecione um projeto");
      return;
    }
    if (!formData.date || !formData.time) {
      toast.error("Data e hora são obrigatórios");
      return;
    }

    const participants = participantsInput.split(",").map(p => p.trim()).filter(Boolean);

    const meetingData = {
      ...formData,
      participants,
    };

    if (meeting) {
      updateMeeting(meeting.id, meetingData);
      toast.success("Reunião atualizada com sucesso");
    } else {
      addMeeting(meetingData);
      toast.success("Reunião criada com sucesso");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{meeting ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título da reunião"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Projeto *</Label>
              <Select value={formData.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value: "online" | "presencial") => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="14:00"
              />
            </div>
            {formData.type === "online" ? (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="link">Link da Reunião</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            ) : (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Endereço"
                />
              </div>
            )}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="participants">Participantes</Label>
              <Input
                id="participants"
                value={participantsInput}
                onChange={(e) => setParticipantsInput(e.target.value)}
                placeholder="Nome 1, Nome 2, Nome 3"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="agenda">Pauta</Label>
              <Textarea
                id="agenda"
                value={formData.agenda}
                onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                placeholder="Pontos a serem discutidos"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: "scheduled" | "completed" | "cancelled") => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="completed">Realizada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {meeting ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
