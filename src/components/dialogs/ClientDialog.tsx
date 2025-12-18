import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/contexts/DataContext";
import { Client } from "@/types";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const { addClient, updateClient } = useData();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    segment: "",
    city: "",
    address: "",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    status: "ativo" as "ativo" | "inativo",
    risk: "low" as "low" | "medium" | "high",
    preferredMeetingDay: "",
    followUpFrequency: "semanal" as "semanal" | "quinzenal" | "mensal",
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        tradeName: client.tradeName || "",
        cnpj: client.cnpj || "",
        segment: client.segment,
        city: client.city,
        address: client.address || "",
        primaryContactName: client.primaryContactName || "",
        primaryContactEmail: client.primaryContactEmail || "",
        primaryContactPhone: client.primaryContactPhone || "",
        status: client.status,
        risk: client.risk,
        preferredMeetingDay: client.preferredMeetingDay || "",
        followUpFrequency: client.followUpFrequency || "semanal",
      });
    } else {
      setFormData({
        name: "",
        tradeName: "",
        cnpj: "",
        segment: "",
        city: "",
        address: "",
        primaryContactName: "",
        primaryContactEmail: "",
        primaryContactPhone: "",
        status: "ativo",
        risk: "low",
        preferredMeetingDay: "",
        followUpFrequency: "semanal",
      });
    }
    setErrors({});
    setIsSubmitting(false);
  }, [client, open]);

  const requiredFields = useMemo(
    () => ["name", "segment", "city", "primaryContactName", "primaryContactEmail"],
    []
  );

  const validateForm = () => {
    const validationErrors: Record<string, string> = {};

    if (!formData.name.trim()) validationErrors.name = "Razão social é obrigatória.";
    if (!formData.segment) validationErrors.segment = "Selecione o segmento.";
    if (!formData.city.trim()) validationErrors.city = "Cidade é obrigatória.";
    if (!formData.primaryContactName.trim()) validationErrors.primaryContactName = "Informe o nome do contato principal.";
    if (!formData.primaryContactEmail.trim()) {
      validationErrors.primaryContactEmail = "E-mail do contato é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContactEmail)) {
      validationErrors.primaryContactEmail = "E-mail inválido.";
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    const isValid = validateForm();
    if (!isValid) {
      setIsSubmitting(false);
      return;
    }

    const clientData = {
      ...formData,
      projects: client?.projects || 0,
      nps: client?.nps || 0,
      lastContact: new Date().toLocaleDateString('pt-BR'),
    };

    if (client) {
      updateClient(client.id, clientData);
      toast.success("Cliente atualizado com sucesso");
      onOpenChange(false);
      setIsSubmitting(false);
    } else {
      const newClient = addClient(clientData);
      toast.success("Cliente criado. Próximo passo: criar um projeto.");
      onOpenChange(false);
      navigate(`/clientes?cliente=${newClient.id}`);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onOpenChange(false);
          }
        }}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle>{client ? "Editar cliente" : "Criar cliente"}</DialogTitle>
          <DialogDescription>Organize os dados essenciais antes de avançar para o primeiro projeto.</DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Identificação</p>
              <p className="text-sm text-muted-foreground">Defina razão social, segmento e documentos fiscais.</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Nome da empresa"
                  className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                  required={requiredFields.includes("name")}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradeName">Nome Fantasia</Label>
                <Input
                  id="tradeName"
                  value={formData.tradeName}
                  onChange={(e) => handleInputChange("tradeName", e.target.value)}
                  placeholder="Nome fantasia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange("cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment" className="flex items-center gap-1">
                  Segmento <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.segment}
                  onValueChange={(value) => handleInputChange("segment", value)}
                >
                  <SelectTrigger className={cn(errors.segment && "border-destructive focus:ring-destructive")}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indústria">Indústria</SelectItem>
                    <SelectItem value="Manufatura">Manufatura</SelectItem>
                    <SelectItem value="Varejo">Varejo</SelectItem>
                    <SelectItem value="Serviços">Serviços</SelectItem>
                    <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.segment && <p className="text-sm text-destructive">{errors.segment}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Contato principal</p>
              <p className="text-sm text-muted-foreground">Quem será acionado nas comunicações iniciais.</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryContactName" className="flex items-center gap-1">
                  Nome do contato <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="primaryContactName"
                  value={formData.primaryContactName}
                  onChange={(e) => handleInputChange("primaryContactName", e.target.value)}
                  placeholder="Responsável direto"
                  className={cn(errors.primaryContactName && "border-destructive focus-visible:ring-destructive")}
                  required={requiredFields.includes("primaryContactName")}
                />
                {errors.primaryContactName && <p className="text-sm text-destructive">{errors.primaryContactName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryContactEmail" className="flex items-center gap-1">
                  E-mail do contato <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="primaryContactEmail"
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(e) => handleInputChange("primaryContactEmail", e.target.value)}
                  placeholder="contato@empresa.com"
                  className={cn(errors.primaryContactEmail && "border-destructive focus-visible:ring-destructive")}
                  required={requiredFields.includes("primaryContactEmail")}
                />
                {errors.primaryContactEmail && <p className="text-sm text-destructive">{errors.primaryContactEmail}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="primaryContactPhone">Telefone/WhatsApp</Label>
                <Input
                  id="primaryContactPhone"
                  value={formData.primaryContactPhone}
                  onChange={(e) => handleInputChange("primaryContactPhone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Endereço inteligente</p>
              <p className="text-sm text-muted-foreground">Localização base para visitas e propostas.</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-1">
                  Cidade <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Cidade"
                  className={cn(errors.city && "border-destructive focus-visible:ring-destructive")}
                  required={requiredFields.includes("city")}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Rua, número, complemento"
                />
              </div>
            </div>
          </section>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="rounded-lg border">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left font-medium transition hover:bg-muted"
              >
                <div className="flex flex-col">
                  <span>Detalhes avançados</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Status, risco e cadência de acompanhamento.
                  </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator />
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "ativo" | "inativo") => handleInputChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk">Risco</Label>
                  <Select
                    value={formData.risk}
                    onValueChange={(value: "low" | "medium" | "high") => handleInputChange("risk", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixo</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredMeetingDay">Dia de reunião</Label>
                  <Select
                    value={formData.preferredMeetingDay}
                    onValueChange={(value) => handleInputChange("preferredMeetingDay", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Segunda">Segunda</SelectItem>
                      <SelectItem value="Terça">Terça</SelectItem>
                      <SelectItem value="Quarta">Quarta</SelectItem>
                      <SelectItem value="Quinta">Quinta</SelectItem>
                      <SelectItem value="Sexta">Sexta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpFrequency">Frequência de acompanhamento</Label>
                  <Select
                    value={formData.followUpFrequency}
                    onValueChange={(value: "semanal" | "quinzenal" | "mensal") =>
                      handleInputChange("followUpFrequency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Criar cliente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
