import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Opportunity, Project } from "@/types";
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
  safeNumber,
} from "@/lib/dates";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusColors: Record<Project["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const OPPORTUNITY_STATUSES: Opportunity["status"][] = [
  "Identificado",
  "Em validação",
  "Em execução",
  "Resgatado",
];

const OPPORTUNITY_TYPES: Opportunity["type"][] = [
  "Receita incremental",
  "Redução de custos",
  "Eficiência operacional",
  "Risco evitado",
  "Outro",
];

const CONFIDENCE_OPTIONS: Opportunity["confidence"][] = [
  "alta",
  "media",
  "baixa",
];

type OpportunityDraft = {
  id?: string;
  type: Opportunity["type"];
  description: string;
  estimatedValue: string;
  confidence: Opportunity["confidence"];
  evidenceType: Opportunity["evidenceType"];
  evidenceReference: string;
  status?: Opportunity["status"];
};

const RESPONSIBLE_ROLES = ["Admin", "Gestor", "Analista"] as const;

const defaultOpportunityDraft = (): OpportunityDraft => ({
  type: "Receita incremental",
  description: "",
  estimatedValue: "",
  confidence: "media",
  evidenceType: "a_coletar",
  evidenceReference: "",
  status: "Identificado",
});

const mapOpportunityToDraft = (opportunity: Opportunity): OpportunityDraft => ({
  id: opportunity.id,
  type: opportunity.type,
  description: opportunity.description,
  estimatedValue:
    typeof opportunity.estimatedValue === "number"
      ? String(opportunity.estimatedValue)
      : "",
  confidence: opportunity.confidence,
  evidenceType: opportunity.evidenceType,
  evidenceReference: opportunity.evidenceReference || "",
  status: opportunity.status,
});

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
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: ProjectDialogProps) {
  const {
    addProject,
    updateProject,
    clients,
    employees,
    opportunities,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
  } = useData();
  const { user } = useAuth();
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const [opportunityDrafts, setOpportunityDrafts] = useState<
    OpportunityDraft[]
  >([defaultOpportunityDraft()]);
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
    autoStructure: true,
  });

  useEffect(() => {
    if (project) {
      const projectOpportunities = opportunities.filter(
        (opportunity) => opportunity.projectId === project.id,
      );
      setOpportunityDrafts(
        projectOpportunities.length > 0
          ? projectOpportunities.map(mapOpportunityToDraft)
          : [defaultOpportunityDraft()],
      );

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
        statusOverrideValue:
          project.statusOverrideValue ?? project.status ?? null,
        statusOverrideJustification: project.statusOverrideJustification || "",
        statusOverrideExpiresAt: project.statusOverrideExpiresAt || "",
        statusOverrideAuthor: project.statusOverrideAuthor || "",
        responsibleUserId: project.responsibleUserId || "",
        responsibleNameLegacy:
          project.responsibleNameLegacy || project.responsible || "",
        startDate: project.startDate,
        estimatedDuration: project.estimatedDuration ?? null,
        forecastEndDate: project.forecastEndDate || project.endDate || "",
        forecastAdjustedManually:
          project.forecastAdjustedManually ||
          project.estimatedDuration === "manual",
        autoStructure: true,
      });
    } else {
      setOpportunityDrafts([defaultOpportunityDraft()]);
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
        statusOverrideAuthor:
          user?.user_metadata?.full_name || user?.email || "",
        responsibleUserId: "",
        responsibleNameLegacy: "",
        startDate: "",
        estimatedDuration: "8w",
        forecastEndDate: "",
        forecastAdjustedManually: false,
        autoStructure: true,
      });
    }
  }, [project, open, user, opportunities]);

  useEffect(() => {
    if (formData.forecastAdjustedManually) return;
    const forecast = calculateForecastEndDate(
      formData.startDate,
      formData.estimatedDuration as ProjectDuration | null,
    );
    setFormData((prev) =>
      prev.forecastEndDate === forecast
        ? prev
        : { ...prev, forecastEndDate: forecast },
    );
  }, [
    formData.startDate,
    formData.estimatedDuration,
    formData.forecastAdjustedManually,
  ]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    const clientDisplayName = client
      ? client.nomeFantasia || client.razaoSocial
      : "";
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
          (employee.accessRole || employee.role) as string,
        ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedResponsible = eligibleUsers.find(
    (employee) => employee.id === formData.responsibleUserId,
  );

  const handleOpportunityChange = (
    index: number,
    field: keyof OpportunityDraft,
    value: string,
  ) => {
    setOpportunityDrafts((prev) =>
      prev.map((opportunity, idx) =>
        idx === index ? { ...opportunity, [field]: value } : opportunity,
      ),
    );
  };

  const addOpportunityDraftRow = () => {
    setOpportunityDrafts((prev) => [...prev, defaultOpportunityDraft()]);
  };

  const removeOpportunityDraft = (index: number) => {
    setOpportunityDrafts((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index),
    );
  };

  const handleLinkResponsible = () => {
    if (selectedResponsible || !formData.responsibleNameLegacy) return;
    const match = eligibleUsers.find((user) =>
      user.name
        .toLowerCase()
        .includes(formData.responsibleNameLegacy.toLowerCase()),
    );

    if (match) {
      setFormData((prev) => ({ ...prev, responsibleUserId: match.id }));
      toast.success(`Responsável vinculado a ${match.name}`);
    } else {
      toast.error(
        "Nenhum colaborador compatível encontrado para o responsável legado",
      );
    }
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
    if (!formData.responsibleUserId) {
      toast.error("Selecione um responsável interno para o projeto");
      return;
    }
    if (formData.progressOverrideEnabled) {
      if (
        formData.manualProgress === null ||
        Number.isNaN(Number(formData.manualProgress))
      ) {
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

    const normalizedOpportunities = opportunityDrafts
      .map((opportunity) => ({
        ...opportunity,
        description: opportunity.description.trim(),
      }))
      .filter((opportunity) => opportunity.description.length > 0);

    if (normalizedOpportunities.length === 0) {
      toast.error("Adicione pelo menos uma oportunidade de 'Dinheiro na mesa'");
      return;
    }

    const invalidOpportunity = normalizedOpportunities.find(
      (opportunity) => !opportunity.confidence || !opportunity.type,
    );
    if (invalidOpportunity) {
      toast.error("Preencha tipo, confiança e descrição das oportunidades");
      return;
    }

    const statusOverrideAuthor =
      formData.statusOverrideAuthor ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "Administrador";

    const forecastFromDuration = calculateForecastEndDate(
      formData.startDate,
      formData.estimatedDuration as ProjectDuration | null,
    );

    const resolvedForecast = formData.forecastAdjustedManually
      ? formData.forecastEndDate
      : forecastFromDuration || formData.forecastEndDate;

    const responsibleName =
      selectedResponsible?.name || formData.responsibleNameLegacy || "";

    const { autoStructure, forecastAdjustedManually, ...restFormData } =
      formData;

    const payload = {
      ...restFormData,
      manualProgress: formData.progressOverrideEnabled
        ? Number(formData.manualProgress)
        : null,
      progressJustification: formData.progressOverrideEnabled
        ? formData.progressJustification.trim()
        : "",
      statusOverrideEnabled: formData.statusOverrideEnabled,
      statusOverrideValue: formData.statusOverrideEnabled
        ? formData.statusOverrideValue
        : null,
      statusOverrideJustification: formData.statusOverrideEnabled
        ? formData.statusOverrideJustification.trim()
        : "",
      statusOverrideExpiresAt:
        formData.statusOverrideEnabled && formData.statusOverrideExpiresAt
          ? formData.statusOverrideExpiresAt
          : undefined,
      statusOverrideAuthor: formData.statusOverrideEnabled
        ? statusOverrideAuthor
        : "",
      responsible: responsibleName,
      responsibleNameLegacy: formData.responsibleNameLegacy || responsibleName,
      estimatedDuration: forecastAdjustedManually
        ? "manual"
        : restFormData.estimatedDuration,
      forecastAdjustedManually,
      forecastEndDate: resolvedForecast,
      endDate: resolvedForecast,
    };

    const parsedOpportunities = normalizedOpportunities.map((opportunity) => ({
      ...opportunity,
      estimatedValue: safeNumber(opportunity.estimatedValue),
      evidenceReference: opportunity.evidenceReference.trim(),
      status: opportunity.status || "Identificado",
      responsibleUserId: payload.responsibleUserId || null,
    }));

    if (project) {
      updateProject(project.id, payload);

      const existing = opportunities.filter(
        (opportunity) => opportunity.projectId === project.id,
      );

      parsedOpportunities.forEach((opportunity) => {
        if (opportunity.id) {
          updateOpportunity(opportunity.id, opportunity);
        } else {
          addOpportunity({
            ...opportunity,
            projectId: project.id,
            clientId: payload.clientId,
          });
        }
      });

      existing.forEach((opportunity) => {
        if (!parsedOpportunities.some((draft) => draft.id === opportunity.id)) {
          deleteOpportunity(opportunity.id);
        }
      });
      toast.success("Projeto atualizado com sucesso");
    } else {
      addProject(payload, {
        opportunities: parsedOpportunities.map((opportunity) => ({
          ...opportunity,
          clientId: payload.clientId,
        })),
        seedStructure: autoStructure,
      });
      toast.success("Projeto criado com sucesso");
    }
    onOpenChange(false);
  };

  const userRole = (
    user?.user_metadata as Record<string, string | undefined> | undefined
  )?.role;
  const canForceStatus =
    !userRole || ["admin_joia", "gestor_projetos"].includes(userRole);
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0 flex flex-col">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>
              {project ? "Editar Projeto" : "Novo Projeto"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Projeto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do projeto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients
                      .filter((c) => c.status === "ativo")
                      .map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nomeFantasia || client.razaoSocial}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Textarea
                  id="objective"
                  value={formData.objective}
                  onChange={(e) =>
                    setFormData({ ...formData, objective: e.target.value })
                  }
                  placeholder="Objetivo do projeto"
                  rows={2}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="scope">Escopo</Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({ ...formData, scope: e.target.value })
                  }
                  placeholder="Escopo do projeto"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase">Fase</Label>
                <Select
                  value={formData.phase}
                  onValueChange={(value) =>
                    setFormData({ ...formData, phase: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
                    <SelectItem value="Quick wins">Quick wins</SelectItem>
                    <SelectItem value="Estruturação">Estruturação</SelectItem>
                    <SelectItem value="Cultura e treinamento">
                      Cultura e treinamento
                    </SelectItem>
                    <SelectItem value="Acompanhamento">
                      Acompanhamento
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Popover
                  open={responsibleOpen}
                  onOpenChange={setResponsibleOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      type="button"
                    >
                      {selectedResponsible ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(selectedResponsible.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-medium leading-none">
                              {selectedResponsible.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedResponsible.accessRole ||
                                selectedResponsible.role}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Selecione um responsável interno
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar responsável..." />
                      <CommandList>
                        <CommandEmpty>
                          Nenhum responsável encontrado
                        </CommandEmpty>
                        <CommandGroup heading="Equipe interna">
                          {eligibleUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              onSelect={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  responsibleUserId: user.id,
                                  responsibleNameLegacy:
                                    prev.responsibleNameLegacy || user.name,
                                }));
                                setResponsibleOpen(false);
                              }}
                              className="gap-3"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {user.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {user.accessRole || user.role}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {!selectedResponsible && formData.responsibleNameLegacy && (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Responsável legado: {formData.responsibleNameLegacy}
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0 text-xs"
                      onClick={handleLinkResponsible}
                    >
                      Vincular responsável
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Data Início</Label>
                <Input
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <div className="space-y-2">
                <Label>Duração estimada</Label>
                {formData.forecastAdjustedManually ? (
                  <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    <span>Duração definida manualmente</span>
                    <Badge variant="outline">
                      {durationLabel(formData.estimatedDuration)}
                    </Badge>
                  </div>
                ) : (
                  <Select
                    value={
                      (formData.estimatedDuration as
                        | ProjectDuration
                        | undefined) || undefined
                    }
                    onValueChange={(value: ProjectDuration) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimatedDuration: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a duração" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2w">2 semanas</SelectItem>
                      <SelectItem value="4w">4 semanas</SelectItem>
                      <SelectItem value="8w">8 semanas</SelectItem>
                      <SelectItem value="3m">3 meses</SelectItem>
                      <SelectItem value="6m">6 meses</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Usada para calcular a previsão de término.
                </p>
              </div>

              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="forecastEndDate">Previsão de fim</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      id="forecastManual"
                      checked={formData.forecastAdjustedManually}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          forecastAdjustedManually: checked,
                          estimatedDuration: checked
                            ? "manual"
                            : prev.estimatedDuration || "8w",
                        }))
                      }
                    />
                    <span>Ajustar manualmente</span>
                  </div>
                </div>
                <Input
                  id="forecastEndDate"
                  value={formData.forecastEndDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      forecastEndDate: e.target.value,
                    })
                  }
                  placeholder="dd/mm/aaaa"
                  readOnly={!formData.forecastAdjustedManually}
                />
              </div>

              <div className="col-span-2 flex items-center gap-3 rounded-md border border-dashed border-border p-3">
                <Switch
                  id="autoStructure"
                  checked={formData.autoStructure}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, autoStructure: checked }))
                  }
                />
                <div>
                  <Label
                    htmlFor="autoStructure"
                    className="text-sm font-medium"
                  >
                    Criar estrutura automática
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gera tarefas iniciais no Kanban com base na fase selecionada
                    e data de início.
                  </p>
                </div>
              </div>

              <div className="col-span-2 space-y-4 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Saúde do projeto
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Calculada automaticamente a partir de tarefas, evidências,
                      reuniões, finanças e KPIs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className={`h-2 w-2 rounded-full ${statusSummary.color}`}
                    />
                    <span className="text-foreground">
                      {statusSummary.description}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {statusSummary.source === "manual"
                        ? "Manual"
                        : "Automático"}
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
                            ? prev.statusOverrideValue ||
                              project?.status ||
                              "green"
                            : null,
                          statusOverrideJustification: checked
                            ? prev.statusOverrideJustification
                            : "",
                          statusOverrideExpiresAt: checked
                            ? prev.statusOverrideExpiresAt
                            : "",
                          statusOverrideAuthor: checked
                            ? prev.statusOverrideAuthor ||
                              user?.user_metadata?.full_name ||
                              user?.email ||
                              ""
                            : "",
                        }))
                      }
                    />
                    <div>
                      <Label
                        htmlFor="statusOverride"
                        className="text-sm font-medium"
                      >
                        Forçar status
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Disponível para Admin/Gestor. Adicione justificativa e
                        prazo de expiração opcional.
                      </p>
                    </div>
                  </div>

                  {formData.statusOverrideEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="statusOverrideValue">
                        Seleção manual
                      </Label>
                      <Select
                        value={formData.statusOverrideValue || undefined}
                        onValueChange={(value: Project["status"]) =>
                          setFormData((prev) => ({
                            ...prev,
                            statusOverrideValue: value,
                          }))
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
                      <Label htmlFor="statusOverrideJustification">
                        Justificativa do status
                      </Label>
                      <Textarea
                        id="statusOverrideJustification"
                        value={formData.statusOverrideJustification}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            statusOverrideJustification: e.target.value,
                          }))
                        }
                        placeholder="Explique por que o status foi ajustado manualmente"
                        rows={3}
                      />
                    </div>
                  )}

                  {formData.statusOverrideEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="statusOverrideExpiresAt">
                        Expiração do override (opcional)
                      </Label>
                      <Input
                        id="statusOverrideExpiresAt"
                        type="date"
                        value={formData.statusOverrideExpiresAt}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            statusOverrideExpiresAt: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2 space-y-4 rounded-lg border border-border p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Detalhes Avançados
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ajuste a forma de calcular o progresso e registre
                      justificativas de override.
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
                          manualProgress: checked
                            ? (formData.manualProgress ?? 0)
                            : null,
                          progressJustification: checked
                            ? formData.progressJustification
                            : "",
                        })
                      }
                    />
                    <Label
                      htmlFor="progressOverride"
                      className="text-sm font-medium"
                    >
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
                          manualProgress:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          progressJustification: e.target.value,
                        })
                      }
                      placeholder="Explique o motivo do valor manual"
                      disabled={!formData.progressOverrideEnabled}
                      rows={formData.progressOverrideEnabled ? 3 : 2}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-4 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Oportunidades (Dinheiro na mesa)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estruture hipóteses com tipo, confiança e valor estimado
                      para alimentar o dashboard.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addOpportunityDraftRow}
                  >
                    Adicionar oportunidade
                  </Button>
                </div>

                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-3">
                    {opportunityDrafts.map((opportunity, index) => (
                      <div
                        key={opportunity.id || `draft-${index}`}
                        className="space-y-3 rounded-md border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <Select
                              value={opportunity.status || "Identificado"}
                              onValueChange={(value: Opportunity["status"]) =>
                                handleOpportunityChange(index, "status", value)
                              }
                            >
                              <SelectTrigger className="h-7 w-[150px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPPORTUNITY_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {opportunityDrafts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeOpportunityDraft(index)}
                            >
                              Remover
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={opportunity.type}
                              onValueChange={(value: Opportunity["type"]) =>
                                handleOpportunityChange(index, "type", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPPORTUNITY_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Confiança</Label>
                            <Select
                              value={opportunity.confidence}
                              onValueChange={(
                                value: Opportunity["confidence"],
                              ) =>
                                handleOpportunityChange(
                                  index,
                                  "confidence",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONFIDENCE_OPTIONS.map((confidence) => (
                                  <SelectItem
                                    key={confidence}
                                    value={confidence}
                                  >
                                    {confidence === "alta"
                                      ? "Alta"
                                      : confidence === "media"
                                        ? "Média"
                                        : "Baixa"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Valor estimado (opcional)</Label>
                            <Input
                              value={opportunity.estimatedValue}
                              onChange={(e) =>
                                handleOpportunityChange(
                                  index,
                                  "estimatedValue",
                                  e.target.value,
                                )
                              }
                              placeholder="R$ 0,00"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Tipo de evidência</Label>
                            <Select
                              value={opportunity.evidenceType}
                              onValueChange={(
                                value: Opportunity["evidenceType"],
                              ) =>
                                handleOpportunityChange(
                                  index,
                                  "evidenceType",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="a_coletar">
                                  A coletar
                                </SelectItem>
                                <SelectItem value="upload">
                                  Upload / anexo
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {opportunity.evidenceType === "upload" && (
                          <div className="space-y-2">
                            <Label>Evidência inicial</Label>
                            <Input
                              value={opportunity.evidenceReference}
                              onChange={(e) =>
                                handleOpportunityChange(
                                  index,
                                  "evidenceReference",
                                  e.target.value,
                                )
                              }
                              placeholder="Link ou nome do arquivo"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Descrição curta *</Label>
                          <Textarea
                            value={opportunity.description}
                            onChange={(e) =>
                              handleOpportunityChange(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Descreva a hipótese e impacto esperado"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {project ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
