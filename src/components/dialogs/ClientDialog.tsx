import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/contexts/DataContext";
import { Client } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type Address = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

const emptyAddress: Address = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onOpenExistingClient?: (client: Client) => void;
}

const sanitizeNumbers = (value: string) => value.replace(/\D/g, "");

const formatCnpj = (value: string) => {
  const digits = sanitizeNumbers(value).slice(0, 14);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 8),
    digits.slice(8, 12),
    digits.slice(12, 14),
  ];

  return parts
    .map((part, index) => {
      if (!part) return "";
      if (index === 0) return part;
      if (index === 1) return `.${part}`;
      if (index === 2) return `.${part}`;
      if (index === 3) return `/${part}`;
      return `-${part}`;
    })
    .join("");
};

const formatWhatsapp = (value: string) => {
  const digits = sanitizeNumbers(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isValidCnpj = (value: string) => sanitizeNumbers(value).length === 14;
const isValidWhatsapp = (value: string) => sanitizeNumbers(value).length === 11;
const isValidEmail = (value: string) =>
  /^(?!.*\.\.)([\w+-]+\.)*[\w+-]+@([\w-]+\.)+[A-Za-z]{2,}$/.test(value.trim());

const mapSegmentFromCnae = (description?: string) => {
  if (!description) return "";
  const normalized = description.toLowerCase();
  if (normalized.includes("ind") || normalized.includes("fabr")) return "Indústria";
  if (normalized.includes("manuf")) return "Manufatura";
  if (normalized.includes("varej") || normalized.includes("comércio") || normalized.includes("comercio")) return "Varejo";
  if (normalized.includes("servi")) return "Serviços";
  if (normalized.includes("tec")) return "Tecnologia";
  return "Outro";
};

export function ClientDialog({ open, onOpenChange, client, onOpenExistingClient }: ClientDialogProps) {
  const { addClient, updateClient, clients } = useData();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isAddressLocked, setIsAddressLocked] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    segment: "",
    city: "",
    address: emptyAddress as Address,
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    status: "ativo" as "ativo" | "inativo",
    risk: "low" as "low" | "medium" | "high",
    preferredMeetingDay: "",
    followUpFrequency: "semanal" as "semanal" | "quinzenal" | "mensal",
  });

  const requiredFields = useMemo(
    () => ["name", "segment", "city", "primaryContactName", "primaryContactEmail"],
    []
  );

  const validateForm = () => {
    const validationErrors: Record<string, string> = {};

    const resolvedCity = (formData.address.cidade || formData.city || "").trim();

    if (!formData.name.trim()) validationErrors.name = "Razão social é obrigatória.";
    if (!formData.segment) validationErrors.segment = "Selecione o segmento.";
    if (!resolvedCity) validationErrors.city = "Cidade é obrigatória.";

    if (!formData.primaryContactName.trim())
      validationErrors.primaryContactName = "Informe o nome do contato principal.";

    if (!formData.primaryContactEmail.trim()) {
      validationErrors.primaryContactEmail = "E-mail do contato é obrigatório.";
    } else if (!isValidEmail(formData.primaryContactEmail)) {
      validationErrors.primaryContactEmail = "E-mail inválido.";
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as string];
        return updated;
      });
    }
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
      ...(field === "cidade" ? { city: value } : null),
    }));

    if (field === "cidade" && errors.city) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.city;
        return updated;
      });
    }
  };

  useEffect(() => {
    if (client) {
      const rawAddress = client.address as unknown;

      const normalizedAddress: Address =
        typeof rawAddress === "string"
          ? { ...emptyAddress, logradouro: rawAddress }
          : { ...emptyAddress, ...(rawAddress as Partial<Address>) };

      const resolvedCity = client.city || normalizedAddress.cidade || "";

      setFormData({
        name: client.name,
        tradeName: client.tradeName || "",
        cnpj: client.cnpj ? formatCnpj(client.cnpj) : "",
        segment: client.segment || "",
        city: resolvedCity,
        address: { ...normalizedAddress, cidade: resolvedCity },
        primaryContactName: (client as any).primaryContactName || "",
        primaryContactEmail: (client as any).primaryContactEmail || "",
        primaryContactPhone: (client as any).primaryContactPhone ? formatWhatsapp((client as any).primaryContactPhone) : "",
        status: client.status,
        risk: client.risk,
        preferredMeetingDay: client.preferredMeetingDay || "",
        followUpFrequency: client.followUpFrequency || "semanal",
      });

      setIsAddressLocked(false);
      setIsFetchingCep(false);
    } else {
      setFormData({
        name: "",
        tradeName: "",
        cnpj: "",
        segment: "",
        city: "",
        address: emptyAddress,
        primaryContactName: "",
        primaryContactEmail: "",
        primaryContactPhone: "",
        status: "ativo",
        risk: "low",
        preferredMeetingDay: "",
        followUpFrequency: "semanal",
      });

      setIsAddressLocked(false);
      setIsFetchingCep(false);
    }

    setErrors({});
    setIsSubmitting(false);
  }, [client, open]);

  useEffect(() => {
    const cep = (formData.address.cep || "").replace(/\D/g, "");
    if (!cep || cep.length !== 8) {
      setIsAddressLocked(false);
      setIsFetchingCep(false);
      return;
    }

    setIsFetchingCep(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
        if (!response.ok) throw new Error("Erro ao buscar CEP");

        const data = await response.json();
        if (data?.erro) throw new Error("CEP não encontrado");

        setFormData((prev) => ({
          ...prev,
          city: data.localidade || prev.city,
          address: {
            ...prev.address,
            cep,
            logradouro: data.logradouro || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            uf: data.uf || "",
          },
        }));

        setIsAddressLocked(true);
      } catch {
        setIsAddressLocked(false);
        toast.error("Não foi possível buscar o CEP. Preencha o endereço manualmente.");
      } finally {
        setIsFetchingCep(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.address.cep]);

  const handleCnpjLookup = async () => {
    const normalizedCnpj = sanitizeNumbers(formData.cnpj);

    if (!isValidCnpj(formData.cnpj)) {
      toast.error("Informe um CNPJ válido para buscar");
      return;
    }

    setIsFetchingCnpj(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${normalizedCnpj}`);
      if (!response.ok) throw new Error("Erro ao buscar CNPJ");

      const data = await response.json();

      setFormData((prev) => ({
        ...prev,
        name: prev.name || data.razao_social || prev.name,
        segment: prev.segment || mapSegmentFromCnae(data.cnae_fiscal_descricao) || prev.segment,
      }));

      toast.success("Dados do CNPJ carregados");
    } catch {
      toast.warning("Não foi possível buscar dados do CNPJ");
    } finally {
      setIsFetchingCnpj(false);
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

    if (formData.cnpj && !isValidCnpj(formData.cnpj)) {
      toast.error("Informe um CNPJ válido");
      setIsSubmitting(false);
      return;
    }

    if (formData.primaryContactPhone && !isValidWhatsapp(formData.primaryContactPhone)) {
      toast.error("Informe um WhatsApp válido");
      setIsSubmitting(false);
      return;
    }

    if (formData.primaryContactEmail && !isValidEmail(formData.primaryContactEmail)) {
      toast.error("Informe um e-mail válido");
      setIsSubmitting(false);
      return;
    }

    const normalizedCnpj = sanitizeNumbers(formData.cnpj);
    const duplicatedClient =
      normalizedCnpj && Array.isArray(clients)
        ? clients.find(
            (existing) =>
              existing.id !== client?.id && sanitizeNumbers(existing.cnpj || "") === normalizedCnpj
          )
        : undefined;

    if (!client && duplicatedClient) {
      toast.error("Já existe um cliente com este CNPJ. Abrir cadastro existente.", {
        action: {
          label: "Abrir cliente",
          onClick: () => onOpenExistingClient?.(duplicatedClient),
        },
      });
      setIsSubmitting(false);
      return;
    }

    const resolvedCity = formData.address.cidade || formData.city || "";

    const clientData = {
      ...formData,
      city: resolvedCity,
      address: formData.address,
      cnpj: formData.cnpj ? formatCnpj(formData.cnpj) : "",
      primaryContactPhone: formData.primaryContactPhone ? formatWhatsapp(formData.primaryContactPhone) : "",
      projects: client?.projects || 0,
      nps: client?.nps || 0,
      lastContact: new Date().toLocaleDateString("pt-BR"),
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
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange("cnpj", formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                  <Button type="button" variant="outline" onClick={handleCnpjLookup} disabled={isFetchingCnpj}>
                    {isFetchingCnpj ? "Buscando..." : "Buscar dados"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="segment" className="flex items-center gap-1">
                  Segmento <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.segment} onValueChange={(value) => handleInputChange("segment", value)}>
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
                  onChange={(e) => handleInputChange("primaryContactPhone", formatWhatsapp(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Endereço inteligente</p>
              <p className="text-sm text-muted-foreground">Preencha o CEP e deixe o resto se comportar.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    inputMode="numeric"
                    value={formData.address.cep}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                      handleAddressChange("cep", value);
                      if (!value) setIsAddressLocked(false);
                    }}
                    placeholder="00000000"
                    maxLength={8}
                  />
                  {isFetchingCep && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  value={formData.address.uf}
                  readOnly={isAddressLocked}
                  onChange={(e) => handleAddressChange("uf", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={formData.address.logradouro}
                  readOnly={isAddressLocked}
                  onChange={(e) => handleAddressChange("logradouro", e.target.value)}
                  placeholder="Rua, avenida..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.address.numero}
                  onChange={(e) => handleAddressChange("numero", e.target.value)}
                  placeholder="Número"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.address.complemento}
                  onChange={(e) => handleAddressChange("complemento", e.target.value)}
                  placeholder="Apto, bloco, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.address.bairro}
                  readOnly={isAddressLocked}
                  onChange={(e) => handleAddressChange("bairro", e.target.value)}
                  placeholder="Bairro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade" className="flex items-center gap-1">
                  Cidade <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cidade"
                  value={formData.address.cidade}
                  readOnly={isAddressLocked}
                  onChange={(e) => handleAddressChange("cidade", e.target.value)}
                  placeholder="Cidade"
                  className={cn(errors.city && "border-destructive focus-visible:ring-destructive")}
                  required={requiredFields.includes("city")}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
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
                  <Select value={formData.status} onValueChange={(value: "ativo" | "inativo") => handleInputChange("status", value)}>
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
                  <Select value={formData.risk} onValueChange={(value: "low" | "medium" | "high") => handleInputChange("risk", value)}>
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
                  <Select value={formData.preferredMeetingDay} onValueChange={(value) => handleInputChange("preferredMeetingDay", value)}>
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
                    onValueChange={(value: "semanal" | "quinzenal" | "mensal") => handleInputChange("followUpFrequency", value)}
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
              ) : client ? (
                "Salvar alterações"
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
