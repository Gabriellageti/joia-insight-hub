import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Access = "none" | "editor" | "manager";

const labels: Record<Access, string> = {
  none: "Sem acesso",
  editor: "Operador",
  manager: "Sócio do projeto",
};

export function ProjectAccessManager({ projectId }: { projectId: string }) {
  const { employees } = useData();
  const [accessByUser, setAccessByUser] = useState<Record<string, Access>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const people = useMemo(() => employees.filter((employee) => employee.userId), [employees]);

  const loadMembers = async () => {
    const { data, error } = await supabase.from("project_members").select("user_id, access_level").eq("project_id", projectId);
    if (error) { toast.error("Não foi possível carregar os acessos do projeto."); return; }
    setAccessByUser((data ?? []).reduce<Record<string, Access>>((accumulator, member) => {
      accumulator[member.user_id] = member.access_level === "manager" ? "manager" : "editor";
      return accumulator;
    }, {}));
  };

  useEffect(() => { void loadMembers(); }, [projectId]);

  const changeAccess = async (userId: string, access: Access) => {
    setSaving(userId);
    const request = access === "none"
      ? supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId)
      : supabase.from("project_members").upsert({ project_id: projectId, user_id: userId, access_level: access }, { onConflict: "project_id,user_id" });
    const { error } = await request;
    setSaving(null);
    if (error) { toast.error("Não foi possível atualizar o acesso ao projeto."); return; }
    await loadMembers();
    toast.success("Acesso ao projeto atualizado.");
  };

  if (!people.length) return <p className="text-sm text-muted-foreground">Cadastre e vincule os usuários da equipe para liberá-los neste projeto.</p>;

  return <div className="space-y-2">
    {people.map((employee) => {
      const access = accessByUser[employee.userId!] || "none";
      return <div key={employee.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div><p className="text-sm font-medium">{employee.name}</p><p className="text-xs text-muted-foreground">{access === "manager" ? "Vê também o financeiro deste projeto." : ""}</p></div>
        <Select value={access} disabled={saving === employee.userId} onValueChange={(value) => void changeAccess(employee.userId!, value as Access)}>
          <SelectTrigger className="w-44"><ShieldCheck className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="none">{labels.none}</SelectItem><SelectItem value="editor">{labels.editor}</SelectItem><SelectItem value="manager">{labels.manager}</SelectItem></SelectContent>
        </Select>
      </div>;
    })}
  </div>;
}
