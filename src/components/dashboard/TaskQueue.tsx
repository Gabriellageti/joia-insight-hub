import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useNavigate } from "react-router-dom";

interface QueueItem {
  id: string;
  title: string;
  type: "overdue" | "today" | "upcoming" | "meeting";
  client?: string;
  time?: string;
  projectName?: string;
}

const typeConfig = {
  overdue: {
    icon: AlertCircle,
    label: "Atrasada",
    color: "bg-destructive text-destructive-foreground",
  },
  today: {
    icon: Clock,
    label: "Hoje",
    color: "bg-accent text-accent-foreground",
  },
  upcoming: {
    icon: CheckCircle2,
    label: "Próxima",
    color: "bg-muted text-muted-foreground",
  },
  meeting: {
    icon: Calendar,
    label: "Reunião",
    color: "bg-primary text-primary-foreground",
  },
};

export function TaskQueue() {
  const { tasks, meetings, clients } = useData();
  const navigate = useNavigate();

  const queueItems = useMemo(() => {
    const items: QueueItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Parse dd/mm/yyyy date
    const parseDateBR = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      return new Date(year, month - 1, day);
    };

    // Add overdue tasks
    tasks
      .filter((task) => {
        if (task.status === "done") return false;
        if (!task.dueDate) return false;
        const dueDate = parseDateBR(task.dueDate);
        return dueDate && dueDate < today;
      })
      .slice(0, 3)
      .forEach((task) => {
        items.push({
          id: `task-${task.id}`,
          title: task.title,
          type: "overdue",
          client: task.clientName,
          projectName: task.projectName,
        });
      });

    // Add today's meetings
    meetings
      .filter((meeting) => {
        if (!meeting.date) return false;
        const meetingDate = new Date(meeting.date);
        return (
          meetingDate >= today &&
          meetingDate < tomorrow &&
          meeting.status !== "completed" &&
          meeting.status !== "cancelled"
        );
      })
      .slice(0, 2)
      .forEach((meeting) => {
        const meetingDate = new Date(meeting.date!);
        const time = meetingDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const client = clients.find((c) => c.id === meeting.clientId);
        items.push({
          id: `meeting-${meeting.id}`,
          title: meeting.title,
          type: "meeting",
          client: client?.name,
          time,
        });
      });

    // Add today's tasks
    tasks
      .filter((task) => {
        if (task.status === "done") return false;
        if (!task.dueDate) return false;
        const dueDate = parseDateBR(task.dueDate);
        if (!dueDate) return false;
        return dueDate >= today && dueDate < tomorrow;
      })
      .slice(0, 2)
      .forEach((task) => {
        items.push({
          id: `task-today-${task.id}`,
          title: task.title,
          type: "today",
          client: task.clientName,
          projectName: task.projectName,
        });
      });

    // Add upcoming tasks (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (items.length < 5) {
      tasks
        .filter((task) => {
          if (task.status === "done") return false;
          if (!task.dueDate) return false;
          const dueDate = parseDateBR(task.dueDate);
          if (!dueDate) return false;
          return dueDate >= tomorrow && dueDate <= nextWeek;
        })
        .slice(0, 5 - items.length)
        .forEach((task) => {
          items.push({
            id: `task-upcoming-${task.id}`,
            title: task.title,
            type: "upcoming",
            client: task.clientName,
            projectName: task.projectName,
          });
        });
    }

    return items.slice(0, 6);
  }, [tasks, meetings, clients]);

  const handleItemClick = (item: QueueItem) => {
    if (item.type === "meeting") {
      navigate("/reunioes");
    } else {
      navigate("/plano-acao");
    }
  };

  if (queueItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fila do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma tarefa ou reunião para hoje.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fila do Dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {queueItems.map((item) => {
          const config = typeConfig[item.type];
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              onClick={() => handleItemClick(item)}
            >
              <div className={`p-1.5 rounded ${config.color}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.client || item.projectName || "—"}
                </p>
              </div>
              {item.time ? (
                <Badge variant="outline" className="text-xs shrink-0">
                  {item.time}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${
                    item.type === "overdue" ? "border-destructive text-destructive" : ""
                  }`}
                >
                  {config.label}
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
