import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];

export function useActivityLogs(scope: { clientId?: string; projectId?: string }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!scope.clientId && !scope.projectId) return;
    setLoading(true); setError(null);
    let query = supabase.from("activity_logs").select("*");
    if (scope.clientId) query = query.eq("client_id", scope.clientId);
    if (scope.projectId) query = query.eq("project_id", scope.projectId);
    const { data, error: queryError } = await query.order("created_at", { ascending: false }).limit(50);
    if (queryError) setError(queryError.message); else setActivities(data ?? []);
    setLoading(false);
  }, [scope.clientId, scope.projectId]);
  useEffect(() => { void load(); window.addEventListener("joia:meetings-changed", load); return () => window.removeEventListener("joia:meetings-changed", load); }, [load]);
  return { activities, loading, error, refetch: load };
}
