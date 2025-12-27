import { useState } from "react";
import { Plus, Video, MapPin, Calendar as CalendarIcon, Clock, Trash2, ExternalLink, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMeetings, type MeetingData } from "@/hooks/useMeetings";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { MeetingMinutesDialog } from "@/components/dialogs/MeetingMinutesDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createCalendarEventFromMeeting,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICSFile,
} from "@/lib/calendar-integration";

const statusConfig = {
  scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  completed: { label: "Realizada", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export default function Reunioes() {
  const { meetings, loading, deleteMeeting } = useMeetings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingData | null>(null);
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false);
  const [selectedMeetingForMinutes, setSelectedMeetingForMinutes] = useState<MeetingData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingData | null>(null);

  const upcomingMeetings = meetings.filter((m) => m.status === "scheduled");
  const pastMeetings = meetings.filter((m) => m.status !== "scheduled");

  const handleAddToCalendar = (meeting: MeetingData, type: "google" | "outlook" | "ics") => {
    const event = createCalendarEventFromMeeting(meeting);
    if (!event) return;

    if (type === "google") {
      window.open(generateGoogleCalendarUrl(event), "_blank");
    } else if (type === "outlook") {
      window.open(generateOutlookCalendarUrl(event), "_blank");
    } else {
      downloadICSFile(event);
    }
  };

  const handleOpenMinutes = (meeting: MeetingData) => {
    setSelectedMeetingForMinutes(meeting);
    setMinutesDialogOpen(true);
  };

  const handleDeleteClick = (meeting: MeetingData, e: React.MouseEvent) => {
    e.stopPropagation();
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (meetingToDelete) {
      await deleteMeeting(meetingToDelete.id);
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

  const MeetingCard = ({ meeting }: { meeting: MeetingData }) => (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => {
        setEditingMeeting(meeting);
        setDialogOpen(true);
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{meeting.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{meeting.projectName}</p>
            <p className="text-xs text-muted-foreground truncate">{meeting.clientName}</p>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
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
          <div className="flex items-center gap-1">
            {meeting.type === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {meeting.type === "online" ? "Online" : "Presencial"}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <CalendarIcon className="h-3 w-3 mr-1" />
                Adicionar ao Calendário
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddToCalendar(meeting, "google"); }}>
                <ExternalLink className="h-3 w-3 mr-2" />
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddToCalendar(meeting, "outlook"); }}>
                <ExternalLink className="h-3 w-3 mr-2" />
                Outlook
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddToCalendar(meeting, "ics"); }}>
                <Download className="h-3 w-3 mr-2" />
                Baixar .ICS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMinutes(meeting);
            }}
          >
            <FileText className="h-3 w-3 mr-1" />
            {meeting.hasMinutes ? "Ver Ata" : "Criar Ata"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
            onClick={(e) => handleDeleteClick(meeting, e)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reuniões e Atas</h1>
          <p className="text-muted-foreground">Agende reuniões e registre decisões</p>
        </div>
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => {
            setEditingMeeting(null);
            setDialogOpen(true);
          }}
        >
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
            upcomingMeetings.map((m) => <MeetingCard key={m.id} meeting={m} />)
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium">Reuniões Realizadas</h2>
          {pastMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma reunião realizada ainda
              </CardContent>
            </Card>
          ) : (
            pastMeetings.map((m) => <MeetingCard key={m.id} meeting={m} />)
          )}
        </div>
      </div>

      <MeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} meeting={editingMeeting} />

      <MeetingMinutesDialog
        open={minutesDialogOpen}
        onOpenChange={setMinutesDialogOpen}
        meeting={selectedMeetingForMinutes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A reunião "{meetingToDelete?.title}" será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
