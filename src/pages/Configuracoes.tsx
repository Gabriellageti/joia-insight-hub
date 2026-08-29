import { useCallback, useEffect, useState } from "react";
import { Building2, Users, Bell, Shield, Palette, Loader2, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { OperationalSettings } from "@/components/settings/OperationalSettings";
import { UserAccessManager } from "@/components/settings/UserAccessManager";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceRole } from "@/lib/authorization";
import { toast } from "sonner";

interface WorkspaceMemberView {
  userId: string;
  name: string;
  role: WorkspaceRole;
}

const roleLabels: Record<WorkspaceRole, string> = {
  viewer: "Leitor",
  member: "Membro",
  manager: "Gestor",
  admin: "Administrador",
  owner: "Proprietário",
};

export default function Configuracoes() {
  const { user, activeMembership, can } = useAuth();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberView[]>([]);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const canManageWorkspace = can("workspace.manage");

  const loadSettings = useCallback(async () => {
    if (!user || !activeMembership) return;
    setLoading(true);
    setLoadError(false);
    const [workspaceResult, membersResult, preferenceResult] = await Promise.all([
      supabase.from("workspaces").select("name, slug").eq("id", activeMembership.workspaceId).single(),
      supabase.from("workspace_members").select("user_id, role").eq("workspace_id", activeMembership.workspaceId),
      supabase.from("user_preferences").select("sidebar_compact").eq("user_id", user.id).maybeSingle(),
    ]);
    if (workspaceResult.error || membersResult.error || preferenceResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    const userIds = membersResult.data.map((member) => member.user_id);
    const profileResult = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [], error: null };
    if (profileResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    const profileRows = profileResult.data as Array<{ id: string; full_name: string | null }>;
    const names = new Map<string, string | null>(profileRows.map((profile) => [profile.id, profile.full_name]));
    setWorkspaceName(workspaceResult.data.name);
    setWorkspaceSlug(workspaceResult.data.slug);
    setSidebarCompact(preferenceResult.data?.sidebar_compact ?? false);
    setMembers(membersResult.data.map((member) => ({ userId: member.user_id, role: member.role, name: names.get(member.user_id) || "Usuário sem nome" })));
    setLoading(false);
  }, [activeMembership, user]);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const saveWorkspace = async () => {
    if (!activeMembership || !canManageWorkspace || savingWorkspace) return;
    const name = workspaceName.trim();
    const slug = workspaceSlug.trim().toLowerCase();
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast.error("Informe um nome e uma URL com letras minúsculas, números e hífens.");
      return;
    }
    setSavingWorkspace(true);
    const { error } = await supabase.from("workspaces").update({ name, slug }).eq("id", activeMembership.workspaceId);
    setSavingWorkspace(false);
    if (error) toast.error("Não foi possível salvar o workspace.");
    else toast.success("Workspace atualizado.");
  };

  const updateMemberRole = async (member: WorkspaceMemberView, role: WorkspaceRole) => {
    if (!activeMembership || !canManageWorkspace) return;
    const previousRole = member.role;
    setMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, role } : item));
    const { error } = await supabase.from("workspace_members").update({ role }).match({ workspace_id: activeMembership.workspaceId, user_id: member.userId });
    if (error) {
      setMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, role: previousRole } : item));
      toast.error("Não foi possível alterar o papel deste membro.");
    } else toast.success("Papel atualizado.");
  };

  const updateSidebarPreference = async (compact: boolean) => {
    if (!user || savingPreference) return;
    const previous = sidebarCompact;
    setSidebarCompact(compact);
    setSavingPreference(true);
    const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, sidebar_compact: compact, updated_at: new Date().toISOString() });
    setSavingPreference(false);
    if (error) {
      setSidebarCompact(previous);
      toast.error("Não foi possível salvar a preferência da sidebar.");
    } else {
      window.dispatchEvent(new CustomEvent("joia:sidebar-preference", { detail: { compact } }));
      toast.success("Preferência de navegação salva.");
    }
  };

  if (loading) return <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /><span className="sr-only">Carregando configurações</span></div>;
  if (loadError) return <Alert variant="destructive"><AlertTitle>Não foi possível carregar as configurações</AlertTitle><AlertDescription className="space-y-3"><p>Tente novamente sem perder as alterações já salvas.</p><Button variant="outline" onClick={() => void loadSettings()}>Tentar novamente</Button></AlertDescription></Alert>;

  return (
    <div className="space-y-6 min-w-0">
      <div><h1 className="text-2xl font-semibold">Configurações</h1><p className="text-muted-foreground">Gerencie workspace, permissões e preferências</p></div>
      <Tabs defaultValue="workspace" className="space-y-4 min-w-0">
        <div className="max-w-full overflow-x-auto pb-1"><TabsList className="w-max min-w-full justify-start">
          <TabsTrigger value="workspace"><Building2 className="h-4 w-4 mr-2" />Workspace</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="operations"><Gauge className="h-4 w-4 mr-2" />Operação</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />Segurança</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-2" />Aparência</TabsTrigger>
        </TabsList></div>

        <TabsContent value="workspace"><Card><CardHeader><CardTitle>Informações do workspace</CardTitle><CardDescription>Alterações exigem papel de administrador.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="workspace-name">Nome</Label><Input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} disabled={!canManageWorkspace || savingWorkspace} /></div>
          <div className="space-y-2"><Label htmlFor="workspace-slug">URL</Label><Input id="workspace-slug" value={workspaceSlug} onChange={(event) => setWorkspaceSlug(event.target.value)} disabled={!canManageWorkspace || savingWorkspace} /></div>
          <Button onClick={() => void saveWorkspace()} disabled={!canManageWorkspace || savingWorkspace}>{savingWorkspace ? "Salvando..." : "Salvar alterações"}</Button>
          {!canManageWorkspace && <p className="text-sm text-muted-foreground">Você possui acesso de leitura a estas informações.</p>}
        </CardContent></Card></TabsContent>

        <TabsContent value="users"><Card><CardHeader><CardTitle>Membros do workspace</CardTitle><CardDescription>Papéis são persistidos no banco e validados por RLS.</CardDescription></CardHeader><CardContent className="space-y-3">
          {members.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p> : members.map((member) => <div key={member.userId} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium truncate">{member.name}</p><p className="text-xs text-muted-foreground truncate">{member.userId}</p></div><Select value={member.role} onValueChange={(role: WorkspaceRole) => void updateMemberRole(member, role)} disabled={!canManageWorkspace || member.userId === user?.id}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(roleLabels) as WorkspaceRole[]).map((role) => <SelectItem key={role} value={role} disabled={role === "owner" && activeMembership?.role !== "owner"}>{roleLabels[role]}</SelectItem>)}</SelectContent></Select></div>)}
          <Button variant="outline" disabled>Convidar membro · Em breve</Button>
          <div className="border-t pt-4"><h3 className="mb-3 font-medium">Acesso interno JoIA</h3><UserAccessManager /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="notifications"><NotificationSettings /></TabsContent>
        <TabsContent value="operations"><OperationalSettings /></TabsContent>
        <TabsContent value="security"><Card><CardHeader><CardTitle>Segurança e acesso</CardTitle><CardDescription>Seu acesso efetivo é definido pelo membership protegido.</CardDescription></CardHeader><CardContent className="space-y-2"><p>Papel atual: <strong>{activeMembership ? roleLabels[activeMembership.role] : "Sem acesso"}</strong></p><p className="text-sm text-muted-foreground">Dados corporativos e arquivos são isolados por workspace. Mudanças administrativas são verificadas novamente pelo banco.</p><Button variant="outline" disabled>Autenticação multifator · Em breve</Button></CardContent></Card></TabsContent>
        <TabsContent value="appearance"><Card><CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Preferências pessoais salvas para sua conta.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Modo escuro</p><p className="text-sm text-muted-foreground">Alternar entre tema claro e escuro</p></div><ThemeToggle /></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Sidebar compacta</p><p className="text-sm text-muted-foreground">Reduzir a largura da navegação lateral</p></div><Switch checked={sidebarCompact} onCheckedChange={(checked) => void updateSidebarPreference(checked)} disabled={savingPreference} aria-label="Usar sidebar compacta" /></div></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
