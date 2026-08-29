import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hasWorkspaceRole } from "@/lib/authorization";
import { toast } from "sonner";

const initial = { inactivity_days: 14, project_stale_days: 7, blocked_stale_days: 3, due_soon_days: 7 };

export function OperationalSettings() {
  const { user, activeMembership } = useAuth();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const editable = hasWorkspaceRole(activeMembership?.role, "manager");
  useEffect(() => {
    if (!activeMembership) return;
    void supabase.from("workspace_operational_settings").select("inactivity_days,project_stale_days,blocked_stale_days,due_soon_days").eq("workspace_id", activeMembership.workspaceId).single().then(({ data }) => data && setValues(data));
  }, [activeMembership]);
  const save = async () => {
    if (!activeMembership || !user || !editable) return;
    if (Object.values(values).some((value) => !Number.isInteger(value) || value < 1 || value > 90)) { toast.error("Use números inteiros entre 1 e 90 dias."); return; }
    setSaving(true);
    const { error } = await supabase.from("workspace_operational_settings").update({ ...values, updated_at: new Date().toISOString(), updated_by: user.id }).eq("workspace_id", activeMembership.workspaceId);
    setSaving(false);
    if (error) toast.error("Não foi possível salvar os critérios."); else toast.success("Critérios operacionais atualizados.");
  };
  const field = (key: keyof typeof values, label: string, help: string) => <div className="space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} type="number" min={1} max={90} value={values[key]} disabled={!editable || saving} onChange={(event) => setValues((current) => ({ ...current, [key]: Number(event.target.value) }))} /><p className="text-xs text-muted-foreground">{help}</p></div>;
  return <Card><CardHeader><CardTitle>Critérios de saúde operacional</CardTitle><CardDescription>Regras centralizadas usadas pelo Dashboard, Pendências e relatórios. Pesos do risco: atraso +2, bloqueio +2, urgência +1, projeto vencido +3, inatividade +1/2 e próximos passos/reuniões pendentes +1.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{field("inactivity_days", "Cliente sem acompanhamento", "Dias sem atividade para sinalizar falta de follow-up.")}{field("project_stale_days", "Projeto sem atividade", "Dias sem atividade para adicionar risco ao projeto.")}{field("blocked_stale_days", "Bloqueio antigo", "Dias para destacar um bloqueio persistente.")}{field("due_soon_days", "Prazo próximo", "Janela em dias para alertar sobre vencimento do projeto.")}</div><Button disabled={!editable || saving} onClick={() => void save()}>{saving ? "Salvando..." : "Salvar critérios"}</Button>{!editable ? <p className="text-sm text-muted-foreground">Somente gestores podem alterar estes critérios.</p> : null}</CardContent></Card>;
}
