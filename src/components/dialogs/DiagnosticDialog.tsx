import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChevronDown, Calendar, Loader2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Diagnostic } from "@/types";
import { formatDatePtBR } from "@/lib/dates";
import { getDefaultDiagnosticName } from "@/lib/diagnostics";

interface DiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostic?: Diagnostic | null;
  defaultTemplateId?: string;
  onSuccess?: (diagnostic: { id: string; name: string; templateName?: string }) => void;
}

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

function SearchableSelect({
  placeholder,
  value,
  onSelect,
  options,
  disabled,
}: {
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}) {
  const selectedLabel = options.find((item) => item.value === value)?.label;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-between", !value && "text-muted-foreground")}
          disabled={disabled}
        >
          {selectedLabel || placeholder}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={() => onSelect(option.value)}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const toInputDateValue = (value?: string) => {
  if (!value) return "";
  const normalized = value.includes("/") ? value.split("/").reverse().join("-") : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export function DiagnosticDialog({ open, onOpenChange, diagnostic, defaultTemplateId, onSuccess }: DiagnosticDialogProps) {
  const navigate = useNavigate();
  const { projects, clients, templates, applyDiagnostic, updateDiagnostic, addProjectAuditLog, duplicateDiagnostic } = useData();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [duplicateProjectId, setDuplicateProjectId] = useState("");

  const [formData, setFormData] = useState({
    projectId: "",
    projectName: "",
    clientId: "",
    clientName: "",
    templateId: "",
    templateName: "",
    responsibleName: "",
    responsibleId: "",
    name: "",
    dueDate: "",
    autoGenerateOpportunities: true,
    status: "draft" as Diagnostic["status"],
  });

  const projectOptions = useMemo<SelectOption[]>(
    () =>
      projects.map((project) => ({
        value: project.id,
        label: project.name,
        description: clients.find((c) => c.id === project.clientId)?.name,
      })),
    [clients, projects]
  );

  const templateOptions = useMemo<SelectOption[]>(
    () =>
      templates
        .filter((template) => template.status !== "archived" || template.id === formData.templateId)
        .map((template) => ({
          value: template.id,
          label: template.name,
          description: template.tags?.join(", ") || undefined,
        })),
    [formData.templateId, templates]
  );

  useEffect(() => {
    if (diagnostic) {
      setFormData({
        projectId: diagnostic.projectId,
        projectName: diagnostic.projectName,
        clientId: diagnostic.clientId,
        clientName: diagnostic.clientName,
        templateId: diagnostic.templateId,
        templateName: diagnostic.templateName,
        responsibleName: diagnostic.responsibleName || user?.user_metadata?.full_name || "Equipe JoIA",
        responsibleId: diagnostic.responsibleId || user?.id || "",
        name: diagnostic.name,
        dueDate: diagnostic.dueDate || "",
        autoGenerateOpportunities: diagnostic.autoGenerateOpportunities ?? true,
        status: diagnostic.status,
      });
      setNameTouched(true);
    } else {
      const defaultResponsible = user?.user_metadata?.full_name || "Você";
      setFormData((prev) => ({
        ...prev,
        projectId: "",
        projectName: "",
        clientId: "",
        clientName: "",
        templateId: defaultTemplateId || "",
        templateName: templates.find((t) => t.id === defaultTemplateId)?.name || "",
        responsibleName: defaultResponsible,
        responsibleId: user?.id || "",
        name: "",
        dueDate: "",
        autoGenerateOpportunities: true,
        status: "draft",
      }));
      setNameTouched(false);
    }
    setDuplicateProjectId("");
  }, [diagnostic, defaultTemplateId, templates, user]);

  useEffect(() => {
    if (!diagnostic && formData.templateId && formData.projectId && !nameTouched) {
      const templateName = templates.find((template) => template.id === formData.templateId)?.name || "Template";
      const projectName = projects.find((project) => project.id === formData.projectId)?.name || "Projeto";
      setFormData((prev) => ({ ...prev, name: getDefaultDiagnosticName(templateName, projectName) }));
    }
  }, [diagnostic, formData.projectId, formData.templateId, nameTouched, projects, templates]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const client = clients.find((c) => c.id === project?.clientId);
    setFormData((prev) => ({
      ...prev,
      projectId,
      projectName: project?.name || "",
      clientId: project?.clientId || "",
      clientName: client?.name || "",
    }));
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setFormData((prev) => ({
      ...prev,
      templateId,
      templateName: template?.name || "",
    }));
  };

  const handleCreate = async (navigateAfterCreate: boolean) => {
    if (!formData.projectId) {
      toast.error("Selecione um projeto");
      return;
    }
    if (!formData.templateId) {
      toast.error("Selecione um template");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        projectId: formData.projectId,
        projectName: formData.projectName,
        clientId: formData.clientId,
        clientName: formData.clientName,
        templateId: formData.templateId,
        templateName: formData.templateName,
        responsibleName: formData.responsibleName,
        responsibleId: formData.responsibleId,
        dueDate: formData.dueDate,
        autoGenerateOpportunities: formData.autoGenerateOpportunities,
        name: formData.name || getDefaultDiagnosticName(formData.templateName, formData.projectName),
      };

      const created = await applyDiagnostic(payload);
      toast.success("Diagnóstico criado com sucesso");
      
      // Call onSuccess callback
      onSuccess?.({
        id: created.id,
        name: payload.name,
        templateName: formData.templateName,
      });
      
      onOpenChange(false);
      if (navigateAfterCreate) {
        navigate(`/diagnosticos/${created.id}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível criar o diagnóstico");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!diagnostic) return;
    setIsSubmitting(true);
    try {
      updateDiagnostic(diagnostic.id, {
        status: formData.status,
        responsibleName: formData.responsibleName,
        dueDate: formData.dueDate,
        autoGenerateOpportunities: formData.autoGenerateOpportunities,
      });
      addProjectAuditLog({
        projectId: diagnostic.projectId,
        message: `Diagnóstico atualizado (status: ${formData.status}, responsável: ${formData.responsibleName})`,
      });
      toast.success("Diagnóstico atualizado");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível atualizar o diagnóstico");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!diagnostic || !duplicateProjectId) return;
    const targetProject = projects.find((project) => project.id === duplicateProjectId);
    if (!targetProject) return;
    const client = clients.find((c) => c.id === targetProject.clientId);

    setIsSubmitting(true);
    try {
      const duplicated = await duplicateDiagnostic(diagnostic, {
        projectId: targetProject.id,
        projectName: targetProject.name,
        clientId: targetProject.clientId,
        clientName: client?.name || "",
      });
      toast.success("Diagnóstico duplicado para o projeto selecionado");
      navigate(`/diagnosticos/${duplicated.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível duplicar o diagnóstico");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditingWithResponses = diagnostic?.hasResponses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{diagnostic ? "Editar diagnóstico" : "Aplicar diagnóstico"}</DialogTitle>
          {isEditingWithResponses && (
            <p className="text-sm text-muted-foreground">
              Este diagnóstico já possui respostas registradas. O projeto e o template não podem ser alterados; ajuste apenas
              status ou responsável.
            </p>
          )}
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Projeto *</Label>
            <SearchableSelect
              placeholder="Selecione o projeto"
              value={formData.projectId}
              onSelect={handleProjectChange}
              options={projectOptions}
              disabled={isEditingWithResponses}
            />
          </div>
          <div className="space-y-2">
            <Label>Template *</Label>
            <SearchableSelect
              placeholder="Selecione o template"
              value={formData.templateId}
              onSelect={handleTemplateChange}
              options={templateOptions}
              disabled={isEditingWithResponses}
            />
          </div>
          <div className="space-y-2">
            <Label>Nome do diagnóstico</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                setNameTouched(true);
              }}
              placeholder="Template • Projeto • MM/AAAA"
            />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input
              value={formData.responsibleName}
              onChange={(e) => setFormData((prev) => ({ ...prev, responsibleName: e.target.value }))}
              placeholder="Quem vai conduzir o diagnóstico"
            />
          </div>
          <div className="space-y-2">
            <Label>Data alvo</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={toInputDateValue(formData.dueDate)}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: formatDatePtBR(e.target.value) }))}
              />
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gerar oportunidades automaticamente ao concluir</Label>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm text-muted-foreground">Cria oportunidades assim que o diagnóstico for finalizado</span>
              <Switch
                checked={formData.autoGenerateOpportunities}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autoGenerateOpportunities: checked }))}
              />
            </div>
          </div>
          {diagnostic && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Diagnostic["status"]) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {diagnostic && (
            <div className="space-y-2">
              <Label>Duplicar para outro projeto</Label>
              <div className="flex items-center gap-2">
                <SearchableSelect
                  placeholder="Selecionar projeto"
                  value={duplicateProjectId}
                  onSelect={setDuplicateProjectId}
                  options={projectOptions}
                  disabled={isSubmitting}
                />
                <Button variant="outline" onClick={handleDuplicate} disabled={!duplicateProjectId || isSubmitting}>
                  <Copy className="mr-2 h-4 w-4" />Duplicar
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Nome sugerido: {formData.templateName && formData.projectName ? getDefaultDiagnosticName(formData.templateName, formData.projectName) : "Template • Projeto • MM/AAAA"}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            {diagnostic ? (
              <Button onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar alterações
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCreate(false)}
                  disabled={isSubmitting}
                  className="order-2 sm:order-1"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Criar e fechar
                </Button>
                <Button
                  type="button"
                  className="order-1 sm:order-2"
                  onClick={() => handleCreate(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Criar e iniciar
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
