import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type InternalNotification = Database["public"]["Tables"]["internal_notifications"]["Row"];

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    const { data, error: selectError } = await supabase.from("internal_notifications").select("*").eq("user_id", user.id).is("resolved_at", null).order("created_at", { ascending: false }).limit(50);
    if (selectError) throw selectError;
    setNotifications(data ?? []);
  }, [user]);
  const refresh = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    setLoading(true); setError(null);
    try {
      const { error: refreshError } = await supabase.rpc("refresh_my_notifications");
      if (refreshError) throw refreshError;
      await loadNotifications();
    } catch (requestError) { setError((requestError as Error).message || "Não foi possível carregar as notificações."); }
    finally { setLoading(false); }
  }, [loadNotifications, user]);
  useEffect(() => {
    void refresh();
    if (!user) return;
    const handleFocus = () => void refresh();
    const interval = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    const channel = supabase.channel(`notifications:${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "internal_notifications", filter: `user_id=eq.${user.id}` }, () => void loadNotifications().catch(() => setError("Não foi possível atualizar as notificações."))).subscribe();
    window.addEventListener("focus", handleFocus);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", handleFocus); void supabase.removeChannel(channel); };
  }, [loadNotifications, refresh, user]);
  const markRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("internal_notifications").update({ read_at: readAt }).eq("id", id);
    if (!updateError) setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
  }, []);
  const markAllRead = useCallback(async () => {
    if (!user) return;
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("internal_notifications").update({ read_at: readAt }).eq("user_id", user.id).is("read_at", null);
    if (!updateError) setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
  }, [user]);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);
  return { notifications, unreadCount, loading, error, refresh, markRead, markAllRead };
}
