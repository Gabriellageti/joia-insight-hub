import { useMemo } from "react";
import { Users, FolderKanban, AlertTriangle, DollarSign, CheckCircle2, ListTodo } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { TaskQueue } from "@/components/dashboard/TaskQueue";
import { MoneyOnTable } from "@/components/dashboard/MoneyOnTable";
import { useData } from "@/contexts/DataContext";

export default function Dashboard() {
  const { clients, projects, tasks, opportunities } = useData();

  const stats = useMemo(() => {
    // Active clients
    const activeClients = clients.filter((c) => c.status === "ativo").length;

    // All projects are considered active (we don't have "Concluído" in the type)
    const activeProjects = projects.length;

    // Projects at risk (status is yellow or red, or has overdue tasks)
    const today = new Date();
    const projectsWithOverdueTasks = new Set<string>();
    tasks.forEach((task) => {
      if (task.status !== "done" && task.dueDate) {
        const dueDate = parseDateBR(task.dueDate);
        if (dueDate && dueDate < today) {
          projectsWithOverdueTasks.add(task.projectId);
        }
      }
    });
    const projectsAtRisk = projects.filter(
      (p) =>
        p.status === "yellow" ||
        p.status === "red" ||
        projectsWithOverdueTasks.has(p.id)
    ).length;

    // Money on table (total opportunities)
    const totalOpportunities = opportunities.reduce(
      (acc, o) => acc + (o.estimatedValue || 0),
      0
    );

    // Tasks completed this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const completedThisMonth = tasks.filter((t) => {
      if (t.status !== "done") return false;
      // Assuming createdAt is when it was marked done (simplified)
      return true;
    }).length;

    // Pending tasks
    const pendingTasks = tasks.filter((t) => t.status !== "done").length;

    return {
      activeClients,
      activeProjects,
      projectsAtRisk,
      totalOpportunities,
      completedThisMonth,
      pendingTasks,
    };
  }, [clients, projects, tasks, opportunities]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da JoIA e projetos ativos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Clientes Ativos"
          value={stats.activeClients}
          icon={Users}
        />
        <StatCard
          title="Projetos em Andamento"
          value={stats.activeProjects}
          icon={FolderKanban}
        />
        <StatCard
          title="Projetos em Risco"
          value={stats.projectsAtRisk}
          subtitle="Com tarefas atrasadas"
          icon={AlertTriangle}
        />
        <StatCard
          title="Dinheiro na Mesa"
          value={formatCurrency(stats.totalOpportunities)}
          icon={DollarSign}
          highlight
        />
        <StatCard
          title="Tarefas Concluídas"
          value={stats.completedThisMonth}
          subtitle="Total"
          icon={CheckCircle2}
        />
        <StatCard
          title="Tarefas Pendentes"
          value={stats.pendingTasks}
          icon={ListTodo}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectProgress />
        </div>
        <div>
          <TaskQueue />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MoneyOnTable />
      </div>
    </div>
  );
}

// Helper to parse dd/mm/yyyy dates
function parseDateBR(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}
