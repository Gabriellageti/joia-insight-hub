import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, FilterX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useTeamOperations } from "@/hooks/useOperations";
import { supabase } from "@/integrations/supabase/client";

const actionLabels: Record<string, string> = {
  tasks_insert: "Tarefa criada", tasks_update: "Tarefa atualizada", tasks_delete: "Tarefa removida",
  projects_insert: "Projeto criado", projects_update: "Projeto atualizado", projects_delete: "Projeto removido",
  clients_insert: "Cliente criado", clients_update: "Cliente atualizado", clients_delete: "Cliente removido",
  meeting_created: "Reunião criada", meeting_updated: "Reunião atualizada", meeting_status_changed: "Status da reunião alterado",
  decision_created: "Decisão registrada", next_step_created: "Próximo passo criado", meeting_task_created: "Tarefa criada na reunião",
};

export default function Atividades() {
  const { activeMembership } = useAuth();
  const { clients, projects } = useData();
  const team = useTeamOperations();
  const [actorId, setActorId] = useState("all");
  const [clientId, setClientId] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [period, setPeriod] = useState("30");
  const activities = useQuery({
    queryKey: ["company-activities", activeMembership?.workspaceId, actorId, clientId, projectId, entityType, actionType, period],
    enabled: Boolean(activeMembership?.workspaceId),
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - Number(period));
      let query = supabase.from("activity_logs").select("*").eq("workspace_id", activeMembership!.workspaceId).gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(200);
      if (actorId !== "all") query = query.eq("actor_id", actorId);
      if (clientId !== "all") query = query.eq("client_id", clientId);
      if (projectId !== "all") query = query.eq("project_id", projectId);
      if (entityType !== "all") query = query.eq("entity_type", entityType);
      if (actionType !== "all") query = query.eq("action_type", actionType);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const memberNames = useMemo(() => new Map(team.data?.map((member) => [member.user_id, member.member_name]) ?? []), [team.data]);
  const clientNames = useMemo(() => new Map(clients.map((client) => [client.id, client.nomeFantasia || client.razaoSocial || client.name || "Cliente"])), [clients]);
  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const clear = () => { setActorId("all"); setClientId("all"); setProjectId("all"); setEntityType("all"); setActionType("all"); setPeriod("30"); };

  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Atividades da Empresa</h1><p className="text-muted-foreground">Histórico operacional auditável de tarefas, clientes, projetos e reuniões.</p></header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Select value={actorId} onValueChange={setActorId}><SelectTrigger aria-label="Usuário"><SelectValue placeholder="Usuário" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os usuários</SelectItem>{team.data?.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.member_name}</SelectItem>)}</SelectContent></Select>
        <Select value={clientId} onValueChange={(value) => { setClientId(value); setProjectId("all"); }}><SelectTrigger aria-label="Cliente"><SelectValue placeholder="Cliente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial || client.name}</SelectItem>)}</SelectContent></Select>
        <Select value={projectId} onValueChange={setProjectId}><SelectTrigger aria-label="Projeto"><SelectValue placeholder="Projeto" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os projetos</SelectItem>{projects.filter((project) => clientId === "all" || project.clientId === clientId).map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
        <Select value={entityType} onValueChange={setEntityType}><SelectTrigger aria-label="Entidade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as entidades</SelectItem><SelectItem value="task">Tarefas</SelectItem><SelectItem value="project">Projetos</SelectItem><SelectItem value="client">Clientes</SelectItem><SelectItem value="meeting">Reuniões</SelectItem><SelectItem value="meeting_decisions">Decisões</SelectItem><SelectItem value="meeting_next_steps">Próximos passos</SelectItem></SelectContent></Select>
        <Select value={actionType} onValueChange={setActionType}><SelectTrigger aria-label="Ação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem><SelectItem value="tasks_insert">Criação de tarefa</SelectItem><SelectItem value="tasks_update">Atualização de tarefa</SelectItem><SelectItem value="projects_update">Atualização de projeto</SelectItem><SelectItem value="clients_update">Atualização de cliente</SelectItem><SelectItem value="meeting_status_changed">Mudança em reunião</SelectItem><SelectItem value="decision_created">Decisão registrada</SelectItem><SelectItem value="next_step_created">Próximo passo criado</SelectItem></SelectContent></Select>
        <Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">7 dias</SelectItem><SelectItem value="30">30 dias</SelectItem><SelectItem value="90">90 dias</SelectItem><SelectItem value="365">12 meses</SelectItem></SelectContent></Select>
      </div>
      <Button variant="ghost" size="sm" onClick={clear}><FilterX className="mr-2 h-4 w-4" />Limpar filtros</Button>
      {activities.isLoading ? <div className="space-y-2">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-24" />)}</div> : activities.error ? <Card><CardContent className="py-10 text-center text-destructive">Não foi possível carregar as atividades.</CardContent></Card> : activities.data?.length === 0 ? <Card><CardContent className="py-12 text-center"><Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Nenhuma atividade no período</p><p className="text-sm text-muted-foreground">Amplie os filtros para consultar o histórico.</p></CardContent></Card> : <div className="space-y-2">{activities.data?.map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{actionLabels[item.action_type] || item.action_type.split("_").join(" ")}</Badge><span className="text-sm text-muted-foreground">{memberNames.get(item.actor_id || "") || "Sistema"}</span></div><p className="mt-2 font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.description}{item.client_id ? ` · ${clientNames.get(item.client_id) || "Cliente"}` : ""}{item.project_id ? ` · ${projectNames.get(item.project_id) || "Projeto"}` : ""}</p></div><time className="shrink-0 text-sm text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("pt-BR")}</time></CardContent></Card>)}</div>}
    </div>
  );
}
