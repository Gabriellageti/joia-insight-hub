import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Client } from "@/types";
import { toast } from "sonner";

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
const isValidEmail = (value: string) => /^(?!.*\.\.)([\w+-]+\.)*[\w+-]+@([\w-]+\.)+[A-Za-z]{2,}$/.test(value.trim());

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
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    segment: "",
    city: "",
    address: "",
    whatsapp: "",
    email: "",
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
        whatsapp: client.whatsapp || "",
        email: client.email || "",
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
        whatsapp: "",
        email: "",
        status: "ativo",
        risk: "low",
        preferredMeetingDay: "",
        followUpFrequency: "semanal",
      });
    }
  }, [client, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.cnpj || !isValidCnpj(formData.cnpj)) {
      toast.error("Informe um CNPJ válido");
      return;
    }

    if (formData.whatsapp && !isValidWhatsapp(formData.whatsapp)) {
      toast.error("Informe um WhatsApp válido");
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      toast.error("Informe um e-mail válido");
      return;
    }

    const normalizedCnpj = sanitizeNumbers(formData.cnpj);
    const duplicatedClient = clients.find((existing) => existing.id !== client?.id && sanitizeNumbers(existing.cnpj || "") === normalizedCnpj);

    if (!client && duplicatedClient) {
      toast.error("Já existe um cliente com este CNPJ. Abrir cadastro existente.", {
        action: {
          label: "Abrir cliente",
          onClick: () => {
            onOpenExistingClient?.(duplicatedClient);
          },
        },
      });
      return;
    }

    const clientData = {
      ...formData,
      cnpj: formatCnpj(formData.cnpj),
      whatsapp: formData.whatsapp ? formatWhatsapp(formData.whatsapp) : "",
      projects: client?.projects || 0,
      nps: client?.nps || 0,
      lastContact: new Date().toLocaleDateString('pt-BR'),
    };

    if (client) {
      updateClient(client.id, clientData);
      toast.success("Cliente atualizado com sucesso");
    } else {
      addClient(clientData);
      toast.success("Cliente criado com sucesso");
    }
    onOpenChange(false);
  };

  const handleCnpjLookup = async () => {
    const normalizedCnpj = sanitizeNumbers(formData.cnpj);

    if (!isValidCnpj(formData.cnpj)) {
      toast.error("Informe um CNPJ válido para buscar");
      return;
    }

    setIsFetchingCnpj(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${normalizedCnpj}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar CNPJ");
      }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Razão Social *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradeName">Nome Fantasia</Label>
              <Input
                id="tradeName"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                placeholder="Nome fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <div className="flex gap-2">
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                />
                <Button type="button" variant="outline" onClick={handleCnpjLookup} disabled={isFetchingCnpj}>
                  {isFetchingCnpj ? "Buscando..." : "Buscar dados"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segmento</Label>
              <Select value={formData.segment} onValueChange={(value) => setFormData({ ...formData, segment: value })}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsapp(e.target.value) })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: "ativo" | "inativo") => setFormData({ ...formData, status: value })}>
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
              <Select value={formData.risk} onValueChange={(value: "low" | "medium" | "high") => setFormData({ ...formData, risk: value })}>
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
              <Label htmlFor="preferredMeetingDay">Dia de Reunião</Label>
              <Select value={formData.preferredMeetingDay} onValueChange={(value) => setFormData({ ...formData, preferredMeetingDay: value })}>
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
              <Label htmlFor="followUpFrequency">Frequência de Acompanhamento</Label>
              <Select value={formData.followUpFrequency} onValueChange={(value: "semanal" | "quinzenal" | "mensal") => setFormData({ ...formData, followUpFrequency: value })}>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {client ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
