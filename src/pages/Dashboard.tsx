import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileSearch,
  FolderKanban,
  ListTodo,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { TaskQueue } from "@/components/dashboard/TaskQueue";
import { useData } from "@/contexts/DataContext";
import { useFinancial } from "@/hooks/useFinancial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Dashboard() {
  const { clients, projects, tasks, diagnostics, meetings } = useData();
  const { records } = useFinancial();

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);
    const activeClients = clients.filter((client) => client.status === "ativo").length;
    const completedTasks = tasks.filter((task) => task.status === "done").length;
    const pendingTasks = tasks.filter((task) => task.status !== "done").length;
    const overdueTasks = tasks.filter((task) => {
      const dueDate = parseFlexibleDate(task.dueDate);
      return task.status !== "done" && dueDate && dueDate < today;
    });

    const projectsWithOverdueTasks = new Set(overdueTasks.map((task) => task.projectId));
    const projectsAtRisk = projects.filter(
      (project) =>
        project.status === "yellow" ||
        project.status === "red" ||
        projectsWithOverdueTasks.has(project.id)
    );

    const receivables = records.filter((record) => record.type === "receita");
    const paidReceivables = receivables.filter((record) => record.status === "Pago");
    const pendingReceivables = receivables.filter((record) => record.status !== "Pago");
    const expenses = records.filter((record) => record.type === "despesa");
    const overdueReceivables = pendingReceivables.filter((record) => {
      const dueDate = parseFlexibleDate(record.date);
      return dueDate && dueDate < today;
    });

    const totalRevenue = paidReceivables.reduce((sum, record) => sum + record.amount, 0);
    const totalExpenses = expenses.reduce((sum, record) => sum + record.amount, 0);
    const pendingAmount = pendingReceivables.reduce((sum, record) => sum + record.amount, 0);
    const balance = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    const openDiagnostics = diagnostics.filter((diagnostic) => diagnostic.status !== "completed");
    const upcomingMeetings = meetings
      .filter((meeting) => {
        const date = parseFlexibleDate(meeting.date);
        return meeting.status === "scheduled" && date && date >= today && date <= sevenDaysFromNow;
      })
      .sort((a, b) => {
        const dateA = parseFlexibleDate(a.date)?.getTime() || 0;
        const dateB = parseFlexibleDate(b.date)?.getTime() || 0;
        return dateA - dateB;
      });

    return {
      activeClients,
      activeProjects: projects.length,
      projectsAtRisk,
      completedTasks,
      pendingTasks,
      overdueTasks,
      totalRevenue,
      totalExpenses,
      pendingAmount,
      balance,
      margin,
      pendingReceivables,
      overdueReceivables,
      openDiagnostics,
      upcomingMeetings,
    };
  }, [clients, diagnostics, meetings, projects, records, tasks]);

  const operationalScore = useMemo(() => {
    let score = 100;
    score -= Math.min(stats.projectsAtRisk.length * 10, 30);
    score -= Math.min(stats.overdueTasks.length * 4, 25);
    score -= Math.min(stats.overdueReceivables.length * 5, 25);
    score -= Math.min(stats.openDiagnostics.length * 2, 20);
    return Math.max(score, 0);
  }, [stats.openDiagnostics.length, stats.overdueReceivables.length, stats.overdueTasks.length, stats.projectsAtRisk.length]);

  const priorities = [
    ...stats.overdueReceivables.slice(0, 2).map((record) => ({
      title: record.description || "Receita vencida",
      meta: `${record.clientName || "Cliente não informado"} · ${currency.format(record.amount)}`,
      href: "/financeiro",
      tone: "destructive" as const,
    })),
    ...stats.overdueTasks.slice(0, 3).map((task) => ({
      title: task.title,
      meta: `${task.clientName || task.projectName} · prazo ${task.dueDate}`,
      href: "/plano-acao",
      tone: "warning" as const,
    })),
    ...stats.openDiagnostics.slice(0, 2).map((diagnostic) => ({
      title: diagnostic.name,
      meta: `${diagnostic.clientName} · ${diagnostic.progress}% respondido`,
      href: `/diagnosticos/${diagnostic.id}`,
      tone: "secondary" as const,
    })),
  ].slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard JoIA</h1>
          <p className="text-muted-foreground">Visão executiva de receita, riscos e operação ativa</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/financeiro">Financeiro</Link>
          </Button>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/plano-acao">Plano de ação</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Saldo" value={currency.format(stats.balance)} subtitle="Recebido - despesas" icon={Wallet} highlight />
        <StatCard title="Receita Recebida" value={currency.format(stats.totalRevenue)} subtitle="Pagamentos baixados" icon={TrendingUp} />
        <StatCard title="A Receber" value={currency.format(stats.pendingAmount)} subtitle={`${stats.pendingReceivables.length} pendências`} icon={CircleDollarSign} />
        <StatCard title="Despesas" value={currency.format(stats.totalExpenses)} subtitle="Lançamentos de saída" icon={TrendingDown} />
        <StatCard title="Projetos em Risco" value={stats.projectsAtRisk.length} subtitle="Semáforo ou tarefa atrasada" icon={AlertTriangle} />
        <StatCard title="Reuniões 7 dias" value={stats.upcomingMeetings.length} subtitle="Agendadas" icon={CalendarDays} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Central de prioridades</CardTitle>
              <p className="text-sm text-muted-foreground">O que merece atenção antes de virar ruído operacional</p>
            </div>
            <Badge variant={operationalScore >= 80 ? "default" : operationalScore >= 55 ? "secondary" : "destructive"}>
              Saúde {operationalScore}%
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Saúde operacional</span>
                <span className="text-muted-foreground">
                  {stats.overdueTasks.length} tarefas atrasadas · {stats.overdueReceivables.length} cobranças vencidas
                </span>
              </div>
              <Progress value={operationalScore} className="h-2" />
            </div>

            {priorities.length > 0 ? (
              <div className="divide-y rounded-md border">
                {priorities.map((priority, index) => (
                  <Link
                    key={`${priority.href}-${index}`}
                    to={priority.href}
                    className="flex items-center justify-between gap-4 p-3 transition hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{priority.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{priority.meta}</p>
                    </div>
                    <Badge variant={priority.tone === "destructive" ? "destructive" : "secondary"}>
                      {priority.tone === "destructive" ? "Financeiro" : priority.tone === "warning" ? "Ação" : "Diagnóstico"}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-green-600" />
                <p className="text-sm font-medium">Sem pendências críticas no momento</p>
                <p className="text-xs text-muted-foreground">Receitas, tarefas e diagnósticos estão sob controle.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pulso da operação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PulseRow icon={Users} label="Clientes ativos" value={stats.activeClients} href="/clientes" />
            <PulseRow icon={FolderKanban} label="Projetos ativos" value={stats.activeProjects} href="/projetos" />
            <PulseRow icon={ListTodo} label="Tarefas pendentes" value={stats.pendingTasks} href="/plano-acao" />
            <PulseRow icon={CheckCircle2} label="Tarefas concluídas" value={stats.completedTasks} href="/plano-acao" />
            <PulseRow icon={FileSearch} label="Diagnósticos abertos" value={stats.openDiagnostics.length} href="/diagnostico" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectProgress />
        </div>
        <div>
          <TaskQueue />
        </div>
      </div>
    </div>
  );
}

function PulseRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link to={href} className="flex items-center justify-between rounded-md border p-3 transition hover:bg-muted">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </Link>
  );
}

function parseFlexibleDate(value?: string): Date | null {
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
