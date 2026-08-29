import { Bell, BriefcaseBusiness, CalendarClock, CircleUserRound, Loader2, MessageSquareText, Smartphone, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences, NotificationPreferences } from "@/hooks/useNotificationPreferences";

const categories: { key: keyof NotificationPreferences; label: string; description: string; icon: typeof Bell }[] = [
  { key: "task_notifications", label: "Tarefas", description: "Atribuições, prazos, atrasos, bloqueios e comentários.", icon: BriefcaseBusiness },
  { key: "project_notifications", label: "Projetos", description: "Projetos que entrarem em atenção ou risco.", icon: CircleUserRound },
  { key: "meeting_notifications", label: "Reuniões", description: "Reuniões próximas ou não finalizadas.", icon: CalendarClock },
  { key: "client_notifications", label: "Clientes", description: "Clientes que precisarem de atenção operacional.", icon: Users },
  { key: "mention_notifications", label: "Menções", description: "Comentários em que seu nome for mencionado.", icon: MessageSquareText },
];

export function NotificationSettings() {
  const { preferences, loading, error, retry, updatePreference } = useNotificationPreferences();
  if (loading) return <Card><CardHeader><CardTitle>Preferências de Notificação</CardTitle></CardHeader><CardContent className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;
  if (error) return <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-3">{error}<Button size="sm" variant="outline" onClick={() => void retry()}>Tentar novamente</Button></AlertDescription></Alert>;
  return <div className="space-y-4"><Card><CardHeader><CardTitle>Preferências de Notificação</CardTitle><CardDescription>Escolha quais sinais operacionais aparecem no JoIA Ops.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex items-center justify-between gap-4 rounded-lg border p-4"><div className="flex gap-3"><Bell className="h-5 w-5 text-primary" /><div><p className="font-medium">Central interna</p><p className="text-sm text-muted-foreground">Ativar notificações dentro do aplicativo.</p></div></div><Switch aria-label="Ativar central interna" checked={preferences.in_app_notifications} onCheckedChange={(value) => void updatePreference("in_app_notifications", value)} /></div>{categories.map(({ key, label, description, icon: Icon }) => <div key={key} className="flex items-start justify-between gap-4"><div className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{description}</p></div></div><Switch aria-label={`Notificações de ${label}`} disabled={!preferences.in_app_notifications} checked={preferences[key]} onCheckedChange={(value) => void updatePreference(key, value)} /></div>)}</CardContent></Card>
    <Card><CardHeader><div className="flex items-center gap-2"><Smartphone className="h-5 w-5" /><CardTitle className="text-base">Canais externos</CardTitle><Badge variant="secondary">Preparado para o futuro</Badge></div><CardDescription>A arquitetura reserva e-mail, WhatsApp e push, mas nenhum envio externo foi ativado no P6.</CardDescription></CardHeader></Card>
  </div>;
}
