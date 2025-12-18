import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";
import { Project } from "@/types";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<Project["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { addProject, updateProject, clients } = useData();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    clientId: "",
    clientName: "",
    objective: "",
    scope: "",
    phase: "Diagnóstico",
    progressOverrideEnabled: false,
    manualProgress: null as number | null,
    progressJustification: "",
    statusOverrideEnabled: false,
    statusOverrideValue: null as Project["status"] | null,
    statusOverrideJustification: "",
    statusOverrideExpiresAt: "",
    statusOverrideAuthor: "",
    responsible: "",
    startDate: "",
    endDate: "",
    moneyHypothesis: "",
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        clientId: project.clientId,
        clientName: project.clientName,
        objective: project.objective || "",
        scope: project.scope || "",
        phase: project.phase,
        progressOverrideEnabled: project.progressOverrideEnabled || false,
        manualProgress: project.manualProgress ?? null,
        progressJustification: project.progressJustification || "",
        statusOverrideEnabled: project.statusOverrideEnabled || false,
        statusOverrideValue: project.statusOverrideValue ?? project.status ?? null,
        statusOverrideJustification: project.statusOverrideJustification || "",
        statusOverrideExpiresAt: project.statusOverrideExpiresAt || "",
        statusOverrideAuthor: project.statusOverrideAuthor || "",
        responsible: project.responsible,
        startDate: project.startDate,
        endDate: project.endDate,
        moneyHypothesis: project.moneyHypothesis || "",
      });
    } else {
      setFormData({
        name: "",
        clientId: "",
        clientName: "",
        objective: "",
        scope: "",
        phase: "Diagnóstico",
        progressOverrideEnabled: false,
        manualProgress: null,
        progressJustification: "",
        statusOverrideEnabled: false,
        statusOverrideValue: null,
        statusOverrideJustification: "",
        statusOverrideExpiresAt: "",
        statusOverrideAuthor: user?.user_metadata?.full_name || user?.email || "",
        responsible: "",
        startDate: "",
        endDate: "",
        moneyHypothesis: "",
      });
    }
  }, [project, open, user]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const clientDisplayName = client ? client.nomeFantasia || client.razaoSocial : "";
    setFormData((prev) => ({
      ...prev,
      clientId,
      clientName: clientDisplayName
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }
    if (!formData.clientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (formData.progressOverrideEnabled) {
      if (formData.manualProgress === null || Number.isNaN(Number(formData.manualProgress))) {
        toast.error("Informe um progresso manual válido entre 0 e 100");
        return;
      }
      if (formData.manualProgress < 0 || formData.manualProgress > 100) {
        toast.error("Progresso manual deve estar entre 0 e 100");
        return;
      }
      if (!formData.progressJustification.trim()) {
        toast.error("Justifique o motivo do progresso manual");
        return;
      }
    }

    if (formData.statusOverrideEnabled) {
      if (!formData.statusOverrideValue) {
        toast.error("Selecione o status manual");
        return;
      }
      if (!formData.statusOverrideJustification.trim()) {
        toast.error("Justifique o motivo do status manual");
        return;
      }
    }

    const statusOverrideAuthor =
      formData.statusOverrideAuthor || user?.user_metadata?.full_name || user?.email || "Administrador";

    const payload = {
      ...formData,
      manualProgress: formData.progressOverrideEnabled ? Number(formData.manualProgress) : null,
      progressJustification: formData.progressOverrideEnabled ? formData.progressJustification.trim() : "",
      statusOverrideEnabled: formData.statusOverrideEnabled,
      statusOverrideValue: formData.statusOverrideEnabled ? formData.statusOverrideValue : null,
      statusOverrideJustification: formData.statusOverrideEnabled ? formData.statusOverrideJustification.trim() : "",
      statusOverrideExpiresAt:
        formData.statusOverrideEnabled && formData.statusOverrideExpiresAt
          ? formData.statusOverrideExpiresAt
          : undefined,
      statusOverrideAuthor: formData.statusOverrideEnabled ? statusOverrideAuthor : "",
    };

    if (project) {
      updateProject(project.id, payload);
      toast.success("Projeto atualizado com sucesso");
    } else {
      addProject(payload);
      toast.success("Projeto criado com sucesso");
    }
    onOpenChange(false);
  };

  const userRole = (user?.user_metadata as Record<string, string | undefined> | undefined)?.role;
  const canForceStatus = !userRole || ["admin_joia", "gestor_projetos"].includes(userRole);
  const statusSummary = project
    ? {
        color: statusColors[project.status],
        description: project.statusReason || "Status calculado automaticamente",
        source: project.statusSource || "calculated",
      }
    : {
        color: statusColors.green,
        description: "Status será calculado automaticamente após salvar",
        source: "calculated",
      };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do projeto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={formData.clientId} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.status === "ativo").map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Objetivo do projeto"
                rows={2}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="scope">Escopo</Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="Escopo do projeto"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase">Fase</Label>
              <Select value={formData.phase} onValueChange={(value) => setFormData({ ...formData, phase: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
                  <SelectItem value="Quick wins">Quick wins</SelectItem>
                  <SelectItem value="Estruturação">Estruturação</SelectItem>
                  <SelectItem value="Cultura e treinamento">Cultura e treinamento</SelectItem>
                  <SelectItem value="Acompanhamento">Acompanhamento</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="col-span-2 space-y-4 rounded-lg border border-border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Saúde do projeto</p>
                  <p className="text-xs text-muted-foreground">
                    Calculada automaticamente a partir de tarefas, evidências, reuniões, finanças e KPIs.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${statusSummary.color}`} />
                  <span className="text-foreground">{statusSummary.description}</span>
                  <Badge variant="outline" className="text-xs">
                    {statusSummary.source === "manual" ? "Manual" : "Automático"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="statusOverride"
                    checked={formData.statusOverrideEnabled}
                    disabled={!canForceStatus}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        statusOverrideEnabled: checked,
                        statusOverrideValue: checked
                          ? prev.statusOverrideValue || project?.status || "green"
                          : null,
                        statusOverrideJustification: checked ? prev.statusOverrideJustification : "",
                        statusOverrideExpiresAt: checked ? prev.statusOverrideExpiresAt : "",
                        statusOverrideAuthor:
                          checked
                            ? prev.statusOverrideAuthor || user?.user_metadata?.full_name || user?.email || ""
                            : "",
                      }))
                    }
                  />
                  <div>
                    <Label htmlFor="statusOverride" className="text-sm font-medium">
                      Forçar status
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Disponível para Admin/Gestor. Adicione justificativa e prazo de expiração opcional.
                    </p>
                  </div>
                </div>
                {formData.statusOverrideEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="statusOverrideValue">Seleção manual</Label>
                    <Select
                      value={formData.statusOverrideValue || undefined}
                      onValueChange={(value: Project["status"]) =>
                        setFormData((prev) => ({ ...prev, statusOverrideValue: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="green">Verde</SelectItem>
                        <SelectItem value="yellow">Amarelo</SelectItem>
                        <SelectItem value="red">Vermelho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.statusOverrideEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="statusOverrideJustification">Justificativa do status</Label>
                    <Textarea
                      id="statusOverrideJustification"
                      value={formData.statusOverrideJustification}
                      onChange={(e) => setFormData((prev) => ({ ...prev, statusOverrideJustification: e.target.value }))}
                      placeholder="Explique por que o status foi ajustado manualmente"
                      rows={3}
                    />
                  </div>
                )}
                {formData.statusOverrideEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="statusOverrideExpiresAt">Expiração do override (opcional)</Label>
                    <Input
                      id="statusOverrideExpiresAt"
                      type="date"
                      value={formData.statusOverrideExpiresAt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, statusOverrideExpiresAt: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2 space-y-4 rounded-lg border border-border p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Detalhes Avançados</p>
                  <p className="text-xs text-muted-foreground">
                    Ajuste a forma de calcular o progresso e registre justificativas de override.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="progressOverride"
                    checked={formData.progressOverrideEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        progressOverrideEnabled: checked,
                        manualProgress: checked ? formData.manualProgress ?? 0 : null,
                        progressJustification: checked ? formData.progressJustification : "",
                      })
                    }
                  />
                  <Label htmlFor="progressOverride" className="text-sm font-medium">
                    Sobrescrever progresso
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manualProgress">Progresso manual (%)</Label>
                  <Input
                    id="manualProgress"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.manualProgress ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        manualProgress: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Informe o percentual"
                    disabled={!formData.progressOverrideEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progressJustification">Justificativa</Label>
                  <Textarea
                    id="progressJustification"
                    value={formData.progressJustification}
                    onChange={(e) => setFormData({ ...formData, progressJustification: e.target.value })}
                    placeholder="Explique o motivo do valor manual"
                    disabled={!formData.progressOverrideEnabled}
                    rows={formData.progressOverrideEnabled ? 3 : 2}
                  />
                </div>
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="moneyHypothesis">Hipótese de Dinheiro na Mesa</Label>
              <Textarea
                id="moneyHypothesis"
                value={formData.moneyHypothesis}
                onChange={(e) => setFormData({ ...formData, moneyHypothesis: e.target.value })}
                placeholder="Descreva a hipótese de valor a ser resgatado"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {project ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
