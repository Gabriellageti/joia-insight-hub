import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, List, CalendarDays, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMeetings, type MeetingData } from "@/hooks/useMeetings";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { MeetingMinutesDialog } from "@/components/dialogs/MeetingMinutesDialog";
import { MeetingCard, MeetingCalendarView } from "@/components/meetings";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const navigate = useNavigate();
  const { meetings, loading, error, refetch, deleteMeeting, updateMeeting } = useMeetings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false);
  const [selectedMeetingForMinutes, setSelectedMeetingForMinutes] = useState<MeetingData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingData | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "month" | "week">("list");
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const filteredMeetings = useMemo(() => meetings.filter((meeting) => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return (!query || [meeting.title, meeting.clientName, meeting.projectName].some((value) => value.toLocaleLowerCase("pt-BR").includes(query)))
      && (statusFilter === "all" || meeting.status === statusFilter)
      && (clientFilter === "all" || meeting.clientId === clientFilter);
  }), [clientFilter, meetings, search, statusFilter]);
  const upcomingMeetings = filteredMeetings.filter((meeting) => meeting.status === "scheduled" || meeting.status === "in_progress");
  const pastMeetings = filteredMeetings.filter((meeting) => meeting.status === "completed" || meeting.status === "cancelled");
  const staleMeetings = meetings.filter((meeting) => {
    if (meeting.status !== "scheduled") return false;
    const [day, month, year] = meeting.date.split("/").map(Number);
    const [hours, minutes] = meeting.time.split(":").map(Number);
    const value = new Date(year, month - 1, day, hours || 0, minutes || 0);
    return !Number.isNaN(value.getTime()) && value < new Date();
  });
  const completedWithoutActions = meetings.filter((meeting) => meeting.status === "completed" && meeting.hasActions === false);
  const clientOptions = useMemo(() => [...new Map(meetings.filter((meeting) => meeting.clientId).map((meeting) => [meeting.clientId!, meeting.clientName])).entries()], [meetings]);

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

  const handleMeetingReschedule = useCallback(async (meetingId: string, newDate: string) => {
    await updateMeeting(meetingId, { date: newDate });
  }, [updateMeeting]);

  const confirmDelete = async () => {
    if (!meetingToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteMeeting(meetingToDelete.id);
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    } catch {
      // The dialog remains open and the hook reports the persisted failure.
    } finally {
      setDeleting(false);
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

  if (error) return <div className="rounded-md border border-destructive/50 p-6 text-center space-y-3" role="alert"><p>{error}</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reuniões e Atas</h1>
          <p className="text-muted-foreground">Agende reuniões e registre decisões</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="min-w-0">
            <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="list" className="gap-1 shrink-0">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1 shrink-0">
                <CalendarDays className="h-4 w-4" />
                Semana
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-1 shrink-0">
                <CalendarDays className="h-4 w-4" />
                Mês
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Reunião
          </Button>
        </div>
      </div>

      {staleMeetings.length ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{staleMeetings.length} reunião(ões) pendente(s)</AlertTitle><AlertDescription>Há reuniões cuja data passou e que continuam agendadas. Abra os registros para concluir ou cancelar.</AlertDescription></Alert> : null}
      {completedWithoutActions.length ? <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>{completedWithoutActions.length} reunião(ões) concluída(s) sem ações</AlertTitle><AlertDescription>Revise as decisões e próximos passos para evitar perda de acompanhamento.</AlertDescription></Alert> : null}

      <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_200px_240px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, cliente ou projeto" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="scheduled">Agendadas</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluídas</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select>
        <Select value={clientFilter} onValueChange={setClientFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clientOptions.map(([clientId, name]) => <SelectItem key={clientId} value={clientId}>{name || "Cliente"}</SelectItem>)}</SelectContent></Select>
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
                  onEdit={(meeting) => navigate(`/reunioes/${meeting.id}`)}
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
                  onEdit={(meeting) => navigate(`/reunioes/${meeting.id}`)}
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
          onMeetingClick={(meeting) => navigate(`/reunioes/${meeting.id}`)}
          onMeetingReschedule={handleMeetingReschedule}
        />
      )}

      <MeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} />

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
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
