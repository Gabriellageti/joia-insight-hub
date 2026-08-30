import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export interface NotificationPreferences {
  in_app_notifications: boolean;
  task_notifications: boolean;
  project_notifications: boolean;
  meeting_notifications: boolean;
  client_notifications: boolean;
  mention_notifications: boolean;
}
const defaults: NotificationPreferences = { in_app_notifications: true, task_notifications: true, project_notifications: true, meeting_notifications: true, client_notifications: true, mention_notifications: true };

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchPreferences = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      setError(null);
      const { data, error: requestError } = await supabase.from("notification_preferences").select("in_app_notifications,task_notifications,project_notifications,meeting_notifications,client_notifications,mention_notifications").eq("user_id", user.id).maybeSingle();
      if (requestError) throw requestError;
      setPreferences(data ?? defaults);
    } catch { setError("Não foi possível carregar suas preferências."); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void fetchPreferences(); }, [fetchPreferences]);
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;
    const previous = preferences;
    setPreferences((current) => ({ ...current, [key]: value }));
    const payload: Database["public"]["Tables"]["notification_preferences"]["Insert"] = { user_id: user.id, updated_at: new Date().toISOString() };
    payload[key] = value;
    const { error: updateError } = await supabase.from("notification_preferences").upsert(payload, { onConflict: "user_id" });
    if (updateError) { setPreferences(previous); toast.error("Erro ao atualizar preferência"); return; }
    toast.success("Preferência atualizada");
  };
  return { preferences, loading, error, retry: fetchPreferences, updatePreference };
}
