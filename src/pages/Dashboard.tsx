import { useMemo } from "react";
import { Users, FolderKanban, AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { TaskQueue } from "@/components/dashboard/TaskQueue";
import { useData } from "@/contexts/DataContext";
import { calculateDashboardMetrics } from "@/lib/dashboard/metrics";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { clients, projects, tasks } = useData();

  const stats = useMemo(
    () => calculateDashboardMetrics(clients, projects, tasks),
    [clients, projects, tasks],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da JoIA e projetos ativos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link to="/clientes"><StatCard title="Clientes Ativos" value={stats.activeClients} icon={Users} /></Link>
        <Link to="/projetos"><StatCard title="Projetos em Andamento" value={stats.activeProjects} icon={FolderKanban} /></Link>
        <Link to="/projetos"><StatCard title="Projetos em Risco" value={stats.projectsAtRisk} subtitle="Status de atenção ou tarefas atrasadas" icon={AlertTriangle} /></Link>
        <Link to="/plano-acao"><StatCard title="Tarefas Concluídas" value={stats.completedThisMonth} subtitle="Neste mês" icon={CheckCircle2} /></Link>
        <Link to="/plano-acao"><StatCard title="Tarefas Pendentes" value={stats.pendingTasks} icon={ListTodo} /></Link>
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
