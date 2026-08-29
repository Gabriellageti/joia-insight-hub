import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useData } from "@/contexts/DataContext";
import { useFinancial } from "@/hooks/useFinancial";
import { useToast } from "@/components/ui/use-toast";
import type { Contract } from "@/types";
import {
  addBillingPeriod,
  getLocalTodayIso,
  type ContractBillingType,
} from "@/lib/contract-billing";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
}

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function ContractDialog({ open, onOpenChange, contract }: ContractDialogProps) {
  const { clients, projects, addContract, updateContract } = useData();
  const { addRecord } = useFinancial();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [billingType, setBillingType] = useState<ContractBillingType>("mensal");
  const [totalValue, setTotalValue] = useState("");
  const [installmentCount, setInstallmentCount] = useState("12");
  const [firstDueDate, setFirstDueDate] = useState(getLocalTodayIso());
  const [endDate, setEndDate] = useState("");
  const [generateReceivables, setGenerateReceivables] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(contract);

  useEffect(() => {
    if (open) {
      if (contract) {
        setTitle(contract.projectName || "");
        setClientId(contract.clientId || "");
        setProjectId(contract.projectId || "");
        setBillingType(contract.billingType || "mensal");
        setTotalValue(String(contract.value || ""));
        setInstallmentCount(String(contract.installments?.length || 12));
        setFirstDueDate(contract.startDate || getLocalTodayIso());
        setEndDate(contract.endDate || "");
        setGenerateReceivables(false);
      } else {
        setTitle("");
        setClientId("");
        setProjectId("");
        setBillingType("mensal");
        setTotalValue("");
        setInstallmentCount("12");
        setFirstDueDate(getLocalTodayIso());
        setEndDate("");
        setGenerateReceivables(true);
      }
    }
  }, [open, contract]);

  const projectsForClient = useMemo(
    () => projects.filter((p) => !clientId || p.clientId === clientId),
    [projects, clientId]
  );

  const totalValueNum = Number(totalValue) || 0;
  const installmentCountNum = Math.max(1, Number(installmentCount) || 1);
  const installmentValue =
    billingType === "projeto" ? totalValueNum : totalValueNum / installmentCountNum;

  const computedEndDate = useMemo(() => {
    if (billingType === "projeto") return endDate || firstDueDate;
    return addBillingPeriod(firstDueDate, installmentCountNum - 1, billingType);
  }, [billingType, firstDueDate, installmentCountNum, endDate]);

  const isValid = Boolean(title && clientId && totalValueNum > 0 && firstDueDate);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);

    const client = clients.find((c) => c.id === clientId);
    const project = projects.find((p) => p.id === projectId);
    const clientName = client?.nomeFantasia || client?.razaoSocial || "";

    const installments =
      billingType === "projeto"
        ? [
            {
              id: generateId(),
              value: totalValueNum,
              dueDate: firstDueDate,
              status: "pending" as const,
            },
          ]
        : Array.from({ length: installmentCountNum }).map((_, idx) => ({
            id: generateId(),
            value: installmentValue,
            dueDate: addBillingPeriod(firstDueDate, idx, billingType),
            status: "pending" as const,
          }));

    const payload = {
      clientId,
      clientName,
      projectId: projectId || undefined,
      projectName: project?.name || title,
      value: totalValueNum,
      startDate: firstDueDate,
      endDate: computedEndDate,
      billingType,
      installments,
    };

    try {
      if (isEditing && contract) {
        await updateContract(contract.id, payload);
      } else {
        // Wait for the persisted id before linking the generated charges.
        const savedContract = await addContract(payload);

        if (generateReceivables) {
          const labelBase =
            billingType === "mensal"
              ? "Mensalidade"
              : billingType === "semanal"
                ? "Cobrança semanal"
              : billingType === "parcela"
                ? "Parcela"
                : "Pagamento único";
          for (let i = 0; i < installments.length; i++) {
            const inst = installments[i];
            const description =
              billingType === "projeto"
                ? `${labelBase} - ${title}`
                : `${labelBase} ${i + 1}/${installments.length} - ${title}`;
            await addRecord({
              type: "receita",
              category: billingType === "mensal" || billingType === "semanal" ? "Recorrente" : "Projeto",
              description,
              clientId,
              clientName,
              projectId: projectId || undefined,
              projectName: project?.name,
              contractId: savedContract.id,
              installmentId: inst.id,
              amount: inst.value,
              date: inst.dueDate,
              status: "Pendente",
              isInternal: false,
            });
          }
        }
      }

      toast({
        title: isEditing ? "Contrato atualizado" : "Contrato criado",
        description: generateReceivables && !isEditing
          ? `${installments.length} cobrança(s) gerada(s) em Contas a Receber.`
          : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar contrato",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
          <DialogDescription>
            Defina o tipo de cobrança. O sistema gera automaticamente as parcelas em Contas a Receber.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="contract-title">Título do contrato</Label>
            <Input
              id="contract-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Consultoria mensal - JoIA"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contract-client">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="contract-client">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nomeFantasia || c.razaoSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-project">Projeto (opcional)</Label>
              <Select
                value={projectId || "none"}
                onValueChange={(v) => setProjectId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="contract-project">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem projeto</SelectItem>
                  {projectsForClient.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contract-billing">Tipo de cobrança</Label>
              <Select value={billingType} onValueChange={(v) => setBillingType(v as ContractBillingType)}>
                <SelectTrigger id="contract-billing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (recorrente)</SelectItem>
                  <SelectItem value="semanal">Semanal (recorrente)</SelectItem>
                  <SelectItem value="parcela">Parcelado</SelectItem>
                  <SelectItem value="projeto">Pagamento único</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-value">Valor total (R$)</Label>
              <Input
                id="contract-value"
                type="number"
                min="0"
                step="0.01"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
            {billingType !== "projeto" ? (
              <div className="space-y-2">
                <Label htmlFor="contract-installments">
                  {billingType === "mensal"
                    ? "Nº de meses"
                    : billingType === "semanal"
                      ? "Nº de semanas"
                      : "Nº de parcelas"}
                </Label>
                <Input
                  id="contract-installments"
                  type="number"
                  min="1"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="contract-end">Data final</Label>
                <Input
                  id="contract-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contract-first">
                {billingType === "projeto" ? "Data de pagamento" : "1º vencimento"}
              </Label>
              <Input
                id="contract-first"
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
              />
            </div>
            {billingType !== "projeto" && (
              <div className="space-y-2 rounded-md border border-border p-3 text-sm">
                <p className="text-muted-foreground">
                  {installmentCountNum}× de{" "}
                  <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(installmentValue || 0)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Último vencimento: {computedEndDate || "-"}
                </p>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Gerar cobranças automaticamente</p>
                <p className="text-xs text-muted-foreground">
                  Cria uma entrada em Contas a Receber para cada parcela.
                </p>
              </div>
              <Switch checked={generateReceivables} onCheckedChange={setGenerateReceivables} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || saving}>
              {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar contrato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
