import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/contexts/DataContext";
import { Client } from "@/types";
import { toast } from "sonner";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const { addClient, updateClient } = useData();
  const [formData, setFormData] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    segmentoTagsText: "",
    status: "ativo" as "ativo" | "inativo",
    risk: "low" as "low" | "medium" | "high",
    contatoPrincipalNome: "",
    contatoPrincipalWhatsapp: "",
    contatoPrincipalEmail: "",
    enderecoCep: "",
    enderecoLogradouro: "",
    enderecoNumero: "",
    enderecoComplemento: "",
    enderecoBairro: "",
    enderecoCidade: "",
    enderecoUf: "",
    observacoesInternas: "",
    preferenciasDiaReuniao: "",
    preferenciasFrequencia: "semanal" as "semanal" | "quinzenal" | "mensal",
  });

  useEffect(() => {
    if (client) {
      setFormData({
        razaoSocial: client.razaoSocial,
        nomeFantasia: client.nomeFantasia || "",
        cnpj: client.cnpj || "",
        segmentoTagsText: client.segmentoTags?.join(", ") || "",
        status: client.status,
        risk: client.risk,
        contatoPrincipalNome: client.contatoPrincipal?.nome || "",
        contatoPrincipalWhatsapp: client.contatoPrincipal?.whatsapp || "",
        contatoPrincipalEmail: client.contatoPrincipal?.email || "",
        enderecoCep: client.endereco?.cep || "",
        enderecoLogradouro: client.endereco?.logradouro || "",
        enderecoNumero: client.endereco?.numero || "",
        enderecoComplemento: client.endereco?.complemento || "",
        enderecoBairro: client.endereco?.bairro || "",
        enderecoCidade: client.endereco?.cidade || "",
        enderecoUf: client.endereco?.uf || "",
        observacoesInternas: client.observacoesInternas || "",
        preferenciasDiaReuniao: client.preferenciasRelacionamento?.diaReuniao || "",
        preferenciasFrequencia: client.preferenciasRelacionamento?.frequencia || "semanal",
      });
    } else {
      setFormData({
        razaoSocial: "",
        nomeFantasia: "",
        cnpj: "",
        segmentoTagsText: "",
        status: "ativo",
        risk: "low",
        contatoPrincipalNome: "",
        contatoPrincipalWhatsapp: "",
        contatoPrincipalEmail: "",
        enderecoCep: "",
        enderecoLogradouro: "",
        enderecoNumero: "",
        enderecoComplemento: "",
        enderecoBairro: "",
        enderecoCidade: "",
        enderecoUf: "",
        observacoesInternas: "",
        preferenciasDiaReuniao: "",
        preferenciasFrequencia: "semanal",
      });
    }
  }, [client, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.razaoSocial.trim()) {
      toast.error("Razão Social é obrigatória");
      return;
    }

    const segmentoTags = formData.segmentoTagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const clientData: Omit<Client, "id" | "createdAt"> = {
      razaoSocial: formData.razaoSocial.trim(),
      nomeFantasia: formData.nomeFantasia.trim(),
      cnpj: formData.cnpj.trim(),
      segmentoTags,
      status: formData.status,
      contatoPrincipal: {
        nome: formData.contatoPrincipalNome.trim(),
        whatsapp: formData.contatoPrincipalWhatsapp.trim(),
        email: formData.contatoPrincipalEmail.trim(),
      },
      endereco: {
        cep: formData.enderecoCep.trim(),
        logradouro: formData.enderecoLogradouro.trim(),
        numero: formData.enderecoNumero.trim(),
        complemento: formData.enderecoComplemento.trim(),
        bairro: formData.enderecoBairro.trim(),
        cidade: formData.enderecoCidade.trim(),
        uf: formData.enderecoUf.trim(),
      },
      observacoesInternas: formData.observacoesInternas.trim(),
      preferenciasRelacionamento: {
        diaReuniao: formData.preferenciasDiaReuniao,
        frequencia: formData.preferenciasFrequencia,
      },
      projects: client?.projects || 0,
      nps: client?.nps || 0,
      risk: formData.risk,
      lastContact: client?.lastContact || new Date().toLocaleDateString('pt-BR'),
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
              <Label htmlFor="razaoSocial">Razão Social *</Label>
              <Input
                id="razaoSocial"
                value={formData.razaoSocial}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                placeholder="Razão social"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
              <Input
                id="nomeFantasia"
                value={formData.nomeFantasia}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
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
              <Label htmlFor="segmentoTags">Segmentos</Label>
              <Input
                id="segmentoTags"
                value={formData.segmentoTagsText}
                onChange={(e) => setFormData({ ...formData, segmentoTagsText: e.target.value })}
                placeholder="Separar múltiplos segmentos com vírgula"
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
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Contato principal</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contatoPrincipalNome">Nome</Label>
                  <Input
                    id="contatoPrincipalNome"
                    value={formData.contatoPrincipalNome}
                    onChange={(e) => setFormData({ ...formData, contatoPrincipalNome: e.target.value })}
                    placeholder="Nome do contato"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contatoPrincipalWhatsapp">WhatsApp</Label>
                  <Input
                    id="contatoPrincipalWhatsapp"
                    value={formData.contatoPrincipalWhatsapp}
                    onChange={(e) => setFormData({ ...formData, contatoPrincipalWhatsapp: e.target.value })}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contatoPrincipalEmail">Email</Label>
                  <Input
                    id="contatoPrincipalEmail"
                    value={formData.contatoPrincipalEmail}
                    onChange={(e) => setFormData({ ...formData, contatoPrincipalEmail: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Endereço</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="enderecoCep">CEP</Label>
                  <Input
                    id="enderecoCep"
                    value={formData.enderecoCep}
                    onChange={(e) => setFormData({ ...formData, enderecoCep: e.target.value })}
                    placeholder="00.000-000"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="enderecoLogradouro">Logradouro</Label>
                  <Input
                    id="enderecoLogradouro"
                    value={formData.enderecoLogradouro}
                    onChange={(e) => setFormData({ ...formData, enderecoLogradouro: e.target.value })}
                    placeholder="Rua, avenida..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enderecoNumero">Número</Label>
                  <Input
                    id="enderecoNumero"
                    value={formData.enderecoNumero}
                    onChange={(e) => setFormData({ ...formData, enderecoNumero: e.target.value })}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enderecoComplemento">Complemento</Label>
                  <Input
                    id="enderecoComplemento"
                    value={formData.enderecoComplemento}
                    onChange={(e) => setFormData({ ...formData, enderecoComplemento: e.target.value })}
                    placeholder="Bloco, sala, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enderecoBairro">Bairro</Label>
                  <Input
                    id="enderecoBairro"
                    value={formData.enderecoBairro}
                    onChange={(e) => setFormData({ ...formData, enderecoBairro: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enderecoCidade">Cidade</Label>
                  <Input
                    id="enderecoCidade"
                    value={formData.enderecoCidade}
                    onChange={(e) => setFormData({ ...formData, enderecoCidade: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enderecoUf">UF</Label>
                  <Input
                    id="enderecoUf"
                    value={formData.enderecoUf}
                    onChange={(e) => setFormData({ ...formData, enderecoUf: e.target.value })}
                    placeholder="UF"
                  />
                </div>
              </div>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferenciasDiaReuniao">Dia de Reunião</Label>
                <Select value={formData.preferenciasDiaReuniao} onValueChange={(value) => setFormData({ ...formData, preferenciasDiaReuniao: value })}>
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
                <Label htmlFor="preferenciasFrequencia">Frequência de Acompanhamento</Label>
                <Select value={formData.preferenciasFrequencia} onValueChange={(value: "semanal" | "quinzenal" | "mensal") => setFormData({ ...formData, preferenciasFrequencia: value })}>
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
            <div className="col-span-2 space-y-2">
              <Label htmlFor="observacoesInternas">Observações Internas</Label>
              <Textarea
                id="observacoesInternas"
                value={formData.observacoesInternas}
                onChange={(e) => setFormData({ ...formData, observacoesInternas: e.target.value })}
                placeholder="Notas internas, contexto e direcionamentos"
                rows={3}
              />
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
