import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";

const typeLabel: Record<string, string> = {
  task_assigned: "Atribuição",
  due_soon: "Prazo próximo",
  overdue: "Atraso",
  comment: "Comentário",
  status_changed: "Atualização",
  blocked: "Bloqueio",
};

export function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  return <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" className="relative" aria-label={`${unreadCount} notificações não lidas`}>
        <Bell className="h-4 w-4" />
        {unreadCount ? <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-0">
      <div className="flex items-center justify-between border-b p-3"><div><p className="font-medium">Notificações</p><p className="text-xs text-muted-foreground">Alertas operacionais internos</p></div><Button size="sm" variant="ghost" disabled={!unreadCount} onClick={() => void markAllRead()}><CheckCheck className="mr-1 h-4 w-4" />Ler todas</Button></div>
      <ScrollArea className="h-80">
        {loading && notifications.length === 0 ? <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /><span className="sr-only">Carregando notificações</span></div> : notifications.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhum alerta no momento.</p> : <ul>
          {notifications.map((notification) => <li key={notification.id} className={`border-b last:border-0 ${notification.read_at ? "opacity-65" : "bg-primary/[0.03]"}`}>
            <button type="button" className="w-full p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => { void markRead(notification.id); if (notification.task_id) navigate(`/plano-acao?taskId=${notification.task_id}`); }}>
              <div className="flex items-center justify-between gap-2"><Badge variant="outline" className="text-[10px]">{typeLabel[notification.notification_type] || "Alerta"}</Badge><time className="text-[10px] text-muted-foreground">{new Date(notification.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>
              <p className="mt-2 text-sm font-medium">{notification.title}</p>{notification.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p> : null}
            </button>
          </li>)}
        </ul>}
      </ScrollArea>
    </PopoverContent>
  </Popover>;
}
