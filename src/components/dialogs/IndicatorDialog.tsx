import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Indicator } from "@/types";
import { toast } from "sonner";

interface IndicatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator?: Indicator | null;
}

export function IndicatorDialog({ open, onOpenChange, indicator }: IndicatorDialogProps) {
  const { addIndicator, updateIndicator, projects } = useData();
  const [formData, setFormData] = useState({
    name: "",
    category: "Financeiro" as Indicator["category"],
    formula: "",
    unit: "R$" as "R$" | "%" | "quantidade",
    frequency: "mensal" as "diário" | "semanal" | "mensal",
    source: "manual" as "manual" | "planilha" | "integração",
    target: undefined as number | undefined,
    projectId: "",
    projectName: "",
    responsible: "",
    values: [] as { date: string; value: number }[],
  });

  useEffect(() => {
    if (indicator) {
      setFormData({
        name: indicator.name,
        category: indicator.category,
        formula: indicator.formula || "",
        unit: indicator.unit,
        frequency: indicator.frequency,
        source: indicator.source,
        target: indicator.target,
        projectId: indicator.projectId || "",
        projectName: indicator.projectName || "",
        responsible: indicator.responsible,
        values: indicator.values,
      });
    } else {
      setFormData({
        name: "",
        category: "Financeiro",
        formula: "",
        unit: "R$",
        frequency: "mensal",
        source: "manual",
        target: undefined,
        projectId: "",
        projectName: "",
        responsible: "",
        values: [],
      });
    }
  }, [indicator, open]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setFormData({ 
      ...formData, 
      projectId, 
      projectName: project?.name || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (indicator) {
      updateIndicator(indicator.id, formData);
      toast.success("Indicador atualizado com sucesso");
    } else {
      addIndicator(formData);
      toast.success("Indicador criado com sucesso");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{indicator ? "Editar Indicador" : "Novo Indicador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do indicador"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value: Indicator["category"]) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compras">Compras</SelectItem>
                  <SelectItem value="Vendas">Vendas</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                  <SelectItem value="Estoque">Estoque</SelectItem>
                  <SelectItem value="Processo">Processo</SelectItem>
                  <SelectItem value="Pessoas">Pessoas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select value={formData.unit} onValueChange={(value: "R$" | "%" | "quantidade") => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R$">R$</SelectItem>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="quantidade">Quantidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select value={formData.frequency} onValueChange={(value: "diário" | "semanal" | "mensal") => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diário">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Fonte</Label>
              <Select value={formData.source} onValueChange={(value: "manual" | "planilha" | "integração") => setFormData({ ...formData, source: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="planilha">Planilha</SelectItem>
                  <SelectItem value="integração">Integração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Meta</Label>
              <Input
                id="target"
                type="number"
                value={formData.target || ""}
                onChange={(e) => setFormData({ ...formData, target: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Valor meta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="project">Projeto (opcional)</Label>
              <Select value={formData.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="formula">Fórmula / Regra</Label>
              <Input
                id="formula"
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                placeholder="Ex: (Vendas - Custos) / Vendas"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {indicator ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
