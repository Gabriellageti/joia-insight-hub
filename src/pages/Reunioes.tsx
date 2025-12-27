import { useState, useCallback } from "react";
import { Plus, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMeetings, type MeetingData } from "@/hooks/useMeetings";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { MeetingMinutesDialog } from "@/components/dialogs/MeetingMinutesDialog";
import { MeetingCard, MeetingCalendarView } from "@/components/meetings";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function Reunioes() {
  const { meetings, loading, deleteMeeting, updateMeeting } = useMeetings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingData | null>(null);
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false);
  const [selectedMeetingForMinutes, setSelectedMeetingForMinutes] = useState<MeetingData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingData | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "month" | "week">("list");

  const upcomingMeetings = meetings.filter((m) => m.status === "scheduled");
  const pastMeetings = meetings.filter((m) => m.status !== "scheduled");

  const handleAddToCalendar = useCallback((meeting: MeetingData, type: "google" | "outlook" | "ics") => {
    const event = createCalendarEventFromMeeting(meeting);
    if (!event) return;

    if (type === "google") {
      window.open(generateGoogleCalendarUrl(event), "_blank");
    } else if (type === "outlook") {
      window.open(generateOutlookCalendarUrl(event), "_blank");
    } else {
      downloadICSFile(event);
    }
  }, []);

  const handleOpenMinutes = useCallback((meeting: MeetingData) => {
    setSelectedMeetingForMinutes(meeting);
    setMinutesDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((meeting: MeetingData, e: React.MouseEvent) => {
    e.stopPropagation();
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  }, []);

  const handleEdit = useCallback((meeting: MeetingData) => {
    setEditingMeeting(meeting);
    setDialogOpen(true);
  }, []);

  const handleMeetingReschedule = useCallback(async (meetingId: string, newDate: string) => {
    await updateMeeting(meetingId, { date: newDate });
  }, [updateMeeting]);

  const confirmDelete = async () => {
    if (meetingToDelete) {
      await deleteMeeting(meetingToDelete.id);
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

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
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList>
              <TabsTrigger value="list" className="gap-1">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1">
                <CalendarDays className="h-4 w-4" />
                Semana
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-1">
                <CalendarDays className="h-4 w-4" />
                Mês
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
      </div>

      {viewMode === "list" ? (
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
              upcomingMeetings.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  onEdit={handleEdit}
                  onOpenMinutes={handleOpenMinutes}
                  onDelete={handleDeleteClick}
                  onAddToCalendar={handleAddToCalendar}
                />
              ))
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
              pastMeetings.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  onEdit={handleEdit}
                  onOpenMinutes={handleOpenMinutes}
                  onDelete={handleDeleteClick}
                  onAddToCalendar={handleAddToCalendar}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <MeetingCalendarView
          meetings={meetings}
          viewMode={viewMode}
          onMeetingClick={handleEdit}
          onMeetingReschedule={handleMeetingReschedule}
        />
      )}

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
