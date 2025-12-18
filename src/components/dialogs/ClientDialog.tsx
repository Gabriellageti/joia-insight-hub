import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Client } from "@/types";
import { toast } from "sonner";

const emptyAddress = {
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
}

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const { addClient, updateClient } = useData();
  const [formData, setFormData] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    segment: "",
    city: "",
    address: emptyAddress,
    status: "ativo" as "ativo" | "inativo",
    risk: "low" as "low" | "medium" | "high",
    preferredMeetingDay: "",
    followUpFrequency: "semanal" as "semanal" | "quinzenal" | "mensal",
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isAddressLocked, setIsAddressLocked] = useState(false);

  useEffect(() => {
    if (client) {
      const clientAddress = client.address || emptyAddress;
      setFormData({
        name: client.name,
        tradeName: client.tradeName || "",
        cnpj: client.cnpj || "",
        segment: client.segment,
        city: client.city || clientAddress.cidade || "",
        address: {
          ...emptyAddress,
          ...clientAddress,
          cidade: clientAddress.cidade || client.city || "",
        },
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
        status: "ativo",
        risk: "low",
        preferredMeetingDay: "",
        followUpFrequency: "semanal",
      });
      setIsAddressLocked(false);
      setIsFetchingCep(false);
    }
  }, [client, open]);

  useEffect(() => {
    const cep = formData.address.cep;
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
        if (!response.ok) {
          throw new Error("Erro ao buscar CEP");
        }
        const data = await response.json();
        if (data.erro) {
          throw new Error("CEP não encontrado");
        }

        setFormData((prev) => ({
          ...prev,
          city: data.localidade || prev.city,
          address: {
            ...prev.address,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const clientData = {
      ...formData,
      city: formData.address.cidade || formData.city || "",
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
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
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
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  inputMode="numeric"
                  value={formData.address.cep}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, address: { ...formData.address, cep: value.slice(0, 8) } });
                    if (!value) {
                      setIsAddressLocked(false);
                    }
                  }}
                  placeholder="00000000"
                  maxLength={8}
                />
                {isFetchingCep && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={formData.address.logradouro}
                readOnly={isAddressLocked}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, logradouro: e.target.value } })}
                placeholder="Rua, avenida..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData.address.numero}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, numero: e.target.value } })}
                placeholder="Número"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.address.complemento}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, complemento: e.target.value } })}
                placeholder="Apartamento, bloco, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.address.bairro}
                readOnly={isAddressLocked}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, bairro: e.target.value } })}
                placeholder="Bairro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.address.cidade}
                readOnly={isAddressLocked}
                onChange={(e) => setFormData({ ...formData, city: e.target.value, address: { ...formData.address, cidade: e.target.value } })}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                value={formData.address.uf}
                readOnly={isAddressLocked}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, uf: e.target.value.toUpperCase().slice(0, 2) } })}
                placeholder="UF"
                maxLength={2}
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
