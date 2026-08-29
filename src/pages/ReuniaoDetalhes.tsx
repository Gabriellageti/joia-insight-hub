import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, ChevronDown, ChevronUp, Clipboard, ExternalLink, FileUp, Focus, ListChecks, Loader2, Plus, SquareCheckBig, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { UploadModal } from "@/components/documents/UploadModal";
import { FileCard } from "@/components/documents/FileCard";
import { useMeetingWorkspace } from "@/hooks/useMeetingWorkspace";
import { useDocuments } from "@/hooks/useDocuments";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { listTaskAssignees, type TaskAssignee } from "@/integrations/supabase/tasks";
import { buildMeetingSummary, getMeetingCompletionWarnings, isMeetingStale, MEETING_STATUS_LABELS } from "@/lib/meetings";
import type { Task } from "@/types";
import type { MeetingData } from "@/hooks/useMeetings";

type TaskOrigin = { decisionId?: string; nextStepId?: string; title: string; dueDate?: string | null; responsibleUserId?: string | null; responsibleName?: string | null };

export default function ReuniaoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients, projects, tasks, diagnostics, meetings } = useData();
  const workspace = useMeetingWorkspace(id);
  const { documents, addDocument, deleteDocument } = useDocuments();
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [nextStep, setNextStep] = useState({ description: "", responsibleUserId: "", dueDate: "" });
  const [externalParticipant, setExternalParticipant] = useState({ name: "", company: "", email: "", phone: "", position: "" });
  const [internalParticipantId, setInternalParticipantId] = useState("");
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [meetingEditOpen, setMeetingEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => { void listTaskAssignees().then(setAssignees).catch(() => setAssignees([])); }, []);

  const data = workspace.data;
  const meetingDocuments = useMemo(() => documents.filter((document) => document.vinculos.meetingId === id), [documents, id]);
  const client = data ? clients.find((item) => item.id === data.meeting.client_id) : undefined;
  const project = data ? projects.find((item) => item.id === data.meeting.project_id) : undefined;
  const generatedTasks = useMemo(() => tasks.filter((task) => task.sourceMeetingId === id), [id, tasks]);
  const finishWarnings = data ? getMeetingCompletionWarnings(data) : [];

  const createTaskDraft = (origin: TaskOrigin) => {
    if (!data) return;
    const assignedTo = origin.responsibleUserId || data.meeting.responsible_user_id || user?.id || "";
    const responsible = origin.responsibleName || assignees.find((item) => item.id === assignedTo)?.full_name || "";
    const taskType = data.meeting.project_id ? "project" : data.meeting.client_id ? "client" : "personal";
    setTaskDraft({
      id: "", title: origin.title, description: `Gerada na reunião: ${data.meeting.title}`,
      projectId: data.meeting.project_id || "", projectName: project?.name || "",
      clientId: data.meeting.client_id || "", clientName: client?.nomeFantasia || client?.razaoSocial || client?.name || "",
      type: "processo", responsible, priority: "medium", taskType, assignedTo, createdBy: user?.id,
      dueDate: origin.dueDate || "", status: "not_started", evidenceRequired: false, createdAt: "",
      sourceMeetingId: data.meeting.id, sourceDecisionId: origin.decisionId, sourceNextStepId: origin.nextStepId,
    });
    setTaskOpen(true);
  };

  if (workspace.loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /><span className="ml-2">Carregando reunião...</span></div>;
  if (workspace.error || !data) return <Alert variant="destructive"><AlertTitle>Reunião indisponível</AlertTitle><AlertDescription>{workspace.error || "Registro não encontrado."}</AlertDescription><Button variant="outline" className="mt-3" onClick={() => navigate("/reunioes")}>Voltar</Button></Alert>;

  const scheduledAt = data.meeting.date ? new Date(data.meeting.date) : null;
  const endAt = data.meeting.end_date ? new Date(data.meeting.end_date) : null;
  const meetingForDialog: MeetingData = {
    id: data.meeting.id, title: data.meeting.title,
    projectId: data.meeting.project_id, projectName: project?.name || "",
    clientId: data.meeting.client_id, clientName: client?.nomeFantasia || client?.razaoSocial || client?.name || "",
    date: scheduledAt ? scheduledAt.toLocaleDateString("pt-BR") : "",
    time: scheduledAt ? scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    endTime: endAt ? endAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    type: data.meeting.meeting_link ? "online" : "presencial",
    link: data.meeting.meeting_link || undefined, location: data.meeting.location || undefined,
    status: data.meeting.status === "Realizada" ? "completed" : data.meeting.status === "Cancelada" ? "cancelled" : data.meeting.status === "Em andamento" ? "in_progress" : "scheduled",
    agenda: data.meeting.agenda || undefined, participants: data.participants.map((item) => item.name),
    hasMinutes: Boolean(data.meeting.minutes), minutes: data.meeting.minutes || undefined,
    duration: data.meeting.duration || undefined, responsibleUserId: data.meeting.responsible_user_id,
    notes: data.meeting.notes || undefined, startedAt: data.meeting.started_at, endedAt: data.meeting.ended_at,
    updatedAt: data.meeting.updated_at, createdAt: new Date(data.meeting.created_at).toLocaleDateString("pt-BR"),
  };
  const statusTone = data.meeting.status === "Realizada" ? "default" : data.meeting.status === "Cancelada" ? "destructive" : "secondary";

  return (
    <div className={focused ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4 md:p-8" : "space-y-6"}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" className="mb-2 px-2" onClick={() => focused ? setFocused(false) : navigate("/reunioes")}><ArrowLeft className="mr-2 h-4 w-4" />{focused ? "Sair do modo focado" : "Reuniões"}</Button>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">{data.meeting.title}</h1><Badge variant={statusTone}>{MEETING_STATUS_LABELS[data.meeting.status || ""] || data.meeting.status}</Badge></div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span><CalendarClock className="mr-1 inline h-4 w-4" />{scheduledAt ? scheduledAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "Sem data"}{endAt ? ` – ${endAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
            {client ? <Link className="hover:text-primary" to={`/clientes/${client.id}`}>{client.nomeFantasia || client.razaoSocial || client.name}</Link> : null}
            {project ? <Link className="hover:text-primary" to={`/projetos/${project.id}`}>{project.name}</Link> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setFocused((value) => !value)}><Focus className="mr-2 h-4 w-4" />{focused ? "Sair do foco" : "Modo focado"}</Button>
          <Button variant="outline" onClick={() => setMeetingEditOpen(true)}>Editar</Button>
          {data.meeting.status === "Agendada" ? <Button onClick={() => void workspace.startMeeting()}><SquareCheckBig className="mr-2 h-4 w-4" />Iniciar reunião</Button> : null}
          {data.meeting.status === "Em andamento" ? <Button onClick={() => setFinishOpen(true)}><Check className="mr-2 h-4 w-4" />Finalizar</Button> : null}
          {!['Realizada', 'Cancelada'].includes(data.meeting.status || '') ? <Button variant="ghost" className="text-destructive" onClick={() => void workspace.cancelMeeting()}>Cancelar reunião</Button> : null}
        </div>
      </header>

      {isMeetingStale(data.meeting) ? <Alert variant="destructive"><AlertTitle>Reunião pendente</AlertTitle><AlertDescription>A data já passou, mas a reunião continua agendada. Inicie, conclua ou cancele o registro.</AlertDescription></Alert> : null}

      {data.meeting.status === "Realizada" ? (
        <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Resumo da reunião</CardTitle><Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(buildMeetingSummary(data)).then(() => toast.success("Resumo copiado."))}><Clipboard className="mr-2 h-4 w-4" />Copiar texto</Button></CardHeader><CardContent><pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">{buildMeetingSummary(data)}</pre></CardContent></Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" />Pauta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2"><Input value={agendaTitle} onChange={(event) => setAgendaTitle(event.target.value)} placeholder="Novo item de pauta" onKeyDown={(event) => { if (event.key === "Enter" && agendaTitle.trim()) { event.preventDefault(); void workspace.addAgendaItem(agendaTitle.trim()).then(() => setAgendaTitle("")); } }} /><Button size="icon" aria-label="Adicionar item" disabled={!agendaTitle.trim()} onClick={() => void workspace.addAgendaItem(agendaTitle.trim()).then(() => setAgendaTitle(""))}><Plus className="h-4 w-4" /></Button></div>
            {data.agendaItems.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-md border p-2"><Checkbox checked={item.discussed} onCheckedChange={(checked) => void workspace.updateAgendaItem(item.id, { discussed: checked === true })} aria-label={`Marcar ${item.title} como discutido`} /><Input defaultValue={item.title} className={item.discussed ? "line-through opacity-70" : ""} onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== item.title) void workspace.updateAgendaItem(item.id, { title: value }); }} /><Button variant="ghost" size="icon" disabled={index === 0} onClick={() => void workspace.moveAgendaItem(item.id, -1)} aria-label="Mover para cima"><ChevronUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={index === data.agendaItems.length - 1} onClick={() => void workspace.moveAgendaItem(item.id, 1)} aria-label="Mover para baixo"><ChevronDown className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => void workspace.deleteAgendaItem(item.id)} aria-label="Excluir item"><Trash2 className="h-4 w-4" /></Button></div>)}
            {!data.agendaItems.length ? <p className="text-sm text-muted-foreground">Adicione os assuntos que devem ser discutidos.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notas ao vivo</CardTitle></CardHeader>
          <CardContent className="space-y-3"><Textarea rows={focused ? 18 : 10} value={workspace.notes} onChange={(event) => workspace.setNotes(event.target.value)} placeholder="Registre contexto, observações e pontos relevantes..." /><p className="text-xs text-muted-foreground" aria-live="polite">{{ saved: "Alterações salvas", saving: "Salvando...", unsaved: "Alterações não salvas", error: "Falha ao salvar — edite para tentar novamente", conflict: "Conflito de edição detectado" }[workspace.notesSaveState]}</p>{workspace.notesSaveState === "conflict" ? <Alert variant="destructive"><AlertTitle>Outra sessão alterou esta reunião</AlertTitle><AlertDescription>Seu rascunho foi preservado neste navegador.</AlertDescription><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={workspace.discardNotesConflict}>Usar versão do servidor</Button><Button size="sm" onClick={() => void workspace.saveNotesOverConflict()}>Sobrescrever com meu rascunho</Button></div></Alert> : null}</CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Decisões</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex gap-2"><Textarea rows={2} value={decisionText} onChange={(event) => setDecisionText(event.target.value)} placeholder="O que foi decidido?" /><Button size="icon" aria-label="Adicionar decisão" disabled={!decisionText.trim()} onClick={() => void workspace.addDecision(decisionText.trim()).then(() => setDecisionText(""))}><Plus className="h-4 w-4" /></Button></div>{data.decisions.map((decision) => { const task = generatedTasks.find((item) => item.sourceDecisionId === decision.id); return <div key={decision.id} className="rounded-md border p-3"><Textarea defaultValue={decision.description} rows={2} onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== decision.description) void workspace.updateDecision(decision.id, value); }} /><div className="mt-2 flex flex-wrap gap-2">{task ? <Button variant="outline" size="sm" onClick={() => { setTaskDraft(task); setTaskOpen(true); }}><ExternalLink className="mr-2 h-4 w-4" />Ver tarefa</Button> : <Button variant="outline" size="sm" onClick={() => createTaskDraft({ decisionId: decision.id, title: decision.description })}>Criar tarefa</Button>}<Button variant="ghost" size="sm" className="text-destructive" disabled={Boolean(task)} onClick={() => void workspace.deleteDecision(decision.id)}>Excluir</Button></div></div>; })}{!data.decisions.length ? <p className="text-sm text-muted-foreground">Nenhuma decisão registrada.</p> : null}</CardContent></Card>

        <Card><CardHeader><CardTitle>Próximos passos</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 sm:grid-cols-[1fr_180px_150px_auto]"><Input value={nextStep.description} onChange={(event) => setNextStep((current) => ({ ...current, description: event.target.value }))} placeholder="Próximo passo" /><Select value={nextStep.responsibleUserId || "none"} onValueChange={(value) => setNextStep((current) => ({ ...current, responsibleUserId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="none">Não definido</SelectItem>{assignees.map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name || "Usuário"}</SelectItem>)}</SelectContent></Select><Input type="date" value={nextStep.dueDate} onChange={(event) => setNextStep((current) => ({ ...current, dueDate: event.target.value }))} /><Button size="icon" aria-label="Adicionar próximo passo" disabled={!nextStep.description.trim()} onClick={() => { const assignee = assignees.find((item) => item.id === nextStep.responsibleUserId); void workspace.addNextStep({ description: nextStep.description.trim(), responsibleUserId: nextStep.responsibleUserId || null, responsibleName: assignee?.full_name || null, dueDate: nextStep.dueDate || null }).then(() => setNextStep({ description: "", responsibleUserId: "", dueDate: "" })); }}><Plus className="h-4 w-4" /></Button></div>{data.nextSteps.map((item) => { const task = generatedTasks.find((taskItem) => taskItem.sourceNextStepId === item.id); return <div key={item.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center"><Checkbox checked={Boolean(item.completed_at)} onCheckedChange={(checked) => void workspace.completeNextStep(item.id, checked === true)} /><div className="min-w-0 flex-1"><p className={item.completed_at ? "line-through opacity-70" : ""}>{item.description}</p><p className="text-xs text-muted-foreground">{item.responsible_name || "Sem responsável"}{item.due_date ? ` · ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p></div>{task ? <Button variant="outline" size="sm" onClick={() => { setTaskDraft(task); setTaskOpen(true); }}>Ver tarefa</Button> : <Button variant="outline" size="sm" onClick={() => createTaskDraft({ nextStepId: item.id, title: item.description, dueDate: item.due_date, responsibleUserId: item.responsible_user_id, responsibleName: item.responsible_name })}>Criar tarefa</Button>}<Button variant="ghost" size="icon" className="text-destructive" disabled={Boolean(task)} onClick={() => void workspace.deleteNextStep(item.id)}><Trash2 className="h-4 w-4" /></Button></div>; })}{!data.nextSteps.length ? <p className="text-sm text-muted-foreground">Nenhum próximo passo registrado.</p> : null}</CardContent></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Participantes</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Select value={internalParticipantId || "none"} onValueChange={(value) => setInternalParticipantId(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Participante interno" /></SelectTrigger><SelectContent><SelectItem value="none">Selecione um usuário</SelectItem>{assignees.map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name || "Usuário"}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={!internalParticipantId} onClick={() => { const selected = assignees.find((item) => item.id === internalParticipantId); if (selected) void workspace.addInternalParticipant(selected.id, selected.full_name || "Usuário").then(() => setInternalParticipantId("")); }}>Adicionar</Button></div><div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Nome externo" value={externalParticipant.name} onChange={(event) => setExternalParticipant((current) => ({ ...current, name: event.target.value }))} /><Input placeholder="Empresa" value={externalParticipant.company} onChange={(event) => setExternalParticipant((current) => ({ ...current, company: event.target.value }))} /><Input type="email" placeholder="E-mail" value={externalParticipant.email} onChange={(event) => setExternalParticipant((current) => ({ ...current, email: event.target.value }))} /><Input placeholder="Telefone" value={externalParticipant.phone} onChange={(event) => setExternalParticipant((current) => ({ ...current, phone: event.target.value }))} /><Input placeholder="Cargo" value={externalParticipant.position} onChange={(event) => setExternalParticipant((current) => ({ ...current, position: event.target.value }))} /><Button disabled={!externalParticipant.name.trim()} onClick={() => void workspace.addExternalParticipant(externalParticipant).then(() => setExternalParticipant({ name: "", company: "", email: "", phone: "", position: "" }))}>Adicionar externo</Button></div><div className="space-y-2">{data.participants.map((participant) => <div key={participant.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{participant.name}</p><p className="text-xs text-muted-foreground">{participant.participant_type === "internal" ? "Interno" : [participant.position, participant.company, participant.email, participant.phone].filter(Boolean).join(" · ") || "Externo"}</p></div><Button variant="ghost" size="icon" className="text-destructive" onClick={() => void workspace.deleteParticipant(participant.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></CardContent></Card>

        <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Tarefas geradas</CardTitle></CardHeader><CardContent className="space-y-2">{generatedTasks.map((task) => <button key={task.id} type="button" className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted" onClick={() => { setTaskDraft(task); setTaskOpen(true); }}><div><p className="font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.responsible || "Sem responsável"}{task.dueDate ? ` · ${task.dueDate}` : ""}</p></div><Badge variant={task.status === "done" ? "default" : "secondary"}>{task.status}</Badge></button>)}{!generatedTasks.length ? <p className="text-sm text-muted-foreground">As tarefas criadas a partir de decisões e próximos passos aparecerão aqui.</p> : null}</CardContent></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Anexos</CardTitle><Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><FileUp className="mr-2 h-4 w-4" />Anexar</Button></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{meetingDocuments.map((document) => <FileCard key={document.id} file={document} onDelete={(documentId) => void deleteDocument(documentId)} />)}{!meetingDocuments.length ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>Histórico</CardTitle></CardHeader><CardContent className="space-y-3">{data.activities.map((activity) => <div key={activity.id} className="border-l-2 pl-3"><p className="text-sm font-medium">{activity.description || activity.title}</p><p className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString("pt-BR")}</p></div>)}{!data.activities.length ? <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p> : null}</CardContent></Card>
      </div>

      <MeetingDialog open={meetingEditOpen} onOpenChange={setMeetingEditOpen} meeting={meetingForDialog} onSuccess={() => void workspace.refresh()} />
      <TaskDialog open={taskOpen} onOpenChange={(open) => { setTaskOpen(open); if (!open) setTaskDraft(null); }} task={taskDraft} defaultClientId={data.meeting.client_id || undefined} defaultProjectId={data.meeting.project_id || undefined} onSuccess={() => void workspace.refresh()} />
      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} onUpload={addDocument} clients={clients.map((item) => ({ id: item.id, name: item.nomeFantasia || item.razaoSocial || item.name || "Cliente" }))} projects={projects} tasks={tasks} diagnostics={diagnostics.map((item) => ({ id: item.id, name: item.name, projectId: item.projectId }))} meetings={meetings} defaultClientId={data.meeting.client_id} defaultProjectId={data.meeting.project_id} defaultMeetingId={data.meeting.id} />

      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Finalizar reunião?</AlertDialogTitle><AlertDialogDescription>O status será alterado para concluída e o resumo ficará disponível.</AlertDialogDescription></AlertDialogHeader>{finishWarnings.length ? <Alert><AlertTitle>Revise antes de concluir</AlertTitle><AlertDescription><ul className="mt-2 list-disc pl-5">{finishWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></AlertDescription></Alert> : <Alert><Check className="h-4 w-4" /><AlertTitle>Reunião pronta para concluir</AlertTitle><AlertDescription>Notas, decisões e ações estão registradas.</AlertDescription></Alert>}<AlertDialogFooter><AlertDialogCancel>Continuar editando</AlertDialogCancel><AlertDialogAction onClick={() => void workspace.finishMeeting().then(() => setFinishOpen(false))}>Concluir mesmo assim</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
