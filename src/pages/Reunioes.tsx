import { Plus, Video, MapPin, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Meeting {
  id: string;
  title: string;
  project: string;
  client: string;
  date: string;
  time: string;
  type: "online" | "presencial";
  status: "scheduled" | "completed" | "cancelled";
  hasMinutes: boolean;
}

const mockMeetings: Meeting[] = [
  { id: "1", title: "Reunião de Alinhamento Semanal", project: "Otimização de Compras", client: "Empresa ABC", date: "18/12/2024", time: "14:00", type: "online", status: "scheduled", hasMinutes: false },
  { id: "2", title: "Review do Diagnóstico", project: "Gestão de Estoque", client: "Indústria XYZ", date: "19/12/2024", time: "10:00", type: "presencial", status: "scheduled", hasMinutes: false },
  { id: "3", title: "Apresentação de Resultados", project: "Processos de Vendas", client: "Serviços JKL", date: "16/12/2024", time: "15:30", type: "online", status: "completed", hasMinutes: true },
  { id: "4", title: "Kickoff do Projeto", project: "Controle Financeiro", client: "Comércio 123", date: "15/12/2024", time: "09:00", type: "online", status: "completed", hasMinutes: true },
];

const statusConfig = {
  scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Realizada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function Reunioes() {
  const upcomingMeetings = mockMeetings.filter(m => m.status === "scheduled");
  const pastMeetings = mockMeetings.filter(m => m.status !== "scheduled");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reuniões e Atas</h1>
          <p className="text-muted-foreground">Agende reuniões e registre decisões</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" />
          Nova Reunião
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Próximas Reuniões</h2>
          {upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma reunião agendada
              </CardContent>
            </Card>
          ) : (
            upcomingMeetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{meeting.title}</h3>
                      <p className="text-sm text-muted-foreground">{meeting.project}</p>
                      <p className="text-xs text-muted-foreground">{meeting.client}</p>
                    </div>
                    <Badge className={statusConfig[meeting.status].color} variant="outline">
                      {statusConfig[meeting.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {meeting.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meeting.time}
                    </div>
                    <div className="flex items-center gap-1">
                      {meeting.type === "online" ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <MapPin className="h-3 w-3" />
                      )}
                      {meeting.type === "online" ? "Online" : "Presencial"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium">Reuniões Realizadas</h2>
          {pastMeetings.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{meeting.title}</h3>
                    <p className="text-sm text-muted-foreground">{meeting.project}</p>
                    <p className="text-xs text-muted-foreground">{meeting.client}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusConfig[meeting.status].color} variant="outline">
                      {statusConfig[meeting.status].label}
                    </Badge>
                    {meeting.hasMinutes && (
                      <Badge variant="outline" className="text-xs">
                        Ata disponível
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {meeting.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {meeting.time}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
