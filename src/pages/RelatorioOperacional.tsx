import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, FileBarChart, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HealthBadge } from "@/components/operations/HealthBadge";
import { useData } from "@/contexts/DataContext";
import { useOperationsDashboard, useTeamOperations } from "@/hooks/useOperations";

export default function RelatorioOperacional() {
  const { clients } = useData();
  const team = useTeamOperations();
  const [periodDays, setPeriodDays] = useState(30);
  const [clientId, setClientId] = useState("all");
  const [responsibleId, setResponsibleId] = useState("all");
  const report = useOperationsDashboard({ periodDays, clientId: clientId === "all" ? undefined : clientId, responsibleId: responsibleId === "all" ? undefined : responsibleId });
  const data = report.data;
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold">Relatório Operacional</h1><p className="text-muted-foreground">Leitura executiva de saúde, entregas, bloqueios e acompanhamento.</p></div><Button variant="outline" onClick={() => window.print()}><FileBarChart className="mr-2 h-4 w-4" />Imprimir relatório</Button></header>
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={String(periodDays)} onValueChange={(value) => setPeriodDays(Number(value))}><SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">7 dias</SelectItem><SelectItem value="30">30 dias</SelectItem><SelectItem value="90">90 dias</SelectItem><SelectItem value="365">12 meses</SelectItem></SelectContent></Select>
        <Select value={clientId} onValueChange={setClientId}><SelectTrigger aria-label="Cliente"><SelectValue placeholder="Cliente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial || client.name}</SelectItem>)}</SelectContent></Select>
        <Select value={responsibleId} onValueChange={setResponsibleId} disabled={!team.data}><SelectTrigger aria-label="Responsável"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{team.data?.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.member_name}</SelectItem>)}</SelectContent></Select>
      </div>
      {!data ? <Card><CardContent className="py-12 text-center text-muted-foreground">{report.isLoading ? "Gerando relatório..." : "Sem dados para o relatório."}</CardContent></Card> : <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[
          [ListTodo, "Tarefas abertas", data.kpis.openTasks], [AlertTriangle, "Tarefas atrasadas", data.kpis.lateTasks], [Ban, "Bloqueios", data.kpis.blockedTasks], [CalendarClock, "Reuniões pendentes", data.kpis.pendingMeetings], [CheckCircle2, "Entregas em 7 dias", data.kpis.weekDeliveries],
        ].map(([Icon, label, value]) => { const IconComponent = Icon as typeof ListTodo; return <Card key={String(label)}><CardContent className="p-4"><IconComponent className="mb-2 h-5 w-5 text-muted-foreground" /><p className="text-2xl font-semibold">{String(value)}</p><p className="text-sm text-muted-foreground">{String(label)}</p></CardContent></Card>; })}</div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card><CardHeader><CardTitle>Projetos</CardTitle></CardHeader><CardContent className="space-y-3">{data.projects.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum projeto no recorte.</p> : data.projects.map((project) => <Link key={project.project_id} to={`/projetos/${project.project_id}`} className="block rounded-lg border p-3 hover:bg-muted/40"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{project.project_name}</p><p className="text-sm text-muted-foreground">{project.client_name} · {project.progress}% concluído</p></div><HealthBadge health={project.health} score={project.risk_score} /></div><p className="mt-2 text-xs text-muted-foreground">{project.risk_reasons.join(" · ") || "Sem sinais de risco."}</p></Link>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Clientes</CardTitle></CardHeader><CardContent className="space-y-3">{data.clients.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cliente no recorte.</p> : data.clients.map((client) => <Link key={client.client_id} to={`/clientes/${client.client_id}`} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"><div><p className="font-medium">{client.client_name}</p><p className="text-sm text-muted-foreground">{client.risk_reasons[0] || "Acompanhamento em dia"}</p></div><HealthBadge health={client.health} score={client.risk_score} /></Link>)}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>Destaques do período</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Highlight label="Concluídas" value={data.weekly.completedTasks} /><Highlight label="Criadas" value={data.weekly.createdTasks} /><Highlight label="Novos bloqueios" value={data.weekly.newBlocks} /><Highlight label="Reuniões realizadas" value={data.weekly.completedMeetings} /></CardContent></Card>
        <p className="text-xs text-muted-foreground">Relatório gerado a partir das mesmas tarefas, projetos, clientes, reuniões, marcos e atividades da operação. Não inclui dados financeiros.</p>
      </>}
    </div>
  );
}

function Highlight({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-muted/50 p-4"><Badge variant="secondary">{label}</Badge><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
