import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Cable, CheckCircle2, Clock3, Play, RefreshCw, Workflow, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { hasWorkspaceRole } from "@/lib/authorization";
import {
  AutomationConnector,
  AutomationRule,
  AutomationRun,
  listAutomationDashboard,
  runScheduledAutomations,
  setAutomationRuleEnabled,
} from "@/lib/automations";
import { automationActionLabels, automationEventLabels } from "@/lib/automation-labels";

const statusLabel: Record<string, string> = { success: "Sucesso", error: "Erro", skipped: "Ignorada", running: "Em execução" };

export default function Automations() {
  const { activeMembership } = useAuth();
  const canManage = hasWorkspaceRole(activeMembership?.role, "manager");
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [connectors, setConnectors] = useState<AutomationConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAutomationDashboard();
      setRules(data.rules); setRuns(data.runs); setConnectors(data.connectors);
    } catch (error) { toast.error((error as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => ({
    enabled: rules.filter((rule) => rule.enabled).length,
    success: runs.filter((run) => run.status === "success").length,
    errors: runs.filter((run) => run.status === "error").length,
  }), [rules, runs]);

  const toggle = async (rule: AutomationRule, enabled: boolean) => {
    setSavingId(rule.id);
    setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled } : item));
    try { await setAutomationRuleEnabled(rule.id, enabled); toast.success(enabled ? "Automação ativada." : "Automação pausada."); }
    catch (error) { setRules((current) => current.map((item) => item.id === rule.id ? rule : item)); toast.error((error as Error).message); }
    finally { setSavingId(null); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const result = await runScheduledAutomations();
      toast.success(`${result.executed} execução(ões); ${result.deduplicated} já processada(s).`);
      await load();
    } catch (error) { toast.error((error as Error).message); }
    finally { setRunning(false); }
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><Workflow className="h-6 w-6 text-primary" />Automações</h1><p className="text-muted-foreground">Regras internas no formato quando → condição → ação, com rastreabilidade e proteção contra duplicidade.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</Button><Button onClick={() => void runNow()} disabled={running}><Play className="mr-2 h-4 w-4" />{running ? "Executando…" : "Executar agora"}</Button></div>
    </header>

    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><Workflow className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">{metrics.enabled}</p><p className="text-sm text-muted-foreground">regras ativas</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-semibold">{metrics.success}</p><p className="text-sm text-muted-foreground">execuções recentes</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><XCircle className="h-5 w-5 text-destructive" /><div><p className="text-2xl font-semibold">{metrics.errors}</p><p className="text-sm text-muted-foreground">erros recentes</p></div></CardContent></Card>
    </div>

    <Tabs defaultValue="rules"><TabsList className="grid w-full grid-cols-3 sm:w-auto"><TabsTrigger value="rules">Regras</TabsTrigger><TabsTrigger value="runs">Execuções</TabsTrigger><TabsTrigger value="connectors">Integrações</TabsTrigger></TabsList>
      <TabsContent value="rules" className="space-y-3">
        {!canManage && <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">Você pode consultar as regras. Apenas gestores podem ativá-las ou pausá-las.</p>}
        {loading ? <p className="text-sm text-muted-foreground">Carregando regras…</p> : rules.map((rule) => <Card key={rule.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{rule.name}</h2><Badge variant={rule.enabled ? "default" : "secondary"}>{rule.enabled ? "Ativa" : "Pausada"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{rule.description}</p><p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Quando:</span> {automationEventLabels[rule.event_type] ?? rule.event_type} <span aria-hidden="true">→</span> <span className="font-medium text-foreground">Ação:</span> {automationActionLabels[rule.action_type] ?? rule.action_type}</p></div><Switch checked={rule.enabled} onCheckedChange={(value) => void toggle(rule, value)} disabled={!canManage || savingId === rule.id} aria-label={`${rule.enabled ? "Pausar" : "Ativar"} ${rule.name}`} /></CardContent></Card>)}
      </TabsContent>
      <TabsContent value="runs"><Card><CardHeader><CardTitle className="text-base">Log de execuções</CardTitle><CardDescription>Horário, resultado, duração e erro de cada regra.</CardDescription></CardHeader><CardContent className="space-y-3">{runs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p> : runs.map((run) => { const rule = rules.find((item) => item.id === run.rule_id); return <div key={run.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Activity className="h-4 w-4" /><p className="font-medium">{rule?.name ?? "Regra de automação"}</p><Badge variant={run.status === "success" ? "default" : run.status === "error" ? "destructive" : "secondary"}>{statusLabel[run.status] ?? run.status}</Badge></div>{run.error_message && <p className="mt-1 text-sm text-destructive">{run.error_message}</p>}<p className="mt-1 text-xs text-muted-foreground">{run.entity_type} · {run.entity_id ?? "evento periódico"}</p></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(run.started_at).toLocaleString("pt-BR")}</span><span>{run.duration_ms ?? 0} ms</span></div></div>; })}</CardContent></Card></TabsContent>
      <TabsContent value="connectors"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Cable className="h-4 w-4" />Integrações preparadas</CardTitle><CardDescription>Contratos internos reservados para uma fase futura. Nenhuma conexão externa é feita no P10.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{connectors.map((connector) => <div key={connector.id} className="flex items-center justify-between rounded-lg border p-3"><span className="font-medium">{connector.label}</span><Badge variant="outline">Planejada</Badge></div>)}</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
