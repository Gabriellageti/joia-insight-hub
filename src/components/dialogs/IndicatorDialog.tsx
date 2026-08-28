import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Indicator } from "@/types";
import { toast } from "sonner";
import { NO_PROJECT_VALUE } from "@/lib/select-values";

interface IndicatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator?: Indicator | null;
}

export function IndicatorDialog({ open, onOpenChange, indicator }: IndicatorDialogProps) {
  const { addIndicator, updateIndicator, projects } = useData();
  const isEditing = Boolean(indicator?.id);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Financeiro",
    formula: "",
    unit: "R$",
    frequency: "Mensal",
    source: "manual" as "manual" | "planilha" | "integração",
    targetValue: undefined as number | undefined,
    projectId: "",
    projectName: "",
    responsible: "",
    values: [] as { date: string; value: number }[],
  });

  useEffect(() => {
    if (indicator) {
      setFormData({
        name: indicator.name,
        category: indicator.category || "Financeiro",
        formula: indicator.formula || "",
        unit: indicator.unit || "R$",
        frequency: indicator.frequency || "Mensal",
        source: indicator.source || "manual",
        targetValue: indicator.targetValue ?? undefined,
        projectId: indicator.projectId || "",
        projectName: indicator.projectName || "",
        responsible: indicator.responsible || "",
        values: indicator.values || [],
      });
    } else {
      setFormData({
        name: "",
        category: "Financeiro",
        formula: "",
        unit: "R$",
        frequency: "Mensal",
        source: "manual",
        targetValue: undefined,
        projectId: "",
        projectName: "",
        responsible: "",
        values: [],
      });
    }
  }, [indicator, open]);

  const handleProjectChange = (projectId: string) => {
    const normalizedProjectId = projectId === NO_PROJECT_VALUE ? "" : projectId;
    const project = projects.find(p => p.id === normalizedProjectId);
    setFormData({
      ...formData,
      projectId: normalizedProjectId,
      projectName: project?.name || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && indicator?.id) {
        await updateIndicator(indicator.id, formData);
        toast.success("Indicador atualizado com sucesso");
      } else {
        await addIndicator(formData);
        toast.success("Indicador criado com sucesso");
      }
      onOpenChange(false);
    } catch {
      // DataContext reports the persisted failure and the dialog remains open.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Indicador" : "Novo Indicador"}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário de indicador com categoria, meta e vínculo a projeto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="sm:col-span-2 space-y-2">
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
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compras">Compras</SelectItem>
                  <SelectItem value="Vendas">Vendas</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                  <SelectItem value="Estoque">Estoque</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="RH">RH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R$">R$</SelectItem>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="un">Unidades</SelectItem>
                  <SelectItem value="dias">Dias</SelectItem>
                  <SelectItem value="x">x (Vezes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diário">Diário</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
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
                value={formData.targetValue || ""}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value ? Number(e.target.value) : undefined })}
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
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="project">Projeto (opcional)</Label>
              <Select value={formData.projectId || NO_PROJECT_VALUE} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>Nenhum</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
