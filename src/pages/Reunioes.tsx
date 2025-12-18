import { useState } from "react";
import { Plus, Video, MapPin, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { Meeting } from "@/types";

const statusConfig = { scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700" }, completed: { label: "Realizada", color: "bg-green-100 text-green-700" }, cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" } };

export default function Reunioes() {
  const { meetings } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const upcomingMeetings = meetings.filter(m => m.status === "scheduled");
  const pastMeetings = meetings.filter(m => m.status !== "scheduled");

  const MeetingCard = ({ meeting }: { meeting: Meeting }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditingMeeting(meeting); setDialogOpen(true); }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div><h3 className="font-semibold">{meeting.title}</h3><p className="text-sm text-muted-foreground">{meeting.projectName}</p><p className="text-xs text-muted-foreground">{meeting.clientName}</p></div>
          <div className="flex flex-col items-end gap-1"><Badge className={statusConfig[meeting.status].color} variant="outline">{statusConfig[meeting.status].label}</Badge>{meeting.hasMinutes && <Badge variant="outline" className="text-xs">Ata disponível</Badge>}</div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{meeting.date}</div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{meeting.time}</div>
          <div className="flex items-center gap-1">{meeting.type === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{meeting.type === "online" ? "Online" : "Presencial"}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Reuniões e Atas</h1><p className="text-muted-foreground">Agende reuniões e registre decisões</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingMeeting(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Nova Reunião</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4"><h2 className="text-lg font-medium">Próximas Reuniões</h2>{upcomingMeetings.length === 0 ? <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma reunião agendada</CardContent></Card> : upcomingMeetings.map((m) => <MeetingCard key={m.id} meeting={m} />)}</div>
        <div className="space-y-4"><h2 className="text-lg font-medium">Reuniões Realizadas</h2>{pastMeetings.map((m) => <MeetingCard key={m.id} meeting={m} />)}</div>
      </div>
      <MeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} meeting={editingMeeting} />
    </div>
  );
}
