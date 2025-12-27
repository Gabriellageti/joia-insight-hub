import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Employee } from "@/types";
import { toast } from "sonner";

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

export function EmployeeDialog({ open, onOpenChange, employee }: EmployeeDialogProps) {
  const { addEmployee, updateEmployee } = useData();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    seniority: "Pleno" as "Junior" | "Pleno" | "Senior",
    startDate: "",
    projects: 0,
    onboardingProgress: 0,
    status: "onboarding" as "active" | "onboarding",
    permissions: [] as string[],
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email || "",
        role: employee.role,
        seniority: employee.seniority,
        startDate: employee.startDate,
        projects: employee.projects,
        onboardingProgress: employee.onboardingProgress,
        status: employee.status,
        permissions: employee.permissions,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "",
        seniority: "Pleno",
        startDate: new Date().toLocaleDateString('pt-BR'),
        projects: 0,
        onboardingProgress: 0,
        status: "onboarding",
        permissions: [],
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!formData.role) {
      toast.error("Função é obrigatória");
      return;
    }

    try {
      if (employee) {
        await updateEmployee(employee.id, formData);
        toast.success("Colaborador atualizado com sucesso");
      } else {
        await addEmployee(formData);
        toast.success("Colaborador criado com sucesso");
      }
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o colaborador");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin JoIA">Admin JoIA</SelectItem>
                  <SelectItem value="Gestor de Projetos">Gestor de Projetos</SelectItem>
                  <SelectItem value="Analista">Analista</SelectItem>
                  <SelectItem value="Financeiro JoIA">Financeiro JoIA</SelectItem>
                  <SelectItem value="Marketing JoIA">Marketing JoIA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Senioridade</Label>
              <Select value={formData.seniority} onValueChange={(value: "Junior" | "Pleno" | "Senior") => setFormData({ ...formData, seniority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Pleno">Pleno</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Entrada</Label>
              <Input
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: "active" | "onboarding") => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Em Onboarding</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {employee ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
