import { Users, FolderKanban, AlertTriangle, DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { TaskQueue } from "@/components/dashboard/TaskQueue";
import { MoneyOnTable } from "@/components/dashboard/MoneyOnTable";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da JoIA e projetos ativos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Clientes Ativos" 
          value={24} 
          icon={Users}
          trend={{ value: 12, positive: true }}
        />
        <StatCard 
          title="Projetos em Andamento" 
          value={18} 
          icon={FolderKanban}
        />
        <StatCard 
          title="Projetos em Risco" 
          value={3} 
          subtitle="Tarefas atrasadas"
          icon={AlertTriangle}
        />
        <StatCard 
          title="MRR" 
          value="R$ 45.800" 
          icon={DollarSign}
          trend={{ value: 8, positive: true }}
          highlight
        />
        <StatCard 
          title="A Receber (15 dias)" 
          value="R$ 32.500" 
          icon={CreditCard}
        />
        <StatCard 
          title="Margem Média" 
          value="42%" 
          subtitle="Por projeto"
          icon={TrendingUp}
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
