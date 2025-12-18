import { useState } from "react";
import { Plus, Search, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/contexts/DataContext";
import { EmployeeDialog } from "@/components/dialogs/EmployeeDialog";
import { Employee } from "@/types";

const roleColors: Record<string, string> = { "Gestora de Projetos": "bg-purple-100 text-purple-700", "Gestor de Projetos": "bg-purple-100 text-purple-700", "Analista": "bg-blue-100 text-blue-700" };
const onboardingTasks = [{ id: "1", title: "Conhecer a metodologia JoIA", completed: true }, { id: "2", title: "Estudar playbooks principais", completed: true }, { id: "3", title: "Rodar diagnóstico simulado", completed: true }, { id: "4", title: "Criar plano de ação teste", completed: false }, { id: "5", title: "Participar de reunião com cliente", completed: false }];

export default function Equipe() {
  const { employees } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Equipe e Onboarding</h1><p className="text-muted-foreground">Gerencie colaboradores e trilhas de treinamento</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingEmployee(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Colaborador</Button>
      </div>
      <Tabs defaultValue="team">
        <TabsList><TabsTrigger value="team">Equipe</TabsTrigger><TabsTrigger value="onboarding"><GraduationCap className="h-4 w-4 mr-2" />Onboarding</TabsTrigger></TabsList>
        <TabsContent value="team" className="space-y-4 mt-4">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar colaborador..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditingEmployee(employee); setDialogOpen(true); }}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary text-primary-foreground">{employee.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                    <div className="flex-1"><h3 className="font-semibold">{employee.name}</h3><div className="flex items-center gap-2 mt-1"><Badge className={roleColors[employee.role] || "bg-muted"} variant="outline">{employee.role}</Badge><Badge variant="outline">{employee.seniority}</Badge></div></div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Entrada:</span><span>{employee.startDate}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Projetos ativos:</span><span>{employee.projects}</span></div></div>
                  {employee.status === "onboarding" && <div className="mt-4"><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Onboarding</span><span>{employee.onboardingProgress}%</span></div><Progress value={employee.onboardingProgress} className="h-1.5" /></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="onboarding" className="space-y-4 mt-4">
          <Card><CardHeader><CardTitle>Trilha: Primeiros 7 Dias</CardTitle></CardHeader><CardContent><div className="space-y-3">{onboardingTasks.map((task, index) => (<div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${task.completed ? "bg-green-500 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{task.completed ? "✓" : index + 1}</div><span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</span></div>))}</div></CardContent></Card>
        </TabsContent>
      </Tabs>
      <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editingEmployee} />
    </div>
  );
}
