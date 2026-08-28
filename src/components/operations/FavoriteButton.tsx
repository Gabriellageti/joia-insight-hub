import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function FavoriteButton({ entityType, entityId }: { entityType: "client" | "project"; entityId: string }) {
  const { user, activeMembership } = useAuth();
  const queryClient = useQueryClient();
  const key = ["entity-favorite", user?.id, entityType, entityId];
  const favorite = useQuery({
    queryKey: key,
    enabled: Boolean(user && activeMembership),
    queryFn: async () => {
      let query = supabase.from("entity_favorites").select("id").eq("user_id", user!.id).eq("entity_type", entityType);
      query = entityType === "client" ? query.eq("client_id", entityId) : query.eq("project_id", entityId);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (favorite.data?.id) {
        const { error } = await supabase.from("entity_favorites").delete().eq("id", favorite.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entity_favorites").insert({
          workspace_id: activeMembership!.workspaceId,
          user_id: user!.id,
          entity_type: entityType,
          client_id: entityType === "client" ? entityId : null,
          project_id: entityType === "project" ? entityId : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: key }); toast.success(favorite.data ? "Removido dos acompanhamentos." : "Adicionado aos acompanhamentos."); },
    onError: () => toast.error("Não foi possível atualizar o acompanhamento."),
  });
  const active = Boolean(favorite.data);
  return <Button type="button" variant="outline" size="sm" disabled={toggle.isPending || favorite.isLoading} aria-pressed={active} onClick={() => toggle.mutate()}><Star className={`mr-2 h-4 w-4 ${active ? "fill-amber-400 text-amber-600" : ""}`} />{active ? "Acompanhando" : "Acompanhar"}</Button>;
}
