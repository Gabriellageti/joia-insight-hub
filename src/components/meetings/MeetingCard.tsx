import { memo } from "react";
import { Video, MapPin, Calendar as CalendarIcon, Clock, Trash2, ExternalLink, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MeetingData } from "@/hooks/useMeetings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  in_progress: { label: "Em andamento", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  completed: { label: "Realizada", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

interface MeetingCardProps {
  meeting: MeetingData;
  onEdit: (meeting: MeetingData) => void;
  onOpenMinutes: (meeting: MeetingData) => void;
  onDelete: (meeting: MeetingData, e: React.MouseEvent) => void;
  onAddToCalendar: (meeting: MeetingData, type: "google" | "outlook" | "ics") => void;
}

export const MeetingCard = memo(function MeetingCard({
  meeting,
  onEdit,
  onOpenMinutes,
  onDelete,
  onAddToCalendar,
}: MeetingCardProps) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onEdit(meeting)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{meeting.title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {meeting.projectName || "Reunião Interna"}
            </p>
            {meeting.clientName && (
              <p className="text-xs text-muted-foreground truncate">{meeting.clientName}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            <Badge className={statusConfig[meeting.status].color} variant="outline">
              {statusConfig[meeting.status].label}
            </Badge>
            {meeting.hasMinutes && (
              <Badge variant="outline" className="text-xs">
                Ata disponível
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {meeting.date}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {meeting.time}
          </div>
          <div className="flex items-center gap-1">
            {meeting.type === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {meeting.type === "online" ? "Online" : "Presencial"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                Adicionar ao Calendário
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCalendar(meeting, "google");
                }}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCalendar(meeting, "outlook");
                }}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Outlook
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCalendar(meeting, "ics");
                }}
              >
                <Download className="h-3 w-3 mr-2" />
                Baixar .ICS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMinutes(meeting);
            }}
          >
            <FileText className="h-3 w-3 mr-1" />
            {meeting.hasMinutes ? "Ver Ata" : "Criar Ata"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
            onClick={(e) => onDelete(meeting, e)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
