import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, ChevronRight, CircleGauge, Clock3, FolderKanban, ListTodo, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthBadge } from "@/components/operations/HealthBadge";
import { useData } from "@/contexts/DataContext";
import { useOperationsDashboard, useTeamOperations } from "@/hooks/useOperations";
import type { OperationsKpis } from "@/types/operations";

const kpiCards: Array<{ key: keyof OperationsKpis; label: string; icon: typeof CircleGauge; href: string; tone?: string }> = [
  { key: "activeProjects", label: "Projetos ativos", icon: FolderKanban, href: "/projetos" },
  { key: "riskProjects", label: "Projetos em risco", icon: AlertTriangle, href: "/pendencias?type=project&criticality=risk", tone: "text-orange-700" },
  { key: "lateProjects", label: "Projetos atrasados", icon: Clock3, href: "/pendencias?type=project&period=overdue", tone: "text-red-700" },
  { key: "openTasks", label: "Tarefas abertas", icon: ListTodo, href: "/plano-acao?view=list" },
  { key: "lateTasks", label: "Tarefas atrasadas", icon: CalendarClock, href: "/plano-acao?view=overdue", tone: "text-red-700" },
  { key: "blockedTasks", label: "Tarefas bloqueadas", icon: Ban, href: "/pendencias?type=task&criticality=blocked", tone: "text-orange-700" },
  { key: "attentionClients", label: "Clientes em atenção", icon: Users, href: "/pendencias?type=client&criticality=attention" },
  { key: "pendingMeetings", label: "Reuniões pendentes", icon: CalendarClock, href: "/pendencias?type=meeting" },
  { key: "weekDeliveries", label: "Entregas em 7 dias", icon: CheckCircle2, href: "/pendencias?period=7" },
];

const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)) : "Sem prazo";

export default function Dashboard() {
  const { clients } = useData();
  const [periodDays, setPeriodDays] = useState(30);
  const [clientId, setClientId] = useState("all");
  const [responsibleId, setResponsibleId] = useState("all");
  const [deliveryWindow, setDeliveryWindow] = useState<0 | 3 | 7 | 30>(7);
  const dashboard = useOperationsDashboard({ periodDays, clientId: clientId === "all" ? undefined : clientId, responsibleId: responsibleId === "all" ? undefined : responsibleId });
  const team = useTeamOperations();
  const data = dashboard.data;
  const deliveries = useMemo(() => data?.deliveries.filter((item) => {
    const due = new Date(`${item.due_date}T12:00:00`);
    const limit = new Date(); limit.setHours(23, 59, 59, 999); limit.setDate(limit.getDate() + deliveryWindow);
    return due <= limit;
  }) ?? [], [data?.deliveries, deliveryWindow]);

  if (dashboard.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-12 w-full" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4,5,6,7,8].map((item) => <Skeleton key={item} className="h-28" />)}</div></div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">Central de Operações</h1><Badge variant="secondary">{data?.scope === "personal" ? "Minha operação" : "Visão da empresa"}</Badge></div><p className="text-muted-foreground">Saúde, prazos e decisões que precisam de acompanhamento.</p></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select value={String(periodDays)} onValueChange={(value) => setPeriodDays(Number(value))}><SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent></Select>
          <Select value={clientId} onValueChange={setClientId}><SelectTrigger aria-label="Cliente"><SelectValue placeholder="Todos os clientes" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial || client.name}</SelectItem>)}</SelectContent></Select>
          {team.data ? <Select value={responsibleId} onValueChange={setResponsibleId}><SelectTrigger aria-label="Responsável"><SelectValue placeholder="Todos os responsáveis" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{team.data.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.member_name}</SelectItem>)}</SelectContent></Select> : null}
        </div>
      </header>

      {dashboard.error ? <Alert variant="destructive"><AlertDescription>Não foi possível carregar a central gerencial. {dashboard.error.message}</AlertDescription></Alert> : null}
      {!data ? <Card><CardContent className="py-12 text-center text-muted-foreground">Sem dados operacionais disponíveis para este escopo.</CardContent></Card> : <>
        <section aria-labelledby="kpis-title"><h2 id="kpis-title" className="sr-only">Indicadores operacionais</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{kpiCards.map(({ key, label, icon: Icon, href, tone }) => <Link key={key} to={href} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="h-full transition-colors hover:border-primary/50"><CardContent className="flex items-start justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold ${tone ?? ""}`}>{data.kpis[key]}</p></div><Icon className={`h-5 w-5 ${tone ?? "text-muted-foreground"}`} aria-hidden="true" /></CardContent></Card></Link>)}</div></section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card><CardHeader className="items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Saúde dos projetos</CardTitle><p className="mt-1 text-sm text-muted-foreground">Pontuação explicável: 0–2 saudável, 3–4 atenção, 5–7 risco, 8+ crítico.</p></div><Button asChild variant="ghost" size="sm" className="shrink-0"><Link to="/pendencias?type=project">Ver todos<ChevronRight className="ml-1 h-4 w-4" /></Link></Button></CardHeader><CardContent className="space-y-4">{data.projects.length === 0 ? <Empty label="Nenhum projeto neste escopo." /> : data.projects.map((project) => <Link key={project.project_id} to={`/projetos/${project.project_id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium">{project.project_name}</p><p className="text-sm text-muted-foreground">{project.client_name || "Sem cliente"} · prazo {formatDate(project.end_date)}</p></div><HealthBadge health={project.health} score={project.risk_score} /></div><div className="mt-3 flex items-center gap-3"><Progress value={project.progress} className="h-2" /><span className="w-10 text-right text-xs text-muted-foreground">{project.progress}%</span></div>{project.risk_reasons.length > 0 ? <p className="mt-2 text-xs text-muted-foreground">{project.risk_reasons.join(" · ")}</p> : <p className="mt-2 text-xs text-emerald-700">Sem sinais de risco no momento.</p>}</Link>)}</CardContent></Card>

          <Card><CardHeader><CardTitle>Precisa da sua atenção</CardTitle></CardHeader><CardContent className="space-y-3">{data.attention.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-600" /><p className="font-medium">Nada crítico agora</p><p className="text-sm text-muted-foreground">Continue acompanhando as próximas entregas.</p></div> : data.attention.map((item) => <Link key={`${item.type}-${item.id}`} to={`/plano-acao?view=list&taskId=${item.id}`} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.reason}{item.due_date ? ` · ${formatDate(item.due_date)}` : ""}</p></div><ChevronRight className="mt-1 h-4 w-4 shrink-0" /></Link>)}</CardContent></Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card><CardHeader className="items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Clientes que pedem acompanhamento</CardTitle><Button asChild variant="ghost" size="sm" className="shrink-0"><Link to="/pendencias?type=client">Ver pendências</Link></Button></CardHeader><CardContent className="space-y-3">{data.clients.length === 0 ? <Empty label="Nenhum cliente neste escopo." /> : data.clients.map((client) => <Link key={client.client_id} to={`/clientes/${client.client_id}`} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"><div><p className="font-medium">{client.client_name}</p><p className="text-sm text-muted-foreground">{client.risk_reasons[0] || "Acompanhamento em dia"}</p></div><HealthBadge health={client.health} score={client.risk_score} /></Link>)}</CardContent></Card>

          <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Próximas entregas</CardTitle><div className="flex gap-1" aria-label="Janela de entregas">{([0,3,7,30] as const).map((days) => <Button key={days} size="sm" variant={deliveryWindow === days ? "default" : "outline"} onClick={() => setDeliveryWindow(days)}>{days === 0 ? "Hoje" : `${days} dias`}</Button>)}</div></div></CardHeader><CardContent className="space-y-3">{deliveries.length === 0 ? <Empty label={deliveryWindow === 0 ? "Nenhuma entrega para hoje." : `Nenhuma entrega nos próximos ${deliveryWindow} dias.`} /> : deliveries.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.type === "milestone" ? "Marco" : item.type === "next_step" ? "Próximo passo" : item.type === "task" ? "Tarefa" : "Entregável"}</p></div><Badge variant="outline">{formatDate(item.due_date)}</Badge></div>)}</CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Resumo dos últimos {periodDays} dias</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Object.entries({ "Tarefas concluídas": data.weekly.completedTasks, "Tarefas criadas": data.weekly.createdTasks, "Novos bloqueios": data.weekly.newBlocks, "Reuniões realizadas": data.weekly.completedMeetings }).map(([label, value]) => <div key={label} className="rounded-lg bg-muted/50 p-4"><p className="text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>)}</div></CardContent></Card>
      </>}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{label}</div>;
}
