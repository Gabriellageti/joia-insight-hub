import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { localDateKey } from "@/lib/my-day";
import type { Task } from "@/types";

export type DailyCheckin = Database["public"]["Tables"]["daily_checkins"]["Row"];
export type DailyFocus = Database["public"]["Tables"]["daily_focus_tasks"]["Row"];

export interface RecentTaskActivity {
  id: string;
  taskId: string;
  taskTitle: string;
  action: string;
  userName: string;
  userId: string | null;
  createdAt: string;
  newValue: Json;
}

export function useMyDay(tasks: Task[]) {
  const { user, activeMembership } = useAuth();
  const [focus, setFocus] = useState<DailyFocus[]>([]);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [activity, setActivity] = useState<RecentTaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const date = localDateKey();

  const load = useCallback(async () => {
    if (!user) {
      setFocus([]);
      setCheckin(null);
      setActivity([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const taskIds = tasks.map(({ id }) => id);
    const [focusResult, checkinResult, historyResult] = await Promise.all([
      supabase.from("daily_focus_tasks").select("*").eq("user_id", user.id).eq("focus_date", date).order("position"),
      supabase.from("daily_checkins").select("*").eq("user_id", user.id).eq("checkin_date", date).maybeSingle(),
      taskIds.length
        ? supabase.from("task_history").select("*").in("task_id", taskIds).order("created_at", { ascending: false }).limit(12)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const firstError = focusResult.error || checkinResult.error || historyResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    setFocus(focusResult.data ?? []);
    setCheckin(checkinResult.data ?? null);

    const history = historyResult.data ?? [];
    const userIds = [...new Set(history.map((entry) => entry.user_id).filter((id): id is string => Boolean(id)))];
    const profilesResult = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [], error: null };
    if (profilesResult.error) setError(profilesResult.error.message);
    const names = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name || "Usuário"]));
    const taskNames = new Map(tasks.map((task) => [task.id, task.title]));
    setActivity(history.map((entry) => ({
      id: entry.id,
      taskId: entry.task_id,
      taskTitle: taskNames.get(entry.task_id) || "Tarefa",
      action: entry.action,
      userName: entry.user_id ? names.get(entry.user_id) || "Usuário" : "Sistema",
      userId: entry.user_id,
      createdAt: entry.created_at,
      newValue: entry.new_value,
    })));
    setLoading(false);
  }, [date, tasks, user]);

  useEffect(() => { void load(); }, [load]);

  const focusTaskIds = useMemo(() => focus.map((item) => item.task_id), [focus]);

  const toggleFocus = useCallback(async (taskId: string) => {
    if (!user || !activeMembership) throw new Error("Usuário sem workspace ativo.");
    const existing = focus.find((item) => item.task_id === taskId);
    if (existing) {
      const { error: deleteError } = await supabase.from("daily_focus_tasks").delete().eq("id", existing.id);
      if (deleteError) throw new Error(deleteError.message);
      setFocus((current) => current.filter((item) => item.id !== existing.id));
      return;
    }
    if (focus.length >= 5) throw new Error("Mantenha no máximo 5 tarefas no foco de hoje.");
    const { data, error: insertError } = await supabase.from("daily_focus_tasks").insert({
      workspace_id: activeMembership.workspaceId,
      user_id: user.id,
      focus_date: date,
      task_id: taskId,
      position: focus.length,
    }).select().single();
    if (insertError) throw new Error(insertError.message);
    setFocus((current) => [...current, data]);
  }, [activeMembership, date, focus, user]);

  const moveFocus = useCallback(async (taskId: string, direction: -1 | 1) => {
    const index = focus.findIndex((item) => item.task_id === taskId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= focus.length) return;
    const reordered = [...focus];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setFocus(reordered.map((item, position) => ({ ...item, position })));
    const updates = reordered.map((item, position) => supabase.from("daily_focus_tasks").update({ position }).eq("id", item.id));
    const results = await Promise.all(updates);
    const failure = results.find((result) => result.error)?.error;
    if (failure) { await load(); throw new Error(failure.message); }
  }, [focus, load]);

  const saveStart = useCallback(async (notes: string) => {
    if (!user || !activeMembership) throw new Error("Usuário sem workspace ativo.");
    const payload = { workspace_id: activeMembership.workspaceId, user_id: user.id, checkin_date: date, start_notes: notes.trim() || null, started_at: checkin?.started_at || new Date().toISOString() };
    const { data, error: saveError } = await supabase.from("daily_checkins").upsert(payload, { onConflict: "user_id,checkin_date" }).select().single();
    if (saveError) throw new Error(saveError.message);
    setCheckin(data);
  }, [activeMembership, checkin?.started_at, date, user]);

  const saveEnd = useCallback(async (notes: string) => {
    if (!user || !activeMembership) throw new Error("Usuário sem workspace ativo.");
    const payload = { workspace_id: activeMembership.workspaceId, user_id: user.id, checkin_date: date, end_notes: notes.trim() || null, ended_at: new Date().toISOString(), started_at: checkin?.started_at || null };
    const { data, error: saveError } = await supabase.from("daily_checkins").upsert(payload, { onConflict: "user_id,checkin_date" }).select().single();
    if (saveError) throw new Error(saveError.message);
    setCheckin(data);
  }, [activeMembership, checkin?.started_at, date, user]);

  return { focus, focusTaskIds, checkin, activity, loading, error, toggleFocus, moveFocus, saveStart, saveEnd, refetch: load };
}
