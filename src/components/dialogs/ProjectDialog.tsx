import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";
import { Project } from "@/types";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  calculateForecastEndDate,
  durationLabel,
  ProjectDuration,
} from "@/lib/dates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<Project["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const RESPONSIBLE_ROLES = [
  "Admin",
  "Gestor",
  "Analista",
  "Admin JoIA",
  "Gestor JoIA",
  "Analista JoIA",
  "gestor_projetos",
  "admin_joia",
  "analista",
] as const;

const PHASES = [
  "Diagnóstico",
  "Planejamento",
  "Execução",
  "Acompanhamento",
  "Encerramento",
];

const DURATION_OPTIONS: { value: ProjectDuration; label: string }[] = [
  { value: "2w", label: "2 semanas" },
  { value: "4w", label: "4 semanas" },
  { value: "8w", label: "8 semanas" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
];

const getInitials = (value?: string) =>
  value
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "--";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSuccess?: (project: { id: string; name: string; clientId: string }) => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectDialogProps) {
  const { addProject, updateProject, clients, employees } = useData();
  const { user } = useAuth();
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    responsibleUserId: "",
    responsibleNameLegacy: "",
    startDate: "",
    estimatedDuration: "8w" as ProjectDuration | null,
    forecastEndDate: "",
    forecastAdjustedManually: false,
  });

  const isEditing = Boolean(project?.id);

  const initKey = open
    ? isEditing
      ? `edit:${project!.id}`
      : project
        ? `prefill:${project.clientId}`
        : "new"
    : "closed";

  const initializedKeyRef = useRef<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      initializedKeyRef.current = null;
      return;
    }

    if (initializedKeyRef.current === initKey) return;
    initializedKeyRef.current = initKey;

    const authorName = user?.user_metadata?.full_name || user?.email || "";

    if (project?.id) {
      // Editing existing project
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
        statusOverrideAuthor: project.statusOverrideAuthor || authorName,
        responsibleUserId: project.responsibleUserId || "",
        responsibleNameLegacy: project.responsibleNameLegacy || project.responsible || "",
        startDate: project.startDate,
        estimatedDuration: project.estimatedDuration ?? null,
        forecastEndDate: project.forecastEndDate || project.endDate || "",
        forecastAdjustedManually:
          project.forecastAdjustedManually || project.estimatedDuration === "manual",
      });
    } else if (project) {
      // Prefilled draft (from journey automation)
      setFormData({
        name: project.name || "",
        clientId: project.clientId || "",
        clientName: project.clientName || "",
        objective: project.objective || "",
        scope: project.scope || "",
        phase: project.phase || "Diagnóstico",
        progressOverrideEnabled: false,
        manualProgress: null,
        progressJustification: "",
        statusOverrideEnabled: false,
        statusOverrideValue: null,
        statusOverrideJustification: "",
        statusOverrideExpiresAt: "",
        statusOverrideAuthor: authorName,
        responsibleUserId: project.responsibleUserId || "",
        responsibleNameLegacy: project.responsibleNameLegacy || project.responsible || "",
        startDate: project.startDate || "",
        estimatedDuration: project.estimatedDuration ?? "8w",
        forecastEndDate: project.forecastEndDate || project.endDate || "",
        forecastAdjustedManually: project.forecastAdjustedManually || false,
      });
    } else {
      // Brand new project
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
        statusOverrideAuthor: authorName,
        responsibleUserId: "",
        responsibleNameLegacy: "",
        startDate: "",
        estimatedDuration: "8w",
        forecastEndDate: "",
        forecastAdjustedManually: false,
      });
    }
  }, [open, initKey, project, user]);

  // Auto-calculate forecast end date
  useEffect(() => {
    if (formData.forecastAdjustedManually) return;
    const forecast = calculateForecastEndDate(
      formData.startDate,
      formData.estimatedDuration as ProjectDuration | null
    );
    setFormData((prev) =>
      prev.forecastEndDate === forecast ? prev : { ...prev, forecastEndDate: forecast }
    );
  }, [formData.startDate, formData.estimatedDuration, formData.forecastAdjustedManually]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    const clientDisplayName = client ? client.nomeFantasia || client.razaoSocial : "";
    setFormData((prev) => ({
      ...prev,
      clientId,
      clientName: clientDisplayName,
    }));
  };

  const eligibleUsers = employees
    .filter(
      (employee) =>
        employee.status === "active" &&
        RESPONSIBLE_ROLES.includes(
          (employee.accessRole || employee.role) as (typeof RESPONSIBLE_ROLES)[number]
        )
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedResponsible = eligibleUsers.find(
    (employee) => employee.id === formData.responsibleUserId
  );

  const handleLinkResponsible = () => {
    if (selectedResponsible || !formData.responsibleNameLegacy) return;
    const match = eligibleUsers.find((emp) =>
      emp.name.toLowerCase().includes(formData.responsibleNameLegacy.toLowerCase())
    );

    if (match) {
      setFormData((prev) => ({ ...prev, responsibleUserId: match.id }));
      toast.success(`Responsável vinculado a ${match.name}`);
    } else {
      toast.error("Nenhum colaborador compatível encontrado");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }
    if (!formData.clientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!formData.responsibleUserId) {
      toast.error("Selecione um responsável interno");
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

    setIsSubmitting(true);

    const statusOverrideAuthor =
      formData.statusOverrideAuthor ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "Administrador";

    const forecastFromDuration = calculateForecastEndDate(
      formData.startDate,
      formData.estimatedDuration as ProjectDuration | null
    );

    const resolvedForecast = formData.forecastAdjustedManually
      ? formData.forecastEndDate
      : forecastFromDuration || formData.forecastEndDate;

    const responsibleName = selectedResponsible?.name || formData.responsibleNameLegacy || "";

    const payload = {
      name: formData.name.trim(),
      clientId: formData.clientId,
      clientName: formData.clientName,
      objective: formData.objective.trim(),
      scope: formData.scope.trim(),
      phase: formData.phase,
      progressOverrideEnabled: formData.progressOverrideEnabled,
      manualProgress: formData.progressOverrideEnabled ? Number(formData.manualProgress) : null,
      progressJustification: formData.progressOverrideEnabled
        ? formData.progressJustification.trim()
        : "",
      statusOverrideEnabled: formData.statusOverrideEnabled,
      statusOverrideValue: formData.statusOverrideEnabled ? formData.statusOverrideValue : null,
      statusOverrideJustification: formData.statusOverrideEnabled
        ? formData.statusOverrideJustification.trim()
        : "",
      statusOverrideExpiresAt:
        formData.statusOverrideEnabled && formData.statusOverrideExpiresAt
          ? formData.statusOverrideExpiresAt
          : undefined,
      statusOverrideAuthor: formData.statusOverrideEnabled ? statusOverrideAuthor : "",
      responsibleUserId: formData.responsibleUserId,
      responsibleNameLegacy: formData.responsibleNameLegacy || responsibleName,
      responsible: responsibleName,
      startDate: formData.startDate,
      estimatedDuration: formData.forecastAdjustedManually ? "manual" : formData.estimatedDuration,
      forecastAdjustedManually: formData.forecastAdjustedManually,
      forecastEndDate: resolvedForecast,
      endDate: resolvedForecast,
    };

    try {
      if (isEditing && project?.id) {
        await updateProject(project.id, payload);
        toast.success("Projeto atualizado com sucesso!");
        onSuccess?.({ id: project.id, name: payload.name, clientId: payload.clientId });
      } else {
        await addProject(payload);
        toast.success("Projeto criado com sucesso!");
        // For new projects, we don't have the ID immediately, so we pass the form data
        onSuccess?.({ id: "", name: payload.name, clientId: payload.clientId });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
      toast.error("Erro ao salvar projeto. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do projeto"
              : "Preencha os dados para criar um novo projeto"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Informações Básicas</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome do Projeto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Diagnóstico Operacional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">
                    Cliente <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.clientId} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nomeFantasia || client.razaoSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Textarea
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => setFormData((prev) => ({ ...prev, objective: e.target.value }))}
                  placeholder="Descreva o objetivo principal do projeto"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">Escopo</Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scope: e.target.value }))}
                  placeholder="Descreva o escopo do projeto"
                  rows={2}
                />
              </div>
            </div>

            {/* Responsible & Phase */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Responsável e Fase</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Responsável <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={responsibleOpen} onOpenChange={setResponsibleOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={responsibleOpen}
                        className="w-full justify-between"
                      >
                        {selectedResponsible ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(selectedResponsible.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedResponsible.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Selecione...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar colaborador..." />
                        <CommandList>
                          <CommandEmpty>Nenhum colaborador encontrado</CommandEmpty>
                          <CommandGroup>
                            {eligibleUsers.map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={employee.name}
                                onSelect={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    responsibleUserId: employee.id,
                                  }));
                                  setResponsibleOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.responsibleUserId === employee.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(employee.name)}
                                  </AvatarFallback>
                                </Avatar>
                                {employee.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {formData.responsibleNameLegacy && !selectedResponsible && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Legado: {formData.responsibleNameLegacy}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLinkResponsible}
                        className="h-6 text-xs"
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Vincular
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phase">Fase Atual</Label>
                  <Select
                    value={formData.phase}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, phase: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a fase" />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASES.map((phase) => (
                        <SelectItem key={phase} value={phase}>
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Datas e Prazos</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração Estimada</Label>
                  <Select
                    value={formData.forecastAdjustedManually ? "manual" : (formData.estimatedDuration || "")}
                    onValueChange={(value) => {
                      if (value === "manual") {
                        setFormData((prev) => ({
                          ...prev,
                          forecastAdjustedManually: true,
                          estimatedDuration: null,
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          forecastAdjustedManually: false,
                          estimatedDuration: value as ProjectDuration,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="manual">Definir manualmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forecastEndDate">Previsão de Término</Label>
                  <Input
                    id="forecastEndDate"
                    type="date"
                    value={formData.forecastEndDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        forecastEndDate: e.target.value,
                        forecastAdjustedManually: true,
                      }))
                    }
                    disabled={!formData.forecastAdjustedManually && !!formData.estimatedDuration}
                  />
                  {!formData.forecastAdjustedManually && formData.estimatedDuration && (
                    <p className="text-xs text-muted-foreground">
                      Calculado automaticamente ({durationLabel(formData.estimatedDuration)})
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Override */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Sobrescrever Progresso</h3>
                  <p className="text-xs text-muted-foreground">
                    Definir progresso manualmente ao invés de calcular por tarefas
                  </p>
                </div>
                <Switch
                  checked={formData.progressOverrideEnabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, progressOverrideEnabled: checked }))
                  }
                />
              </div>

              {formData.progressOverrideEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="manualProgress">Progresso Manual (%)</Label>
                    <Input
                      id="manualProgress"
                      type="number"
                      min={0}
                      max={100}
                      value={formData.manualProgress ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          manualProgress: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      placeholder="0-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="progressJustification">Justificativa</Label>
                    <Input
                      id="progressJustification"
                      value={formData.progressJustification}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          progressJustification: e.target.value,
                        }))
                      }
                      placeholder="Motivo da sobrescrita"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status Override */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Sobrescrever Status</h3>
                  <p className="text-xs text-muted-foreground">
                    Definir status manualmente (semáforo)
                  </p>
                </div>
                <Switch
                  checked={formData.statusOverrideEnabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, statusOverrideEnabled: checked }))
                  }
                />
              </div>

              {formData.statusOverrideEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.statusOverrideValue || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          statusOverrideValue: value as Project["status"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(["green", "yellow", "red"] as const).map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-3 h-3 rounded-full", statusColors[status])} />
                              {status === "green" && "Verde (OK)"}
                              {status === "yellow" && "Amarelo (Atenção)"}
                              {status === "red" && "Vermelho (Crítico)"}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statusJustification">Justificativa</Label>
                    <Input
                      id="statusJustification"
                      value={formData.statusOverrideJustification}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          statusOverrideJustification: e.target.value,
                        }))
                      }
                      placeholder="Motivo da sobrescrita"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statusExpires">Expira em</Label>
                    <Input
                      id="statusExpires"
                      type="date"
                      value={formData.statusOverrideExpiresAt}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          statusOverrideExpiresAt: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Opcional: data em que o status volta a ser calculado
                    </p>
                  </div>
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="project-form" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
