import { useMemo } from "react";
import { Users, FolderKanban, AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { TaskQueue } from "@/components/dashboard/TaskQueue";
import { useData } from "@/contexts/DataContext";

export default function Dashboard() {
  const { clients, projects, tasks } = useData();

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

    // Tasks completed this month
    const completedThisMonth = tasks.filter((t) => t.status === "done").length;

    // Pending tasks
    const pendingTasks = tasks.filter((t) => t.status !== "done").length;

    return {
      activeClients,
      activeProjects,
      projectsAtRisk,
      completedThisMonth,
      pendingTasks,
    };
  }, [clients, projects, tasks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da JoIA e projetos ativos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
