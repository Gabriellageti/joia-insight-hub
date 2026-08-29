import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpDown, Plus, Search, UserCog } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeDialog } from "@/components/dialogs/EmployeeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useTeamOperations } from "@/hooks/useOperations";
import { hasWorkspaceRole } from "@/lib/authorization";
import type { Employee } from "@/types";
import type { TeamOperationsMember } from "@/types/operations";

const capacityConfig = {
  available: { label: "Disponível", className: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  normal: { label: "Normal", className: "bg-sky-50 text-sky-800 border-sky-300" },
  high: { label: "Alta", className: "bg-amber-50 text-amber-900 border-amber-300" },
  overloaded: { label: "Sobrecarregada", className: "bg-red-50 text-red-900 border-red-300" },
};

export default function Equipe() {
  const { activeMembership } = useAuth();
  const { employees, tasks, clients, projects } = useData();
  const team = useTeamOperations();
  const manager = hasWorkspaceRole(activeMembership?.role, "manager");
  const [selected, setSelected] = useState<TeamOperationsMember | null>(null);
  const [sortRiskFirst, setSortRiskFirst] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const members = useMemo(() => [...(team.data ?? [])].sort((a,b) => sortRiskFirst ? (b.overdue_tasks + b.blocked_tasks) - (a.overdue_tasks + a.blocked_tasks) : a.member_name.localeCompare(b.member_name, "pt-BR")), [sortRiskFirst, team.data]);
  const memberTasks = selected ? tasks.filter((task) => task.assignedTo === selected.user_id && task.status !== "done") : [];
  const filteredEmployees = employees.filter((employee) => employee.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Equipe</h1><p className="text-muted-foreground">Distribuição operacional sem ranking de produtividade.</p></header>
      <Tabs defaultValue="operations">
        <TabsList><TabsTrigger value="operations">Operação</TabsTrigger><TabsTrigger value="directory">Cadastro e onboarding</TabsTrigger></TabsList>
        <TabsContent value="operations" className="mt-5 space-y-4">
          {!manager ? <Card><CardContent className="py-12 text-center"><UserCog className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Visão gerencial restrita</p><p className="text-sm text-muted-foreground">Seu trabalho diário continua disponível em Meu Dia e Minhas Tarefas.</p></CardContent></Card> : <>
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Capacidade indica volume e urgência, não desempenho individual.</p><Button variant="outline" size="sm" onClick={() => setSortRiskFirst((value) => !value)}><ArrowUpDown className="mr-2 h-4 w-4" />{sortRiskFirst ? "Risco primeiro" : "Ordem alfabética"}</Button></div>
            {team.isLoading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando distribuição...</CardContent></Card> : team.error ? <Card><CardContent className="py-10 text-center text-destructive">Não foi possível carregar a visão da equipe.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{members.map((member) => <button key={member.user_id} type="button" className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelected(member)}><Card className="h-full transition-colors hover:border-primary/50"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><Avatar><AvatarFallback>{member.member_name.split(" ").map((part) => part[0]).slice(0,2).join("")}</AvatarFallback></Avatar><div><p className="font-medium">{member.member_name}</p><p className="text-xs capitalize text-muted-foreground">{member.role}</p></div></div><Badge variant="outline" className={capacityConfig[member.capacity].className}>{capacityConfig[member.capacity].label}</Badge></div><div className="mt-5 grid grid-cols-4 gap-2 text-center"><Metric label="Abertas" value={member.open_tasks} /><Metric label="Hoje" value={member.today_tasks} /><Metric label="Atrasadas" value={member.overdue_tasks} warn={member.overdue_tasks > 0} /><Metric label="Bloqueadas" value={member.blocked_tasks} warn={member.blocked_tasks > 0} /></div><div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>{member.active_projects} projeto(s)</span><span>{member.week_deliveries} entrega(s) em 7 dias</span><span>{member.week_completed} concluída(s)</span></div></CardContent></Card></button>)}</div>}
            {selected ? <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>{selected.member_name}</CardTitle><p className="text-sm text-muted-foreground">Visão individual de carga, prazos e vínculos.</p></div><Button variant="ghost" onClick={() => setSelected(null)}>Fechar</Button></CardHeader><CardContent className="space-y-3">{memberTasks.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tarefa aberta para esta pessoa.</p> : memberTasks.slice(0,12).map((task) => <Link key={task.id} to={`/plano-acao?view=list&taskId=${task.id}`} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"><div><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{projects.find((project) => project.id === task.projectId)?.name || clients.find((client) => client.id === task.clientId)?.nomeFantasia || "Tarefa pessoal"}</p></div><div className="text-right"><Badge variant={task.status === "blocked" ? "destructive" : "outline"}>{task.status === "blocked" ? "Bloqueada" : task.priority === "urgent" ? "Urgente" : "Aberta"}</Badge><p className="mt-1 text-xs text-muted-foreground">{task.dueDate || "Sem prazo"}</p></div></Link>)}</CardContent></Card> : null}
          </>}
        </TabsContent>
        <TabsContent value="directory" className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar colaborador..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><Button onClick={() => { setEditingEmployee(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo colaborador</Button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredEmployees.map((employee) => <Card key={employee.id} className="cursor-pointer hover:border-primary/50" onClick={() => { setEditingEmployee(employee); setDialogOpen(true); }}><CardContent className="p-5"><div className="flex items-center gap-3"><Avatar><AvatarFallback>{employee.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</AvatarFallback></Avatar><div><p className="font-medium">{employee.name}</p><p className="text-sm text-muted-foreground">{employee.role} · {employee.seniority}</p></div></div>{employee.status === "onboarding" ? <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Onboarding</span><span>{employee.onboardingProgress}%</span></div><Progress value={employee.onboardingProgress} className="h-2" /></div> : null}</CardContent></Card>)}</div>
        </TabsContent>
      </Tabs>
      <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editingEmployee} />
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return <div className="rounded-md bg-muted/50 p-2"><p className={`text-lg font-semibold ${warn ? "text-destructive" : ""}`}>{value}</p><p className="truncate text-[10px] text-muted-foreground">{label}</p>{warn ? <AlertTriangle className="sr-only" /> : null}</div>;
}
