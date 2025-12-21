import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Info, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/contexts/DataContext";
import { Client } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const emptyAutoFilledFields = {
  logradouro: false,
  bairro: false,
  cidade: false,
  uf: false,
  complemento: false,
};

type NormalizedAddress = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
};

type ViaCepResponse = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
  erro?: boolean;
};

type BrasilApiCepResponse = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  complement?: string;
};

type CepProvider = {
  name: string;
  url: string;
  normalize: (data: ViaCepResponse | BrasilApiCepResponse) => NormalizedAddress;
  hasError: (data: ViaCepResponse | BrasilApiCepResponse) => boolean;
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
  if (normalized.includes("varej") || normalized.includes("comércio") || normalized.includes("comercio"))
    return "Varejo";
  if (normalized.includes("servi")) return "Serviços";
  if (normalized.includes("tec")) return "Tecnologia";
  return "Outro";
};

export function ClientDialog({
  open,
  onOpenChange,
  client,
  onOpenExistingClient,
}: ClientDialogProps) {
  const { addClient, updateClient, clients } = useData();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isAddressLocked, setIsAddressLocked] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState({ ...emptyAutoFilledFields });
  const [shouldFocusNumber, setShouldFocusNumber] = useState(false);
  const [highlightNumber, setHighlightNumber] = useState(false);

  const autoFilledFieldsRef = useRef({ ...emptyAutoFilledFields });
  const numeroInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    segmentoTagsText: "",
    status: "ativo" as "ativo" | "inativo",
    risk: "low" as "low" | "medium" | "high",
    contatoPrincipal: {
      nome: "",
      whatsapp: "",
      email: "",
    },
    endereco: emptyAddress as Address,
    observacoesInternas: "",
    preferenciasRelacionamento: {
      diaReuniao: "",
      frequencia: "semanal" as "semanal" | "quinzenal" | "mensal",
    },
  });

  const setFieldError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearAutoFilledValues = useCallback(() => {
    const fields = autoFilledFieldsRef.current;
    if (!Object.values(fields).some(Boolean)) return;

    setFormData((prev) => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        logradouro: fields.logradouro ? "" : prev.endereco.logradouro,
        complemento: fields.complemento ? "" : prev.endereco.complemento,
        bairro: fields.bairro ? "" : prev.endereco.bairro,
        cidade: fields.cidade ? "" : prev.endereco.cidade,
        uf: fields.uf ? "" : prev.endereco.uf,
      },
    }));
    setAutoFilledFields({ ...emptyAutoFilledFields });
  }, []);

  useEffect(() => {
    autoFilledFieldsRef.current = autoFilledFields;
  }, [autoFilledFields]);

  const validateForm = () => {
    const validationErrors: Record<string, string> = {};

    if (!formData.razaoSocial.trim()) validationErrors.razaoSocial = "Razão social é obrigatória.";

    const email = formData.contatoPrincipal.email.trim();
    if (email && !isValidEmail(email)) validationErrors.contatoPrincipalEmail = "E-mail inválido.";

    const whatsapp = formData.contatoPrincipal.whatsapp.trim();
    if (whatsapp && !isValidWhatsapp(whatsapp)) validationErrors.contatoPrincipalWhatsapp = "WhatsApp inválido.";

    const cnpj = formData.cnpj.trim();
    if (cnpj && !isValidCnpj(cnpj)) validationErrors.cnpj = "CNPJ inválido.";

    const cep = sanitizeNumbers(formData.endereco.cep);
    if (cep.length === 8 && !formData.endereco.numero.trim()) {
      validationErrors.numero = "Informe o número do endereço para completar o CEP.";
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  useEffect(() => {
    if (client) {
      const segmentoTagsText =
        (client as any).segmentoTags?.length ? (client as any).segmentoTags.join(", ") : "";

      const enderecoFromClient = (client as any).endereco || {};
      const contatoFromClient = (client as any).contatoPrincipal || {};

      setFormData({
        razaoSocial: (client as any).razaoSocial || (client as any).name || "",
        nomeFantasia: (client as any).nomeFantasia || (client as any).tradeName || "",
        cnpj: (client as any).cnpj ? formatCnpj((client as any).cnpj) : "",
        segmentoTagsText,
        status: (client as any).status || "ativo",
        risk: (client as any).risk || "low",
        contatoPrincipal: {
          nome: contatoFromClient.nome || (client as any).primaryContactName || "",
          whatsapp: contatoFromClient.whatsapp
            ? formatWhatsapp(contatoFromClient.whatsapp)
            : (client as any).primaryContactPhone
              ? formatWhatsapp((client as any).primaryContactPhone)
              : "",
          email: contatoFromClient.email || (client as any).primaryContactEmail || "",
        },
        endereco: {
          ...emptyAddress,
          ...enderecoFromClient,
        },
        observacoesInternas: (client as any).observacoesInternas || "",
        preferenciasRelacionamento: {
          diaReuniao:
            (client as any).preferenciasRelacionamento?.diaReuniao ||
            (client as any).preferredMeetingDay ||
            "",
          frequencia:
            (client as any).preferenciasRelacionamento?.frequencia ||
            (client as any).followUpFrequency ||
            "semanal",
        },
      });

      setIsAddressLocked(false);
      setIsFetchingCep(false);
    } else {
      setFormData({
        razaoSocial: "",
        nomeFantasia: "",
        cnpj: "",
        segmentoTagsText: "",
        status: "ativo",
        risk: "low",
        contatoPrincipal: { nome: "", whatsapp: "", email: "" },
        endereco: emptyAddress,
        observacoesInternas: "",
        preferenciasRelacionamento: { diaReuniao: "", frequencia: "semanal" },
      });

      setIsAddressLocked(false);
      setIsFetchingCep(false);
    }

    setAutoFilledFields({ ...emptyAutoFilledFields });
    setHighlightNumber(false);
    setShouldFocusNumber(false);
    setErrors({});
    setIsSubmitting(false);
  }, [client, open]);

  useEffect(() => {
    const cep = (formData.endereco.cep || "").replace(/\D/g, "");
    if (!cep || cep.length !== 8) {
      setIsAddressLocked(false);
      setIsFetchingCep(false);
      return;
    }

    setIsFetchingCep(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      const fetchCepFromProviders = async () => {
        const providers: CepProvider[] = [
          {
            name: "ViaCEP",
            url: `https://viacep.com.br/ws/${cep}/json/`,
            normalize: (data: ViaCepResponse) => ({
              logradouro: data.logradouro || "",
              bairro: data.bairro || "",
              cidade: data.localidade || "",
              uf: data.uf || "",
              complemento: data.complemento || "",
            }),
            hasError: (data: ViaCepResponse) => Boolean(data?.erro),
          },
          {
            name: "BrasilAPI",
            url: `https://brasilapi.com.br/api/cep/v1/${cep}`,
            normalize: (data: BrasilApiCepResponse) => ({
              logradouro: data.street || "",
              bairro: data.neighborhood || "",
              cidade: data.city || "",
              uf: data.state || "",
              complemento: data.complement || "",
            }),
            hasError: () => false,
          },
        ];

        let lastError: Error | null = null;

        for (const provider of providers) {
          try {
            const response = await fetch(provider.url, { signal: controller.signal });
            if (!response.ok) {
              throw new Error(`${provider.name}: HTTP ${response.status}`);
            }

            const data = (await response.json()) as ViaCepResponse | BrasilApiCepResponse;
            if (provider.hasError(data)) {
              throw new Error(`${provider.name}: CEP não encontrado`);
            }

            const normalized = provider.normalize(data);
            const nextAutoFilled = {
              logradouro: Boolean(normalized.logradouro),
              bairro: Boolean(normalized.bairro),
              cidade: Boolean(normalized.cidade),
              uf: Boolean(normalized.uf),
              complemento: Boolean(normalized.complemento),
            };

            setFormData((prev) => ({
              ...prev,
              endereco: {
                ...prev.endereco,
                cep,
                ...normalized,
              },
            }));

            setAutoFilledFields(nextAutoFilled);
            setIsAddressLocked(true);
            setShouldFocusNumber(true);
            clearFieldError("cep");
            return;
          } catch (error) {
            if (controller.signal.aborted) return;

            lastError = error instanceof Error ? error : new Error(String(error));
            console.error("Erro ao buscar CEP:", lastError.message);
          }
        }

        if (lastError) throw lastError;
      };

      try {
        await fetchCepFromProviders();
      } catch (error) {
        if (controller.signal.aborted) return;

        setIsAddressLocked(false);
        clearAutoFilledValues();
        const message =
          error instanceof Error && error.message ? error.message : "Não foi possível buscar o CEP";
        setFieldError("cep", `${message}. Preencha o endereço manualmente.`);
        toast.error("Não foi possível buscar o CEP. Preencha o endereço manualmente.");
      } finally {
        setIsFetchingCep(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clearAutoFilledValues, formData.endereco.cep]);

  useEffect(() => {
    const cep = sanitizeNumbers(formData.endereco.cep);
    if (cep.length === 8 || !Object.values(autoFilledFields).some(Boolean)) return;

    clearAutoFilledValues();
  }, [autoFilledFields, clearAutoFilledValues, formData.endereco.cep]);

  useEffect(() => {
    if (!shouldFocusNumber) return;

    numeroInputRef.current?.focus();
    setHighlightNumber(true);
    setShouldFocusNumber(false);

    const timer = setTimeout(() => setHighlightNumber(false), 1800);
    return () => clearTimeout(timer);
  }, [shouldFocusNumber]);

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
      const inferred = mapSegmentFromCnae(data.cnae_fiscal_descricao);

      setFormData((prev) => {
        const existingTags = prev.segmentoTagsText.trim();
        const nextTags = existingTags ? existingTags : inferred ? inferred : "";
        return {
          ...prev,
          razaoSocial: prev.razaoSocial || data.razao_social || prev.razaoSocial,
          segmentoTagsText: nextTags,
        };
      });

      toast.success("Dados do CNPJ carregados");
    } catch {
      toast.warning("Não foi possível buscar dados do CNPJ");
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    const ok = validateForm();
    if (!ok) {
      setIsSubmitting(false);
      return;
    }

    const segmentoTags = formData.segmentoTagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const normalizedCnpj = sanitizeNumbers(formData.cnpj);
    const duplicatedClient =
      normalizedCnpj && Array.isArray(clients)
        ? clients.find(
            (existing: any) => existing.id !== (client as any)?.id && sanitizeNumbers(existing.cnpj || "") === normalizedCnpj
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

    const clientData: any = {
      razaoSocial: formData.razaoSocial.trim(),
      nomeFantasia: formData.nomeFantasia.trim(),
      cnpj: formData.cnpj ? formatCnpj(formData.cnpj) : "",
      segmentoTags,
      status: formData.status,
      risk: formData.risk,
      contatoPrincipal: {
        nome: formData.contatoPrincipal.nome.trim(),
        whatsapp: formData.contatoPrincipal.whatsapp
          ? formatWhatsapp(formData.contatoPrincipal.whatsapp)
          : "",
        email: formData.contatoPrincipal.email.trim(),
      },
      endereco: {
        cep: formData.endereco.cep.trim(),
        logradouro: formData.endereco.logradouro.trim(),
        numero: formData.endereco.numero.trim(),
        complemento: formData.endereco.complemento.trim(),
        bairro: formData.endereco.bairro.trim(),
        cidade: formData.endereco.cidade.trim(),
        uf: formData.endereco.uf.trim(),
      },
      observacoesInternas: formData.observacoesInternas.trim(),
      preferenciasRelacionamento: {
        diaReuniao: formData.preferenciasRelacionamento.diaReuniao,
        frequencia: formData.preferenciasRelacionamento.frequencia,
      },
      projects: (client as any)?.projects || 0,
      nps: (client as any)?.nps || 0,
      lastContact: (client as any)?.lastContact || new Date().toLocaleDateString("pt-BR"),
    };

    try {
      if (client) {
        await updateClient((client as any).id, clientData);
        toast.success("Cliente atualizado com sucesso");
        onOpenChange(false);
      } else {
        const createdClient = await addClient(clientData);
        toast.success("Cliente criado. Próximo passo: criar um projeto.");
        onOpenChange(false);
        navigate(`/clientes/${(createdClient as any).id}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o cliente. Verifique a conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-h-[90vh] overflow-y-auto sm:max-w-xl lg:max-w-2xl"
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
              <p className="text-sm text-muted-foreground">Razão social, CNPJ e tags de segmento.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="razaoSocial" className="flex items-center gap-1">
                  Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, razaoSocial: e.target.value }));
                    if (errors.razaoSocial) clearFieldError("razaoSocial");
                  }}
                  placeholder="Razão social"
                  className={cn(errors.razaoSocial && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.razaoSocial && <p className="text-sm text-destructive">{errors.razaoSocial}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input
                  id="nomeFantasia"
                  value={formData.nomeFantasia}
                  onChange={(e) => setFormData((p) => ({ ...p, nomeFantasia: e.target.value }))}
                  placeholder="Nome fantasia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, cnpj: formatCnpj(e.target.value) }));
                      if (errors.cnpj) clearFieldError("cnpj");
                    }}
                    placeholder="00.000.000/0000-00"
                    className={cn(errors.cnpj && "border-destructive focus-visible:ring-destructive")}
                  />
                  <Button type="button" variant="outline" onClick={handleCnpjLookup} disabled={isFetchingCnpj}>
                    {isFetchingCnpj ? "Buscando..." : "Buscar dados"}
                  </Button>
                </div>
                {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="segmentoTagsText">Segmentos (tags)</Label>
                <Input
                  id="segmentoTagsText"
                  value={formData.segmentoTagsText}
                  onChange={(e) => setFormData((p) => ({ ...p, segmentoTagsText: e.target.value }))}
                  placeholder="Ex: Varejo, Distribuição, Serviços"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Contato principal</p>
              <p className="text-sm text-muted-foreground">Para comunicação inicial e alinhamentos.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="contatoPrincipalNome">Nome</Label>
                <Input
                  id="contatoPrincipalNome"
                  value={formData.contatoPrincipal.nome}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, contatoPrincipal: { ...p.contatoPrincipal, nome: e.target.value } }))
                  }
                  placeholder="Nome do contato"
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="contatoPrincipalWhatsapp">WhatsApp</Label>
                <Input
                  id="contatoPrincipalWhatsapp"
                  value={formData.contatoPrincipal.whatsapp}
                  onChange={(e) => {
                    setFormData((p) => ({
                      ...p,
                      contatoPrincipal: { ...p.contatoPrincipal, whatsapp: formatWhatsapp(e.target.value) },
                    }));
                    if (errors.contatoPrincipalWhatsapp) clearFieldError("contatoPrincipalWhatsapp");
                  }}
                  placeholder="(00) 00000-0000"
                  className={cn(
                    errors.contatoPrincipalWhatsapp && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {errors.contatoPrincipalWhatsapp && (
                  <p className="text-sm text-destructive">{errors.contatoPrincipalWhatsapp}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="contatoPrincipalEmail">E-mail</Label>
                <Input
                  id="contatoPrincipalEmail"
                  value={formData.contatoPrincipal.email}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, contatoPrincipal: { ...p.contatoPrincipal, email: e.target.value } }));
                    if (errors.contatoPrincipalEmail) clearFieldError("contatoPrincipalEmail");
                  }}
                  placeholder="contato@empresa.com"
                  className={cn(errors.contatoPrincipalEmail && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.contatoPrincipalEmail && (
                  <p className="text-sm text-destructive">{errors.contatoPrincipalEmail}</p>
                )}
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
                    value={formData.endereco.cep}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                      setFormData((p) => ({ ...p, endereco: { ...p.endereco, cep: value } }));
                      if (!value) setIsAddressLocked(false);
                      if (errors.cep) clearFieldError("cep");
                    }}
                    placeholder="00000000"
                    maxLength={8}
                    aria-invalid={Boolean(errors.cep)}
                    className={cn(errors.cep && "border-destructive focus-visible:ring-destructive")}
                  />
                  {isFetchingCep && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                  {errors.cep && <p className="mt-1 text-sm text-destructive">{errors.cep}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="uf">UF</Label>
                  {autoFilledFields.uf && <Badge variant="secondary">Preenchido pelo CEP</Badge>}
                </div>
                <Input
                  id="uf"
                  value={formData.endereco.uf}
                  readOnly={isAddressLocked}
                  onChange={(e) => {
                    setFormData((p) => ({
                      ...p,
                      endereco: { ...p.endereco, uf: e.target.value.toUpperCase().slice(0, 2) },
                    }));
                    if (autoFilledFields.uf) setAutoFilledFields((prev) => ({ ...prev, uf: false }));
                  }}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  {autoFilledFields.logradouro && <Badge variant="secondary">Preenchido pelo CEP</Badge>}
                </div>
                <Input
                  id="logradouro"
                  value={formData.endereco.logradouro}
                  readOnly={isAddressLocked}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, endereco: { ...p.endereco, logradouro: e.target.value } }));
                    if (autoFilledFields.logradouro)
                      setAutoFilledFields((prev) => ({ ...prev, logradouro: false }));
                  }}
                  placeholder="Rua, avenida..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="numero" className="flex items-center gap-1">
                    Número{sanitizeNumbers(formData.endereco.cep).length === 8 && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  {isAddressLocked && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Informe o número manualmente: a API do CEP não retorna essa informação.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <Input
                  id="numero"
                  ref={numeroInputRef}
                  value={formData.endereco.numero}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, endereco: { ...p.endereco, numero: e.target.value } }));
                    if (errors.numero) clearFieldError("numero");
                  }}
                  placeholder="Número"
                  className={cn(
                    errors.numero && "border-destructive focus-visible:ring-destructive",
                    highlightNumber && "ring-2 ring-offset-2 ring-primary/60",
                  )}
                  aria-describedby={isAddressLocked ? "numero-hint" : undefined}
                />
                {isAddressLocked && (
                  <p id="numero-hint" className="text-xs text-muted-foreground">
                    Apenas número e complemento precisam ser informados manualmente.
                  </p>
                )}
                {errors.numero && <p className="text-sm text-destructive">{errors.numero}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  {autoFilledFields.complemento && <Badge variant="secondary">Preenchido pelo CEP</Badge>}
                </div>
                <Input
                  id="complemento"
                  value={formData.endereco.complemento}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, endereco: { ...p.endereco, complemento: e.target.value } }));
                    if (autoFilledFields.complemento)
                      setAutoFilledFields((prev) => ({ ...prev, complemento: false }));
                  }}
                  placeholder="Apto, bloco, etc."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  {autoFilledFields.bairro && <Badge variant="secondary">Preenchido pelo CEP</Badge>}
                </div>
                <Input
                  id="bairro"
                  value={formData.endereco.bairro}
                  readOnly={isAddressLocked}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, endereco: { ...p.endereco, bairro: e.target.value } }));
                    if (autoFilledFields.bairro) setAutoFilledFields((prev) => ({ ...prev, bairro: false }));
                  }}
                  placeholder="Bairro"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  {autoFilledFields.cidade && <Badge variant="secondary">Preenchido pelo CEP</Badge>}
                </div>
                <Input
                  id="cidade"
                  value={formData.endereco.cidade}
                  readOnly={isAddressLocked}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, endereco: { ...p.endereco, cidade: e.target.value } }));
                    if (autoFilledFields.cidade) setAutoFilledFields((prev) => ({ ...prev, cidade: false }));
                  }}
                  placeholder="Cidade"
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
                    Status, risco, preferências e notas internas.
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
                    onValueChange={(value: "ativo" | "inativo") => setFormData((p) => ({ ...p, status: value }))}
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
                    onValueChange={(value: "low" | "medium" | "high") => setFormData((p) => ({ ...p, risk: value }))}
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
                  <Label htmlFor="diaReuniao">Dia de Reunião</Label>
                  <Select
                    value={formData.preferenciasRelacionamento.diaReuniao}
                    onValueChange={(value) =>
                      setFormData((p) => ({
                        ...p,
                        preferenciasRelacionamento: { ...p.preferenciasRelacionamento, diaReuniao: value },
                      }))
                    }
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
                  <Label htmlFor="frequencia">Frequência de Acompanhamento</Label>
                  <Select
                    value={formData.preferenciasRelacionamento.frequencia}
                    onValueChange={(value: "semanal" | "quinzenal" | "mensal") =>
                      setFormData((p) => ({
                        ...p,
                        preferenciasRelacionamento: { ...p.preferenciasRelacionamento, frequencia: value },
                      }))
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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observacoesInternas">Observações Internas</Label>
                  <Textarea
                    id="observacoesInternas"
                    value={formData.observacoesInternas}
                    onChange={(e) => setFormData((p) => ({ ...p, observacoesInternas: e.target.value }))}
                    placeholder="Notas internas, contexto e direcionamentos"
                    rows={3}
                  />
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
