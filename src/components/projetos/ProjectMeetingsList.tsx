import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, ExternalLink } from "lucide-react";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import type { Meeting, Project } from "@/types";

interface ProjectMeetingsListProps {
  meetings: Meeting[];
  project: Project;
}

const statusConfig = {
  scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em andamento", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Realizada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
};

export function ProjectMeetingsList({ meetings, project }: ProjectMeetingsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const sortedMeetings = useMemo(() => {
    const now = new Date();
    return [...meetings]
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [meetings]);

  const upcomingMeetings = sortedMeetings.filter(
    (m) => m.status === "scheduled" && new Date(m.date) >= new Date()
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Reuniões</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Agendar
        </Button>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Agendar reunião
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingMeetings.length > 0 && (
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Próximas reuniões:
              </p>
            )}
            {sortedMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                to={`/reunioes/${meeting.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{meeting.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {meeting.date} às {meeting.time}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={statusConfig[meeting.status]?.color || ""}
                >
                  {statusConfig[meeting.status]?.label || meeting.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>

      <MeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meeting={{
          id: "",
          title: "",
          projectId: project.id,
          projectName: project.name,
          clientId: project.clientId,
          clientName: project.clientName,
          date: "",
          time: "",
          type: "online",
          status: "scheduled",
          participants: [],
          hasMinutes: false,
          createdAt: "",
        }}
      />
    </Card>
  );
}
