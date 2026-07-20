
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { listTaskHistoryEntries, type TaskHistoryEntry } from "@/integrations/supabase/tasks";

interface TaskHistoryProps { taskId: string; }

const actionLabel: Record<string, string> = {
  created: "criou a tarefa",
  status_changed: "alterou o status",
  completed: "marcou a tarefa como concluída",
  reopened: "reabriu a tarefa",
};

export function TaskHistory({ taskId }: TaskHistoryProps) {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTaskHistoryEntries(taskId)
      .then((data) => !cancelled && setEntries(data))
      .catch((requestError: Error) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [taskId]);

  if (loading) return <Skeleton className="h-16 w-full" />;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;

  return <ol className="space-y-3">{entries.map((entry) => <li key={entry.id} className="flex gap-2 text-sm"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><p><strong>{entry.user_name}</strong> {actionLabel[entry.action] || entry.action}.</p><time className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")}</time></div></li>)}</ol>;
}
