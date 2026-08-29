import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityLogs } from "@/hooks/useActivityLogs";

export function ActivityFeed({ clientId, projectId }: { clientId?: string; projectId?: string }) {
  const { activities, loading, error, refetch } = useActivityLogs({ clientId, projectId });
  return <Card><CardHeader><CardTitle className="text-base">Movimentações recentes</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando histórico...</div> : null}{error ? <Alert variant="destructive"><AlertDescription>{error}<Button variant="outline" size="sm" className="ml-2" onClick={() => void refetch()}>Tentar novamente</Button></AlertDescription></Alert> : null}{!loading && !error ? activities.map((activity) => <div key={activity.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0"><div><p className="font-medium">{activity.description || activity.title}</p><p className="text-sm text-muted-foreground">{activity.title}</p>{activity.meeting_id ? <Link className="text-sm text-primary hover:underline" to={`/reunioes/${activity.meeting_id}`}>Abrir reunião</Link> : null}</div><span className="shrink-0 text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString("pt-BR")}</span></div>) : null}{!loading && !error && activities.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p> : null}</CardContent></Card>;
}
