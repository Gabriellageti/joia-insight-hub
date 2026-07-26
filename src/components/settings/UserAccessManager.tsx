import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type InternalRole = "admin_joia" | "analista";

const labels: Record<InternalRole, string> = {
  admin_joia: "Administrador",
  analista: "Colaborador",
};

export function UserAccessManager() {
  const { employees } = useData();
  const [rolesByUser, setRolesByUser] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState<string | null>(null);

  const linkedEmployees = useMemo(
    () => employees.filter((employee) => Boolean(employee.userId)),
    [employees],
  );

  const loadRoles = async () => {
    const { data, error } = await supabase.from("user_roles").select("user_id, role");
    if (error) {
      toast.error("Não foi possível carregar os acessos.");
      return;
    }
    setRolesByUser((data ?? []).reduce<Record<string, string[]>>((accumulator, item) => {
      (accumulator[item.user_id] ??= []).push(item.role);
      return accumulator;
    }, {}));
  };

  useEffect(() => { void loadRoles(); }, []);

  const updateRole = async (userId: string, role: InternalRole) => {
    setPending(userId);
    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (deleteError) {
      toast.error("Não foi possível atualizar o acesso.");
      setPending(null);
      return;
    }
    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (insertError) {
      toast.error("O acesso não foi salvo. Tente novamente.");
      setPending(null);
      void loadRoles();
      return;
    }
    await loadRoles();
    setPending(null);
    toast.success("Acesso atualizado.");
  };

  return (
    <div className="space-y-4">
      {linkedEmployees.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum colaborador com conta vinculada ainda.</p>
      ) : linkedEmployees.map((employee) => {
        const currentRole = rolesByUser[employee.userId!]?.includes("admin_joia") ? "admin_joia" : "analista";
        return (
          <div key={employee.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{employee.name}</p></div>
              <p className="mt-1 text-sm text-muted-foreground">{employee.email || "Conta vinculada"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" />{labels[currentRole]}</Badge>
              <Select value={currentRole} disabled={pending === employee.userId} onValueChange={(value) => void updateRole(employee.userId!, value as InternalRole)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin_joia">Administrador</SelectItem><SelectItem value="analista">Colaborador</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Para incluir alguém novo, crie primeiro o colaborador com o e-mail dele. Quando ele criar a conta com esse mesmo e-mail, aparecerá aqui como Colaborador.</p>
    </div>
  );
}
