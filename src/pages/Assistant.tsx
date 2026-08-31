import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, ExternalLink, History, Loader2, Send, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { askAssistant, AssistantDisabledError, getAssistantAvailability, getAssistantInteraction, listAssistantInteractions, type AssistantHistoryMessage, type AssistantResponse, type SuggestedTask } from "@/lib/ai/assistant";
import type { Task } from "@/types";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; response?: AssistantResponse };
const QUICK_QUESTIONS = ["O que preciso resolver hoje?", "Quais tarefas estão atrasadas?", "Quais projetos estão em risco?", "Resuma o trabalho realizado neste mês."];

export default function Assistant() {
  const [availability, setAvailability] = useState<"checking" | "enabled" | "disabled" | "unavailable">("checking");
  const disable = useCallback(() => setAvailability("disabled"), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // Bounded even if a network implementation fails to reject on abort.
    const timeout = setTimeout(() => {
      if (active) { active = false; setAvailability("unavailable"); controller.abort(); }
    }, 5000);
    getAssistantAvailability(controller.signal)
      .then((enabled) => { if (active) setAvailability(enabled ? "enabled" : "disabled"); })
      .catch(() => { if (active) setAvailability("unavailable"); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  // Do not mount history, auto-prompts or task suggestions until the server opts in.
  if (availability === "enabled") return <EnabledAssistant onDisabled={disable} />;
  return <section className="space-y-4" aria-live="polite">
    <Bot className="h-7 w-7 text-primary" aria-hidden="true" />
    <h1 className="text-2xl font-semibold">{availability === "checking" ? "Verificando disponibilidade do assistente" : "Assistente de IA temporariamente indisponível"}</h1>
    <p className="text-muted-foreground">{availability === "disabled"
      ? "Os recursos de IA estão desabilitados neste ambiente. As demais funcionalidades do Joia Labs continuam disponíveis normalmente."
      : availability === "checking" ? "Aguarde enquanto verificamos a disponibilidade deste recurso opcional."
      : "Não foi possível verificar a disponibilidade da IA. As demais funcionalidades do Joia Labs continuam disponíveis normalmente."}</p>
    <Button asChild variant="outline"><Link to="/meu-dia">Ir para Meu Dia</Link></Button>
  </section>;
}

function EnabledAssistant({ onDisabled }: { onDisabled: () => void }) {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { clients, projects } = useData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState(params.get("prompt") || "");
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof listAssistantInteractions>>>([]);
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const autoPromptRef = useRef<string | null>(null);
  const scope = useMemo(() => ({ clientId: params.get("clientId") || undefined, meetingId: params.get("meetingId") || undefined, reportId: params.get("reportId") || undefined }), [params]);

  useEffect(() => { listAssistantInteractions().then(setRecent).catch(() => setRecent([])); }, []);
  useEffect(() => {
    const interactionId = params.get("interactionId");
    if (!interactionId) return;
    getAssistantInteraction(interactionId).then((response) => setMessages([
      { id: `${interactionId}-q`, role: "user", content: response.question },
      { id: interactionId, role: "assistant", content: response.answer, response },
    ])).catch((error) => toast.error((error as Error).message));
  }, [params]);

  const send = useCallback(async (value?: string) => {
    const text = (value ?? question).trim();
    if (!text || loading) return;
    const history: AssistantHistoryMessage[] = messages.map(({ role, content }) => ({ role, content }));
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((current) => [...current, userMessage]); setQuestion(""); setLoading(true);
    try {
      const response = await askAssistant(text, scope, history);
      setMessages((current) => [...current, { id: response.interactionId, role: "assistant", content: response.answer, response }]);
      setRecent((current) => [{ id: response.interactionId, question: text, mode: response.mode, status: "success", created_at: new Date().toISOString() }, ...current.filter((item) => item.id !== response.interactionId)].slice(0, 20));
      const next = new URLSearchParams(params); next.set("interactionId", response.interactionId); next.delete("prompt"); next.delete("auto"); setParams(next, { replace: true });
    } catch (error) {
      if (error instanceof AssistantDisabledError) { onDisabled(); return; }
      toast.error((error as Error).message); setMessages((current) => current.filter((item) => item.id !== userMessage.id)); setQuestion(text);
    }
    finally { setLoading(false); }
  }, [loading, messages, params, question, scope, setParams, onDisabled]);

  useEffect(() => {
    const prompt = params.get("prompt");
    if (params.get("auto") !== "1" || !prompt || autoPromptRef.current === prompt || messages.length) return;
    autoPromptRef.current = prompt; void send(prompt);
  }, [messages.length, params, send]);

  const reviewTask = (suggestion: SuggestedTask) => {
    const project = projects.find((item) => item.id === suggestion.projectId);
    const clientId = project?.clientId || suggestion.clientId || "";
    const client = clients.find((item) => item.id === clientId);
    setTaskDraft({
      id: "", title: suggestion.title, description: `${suggestion.description}\n\nSugestão do Assistente JoIA: ${suggestion.rationale}`,
      projectId: project?.id || "", projectName: project?.name || "", clientId, clientName: client?.nomeFantasia || client?.razaoSocial || client?.name || "",
      type: "processo", responsible: "", priority: suggestion.priority, taskType: project ? "project" : clientId ? "client" : "personal",
      assignedTo: user?.id || "", createdBy: user?.id, dueDate: suggestion.dueDate || "", status: "not_started", evidenceRequired: false, createdAt: "",
    });
    setTaskOpen(true);
  };

  return <div className="space-y-5"><header><div className="flex items-center gap-2"><Bot className="h-7 w-7 text-primary" /><h1 className="text-2xl font-semibold">Assistente JoIA</h1></div><p className="text-muted-foreground">Consulte a operação com as mesmas permissões da sua conta. Sugestões nunca são executadas sem sua confirmação.</p></header>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="flex min-h-[620px] min-w-0 flex-col overflow-hidden"><CardHeader className="border-b pb-4"><div className="flex flex-wrap gap-2">{QUICK_QUESTIONS.map((item) => <Button key={item} size="sm" variant="outline" onClick={() => void send(item)} disabled={loading}>{item}</Button>)}</div></CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0"><Conversation className="min-h-0 flex-1"><ConversationContent>
          {!messages.length ? <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground"><Sparkles className="h-9 w-9" /><p>Faça uma pergunta sobre tarefas, clientes, projetos, reuniões ou relatórios.</p></div> : messages.map((message) => <Message key={message.id} from={message.role}><MessageContent><MessageResponse>{message.content}</MessageResponse>
            {message.response?.mode === "fallback" ? <Alert className="mt-3"><AlertDescription>Resumo calculado diretamente dos dados; o modelo generativo estava temporariamente indisponível.</AlertDescription></Alert> : null}
            {message.response?.citations.length ? <div className="mt-4 space-y-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fontes consultadas</p><div className="flex flex-wrap gap-2">{message.response.citations.map((source) => <Button key={source.id} asChild size="sm" variant="outline"><Link to={source.url}>{source.label}<ExternalLink className="ml-2 h-3 w-3" /></Link></Button>)}</div></div> : null}
            {message.response?.suggestedTasks.length ? <div className="mt-4 space-y-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tarefas sugeridas — revisão obrigatória</p>{message.response.suggestedTasks.map((task, index) => <Card key={`${message.id}-${index}`}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium">{task.title}</p><p className="mt-1 text-sm text-muted-foreground">{task.rationale}</p><Badge className="mt-2" variant="secondary">{task.priority}</Badge></div><Button size="sm" onClick={() => reviewTask(task)}>Revisar tarefa</Button></CardContent></Card>)}</div> : null}
          </MessageContent></Message>)}
          {loading ? <Message from="assistant"><MessageContent className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando somente os dados permitidos…</MessageContent></Message> : null}
        </ConversationContent><ConversationScrollButton /></Conversation>
          <div className="border-t p-3 sm:p-4"><div className="flex items-end gap-2"><Textarea aria-label="Pergunta para o Assistente JoIA" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Pergunte o que está acontecendo na JoIA…" rows={2} maxLength={2000} /><Button size="icon" aria-label="Enviar pergunta" disabled={loading || question.trim().length < 3} onClick={() => void send()}><Send className="h-4 w-4" /></Button></div><p className="mt-2 text-xs text-muted-foreground">Enter envia · Shift+Enter quebra a linha</p></div>
        </CardContent></Card>
      <Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Consultas recentes</CardTitle></CardHeader><CardContent className="space-y-2">{recent.length ? recent.map((item) => <Button key={item.id} asChild variant={params.get("interactionId") === item.id ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal text-left"><Link to={`/assistente?interactionId=${item.id}`}><span><span className="line-clamp-2 text-sm">{item.question}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</span></span></Link></Button>) : <p className="text-sm text-muted-foreground">Nenhuma consulta concluída.</p>}</CardContent></Card>
    </div>
    <TaskDialog open={taskOpen} onOpenChange={(open) => { setTaskOpen(open); if (!open) setTaskDraft(null); }} task={taskDraft} defaultClientId={taskDraft?.clientId} defaultProjectId={taskDraft?.projectId} />
  </div>;
}
