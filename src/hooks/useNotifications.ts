import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type InternalNotification = Database["public"]["Tables"]["internal_notifications"]["Row"];

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    setLoading(true);
    await supabase.rpc("refresh_my_task_notifications");
    const { data } = await supabase.from("internal_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setNotifications(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("internal_notifications").update({ read_at: readAt }).eq("id", id);
    if (!error) setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("internal_notifications").update({ read_at: readAt }).eq("user_id", user.id).is("read_at", null);
    if (!error) setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);
  return { notifications, unreadCount, loading, refresh, markRead, markAllRead };
}
