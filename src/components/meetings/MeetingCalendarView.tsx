import { useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Video, MapPin, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MeetingData } from "@/hooks/useMeetings";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameMonth,
  parse,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MeetingCalendarViewProps {
  meetings: MeetingData[];
  viewMode: "month" | "week";
  onMeetingClick: (meeting: MeetingData) => void;
  onMeetingReschedule?: (meetingId: string, newDate: string) => Promise<void>;
}

const statusColors = {
  scheduled: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

function parseMeetingDate(dateStr: string): Date | null {
  try {
    const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
    if (!isNaN(parsed.getTime())) return parsed;
  } catch {
    // ignore
  }
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  } catch {
    // ignore
  }
  return null;
}

export function MeetingCalendarView({ 
  meetings, 
  viewMode, 
  onMeetingClick, 
  onMeetingReschedule 
}: MeetingCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, MeetingData[]>();
    meetings.forEach((meeting) => {
      const date = parseMeetingDate(meeting.date);
      if (date) {
        const key = format(date, "yyyy-MM-dd");
        const existing = map.get(key) || [];
        map.set(key, [...existing, meeting]);
      }
    });
    return map;
  }, [meetings]);

  const days = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const navigatePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, meeting: MeetingData) => {
    e.dataTransfer.setData("meetingId", meeting.id);
    e.dataTransfer.setData("meetingTitle", meeting.title);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOverDay(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDay(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dayKey: string, day: Date) => {
    e.preventDefault();
    setDragOverDay(null);
    setIsDragging(false);

    const meetingId = e.dataTransfer.getData("meetingId");
    const meetingTitle = e.dataTransfer.getData("meetingTitle");
    
    if (!meetingId || !onMeetingReschedule) return;

    const newDate = format(day, "dd/MM/yyyy");
    
    try {
      await onMeetingReschedule(meetingId, newDate);
      toast.success(`"${meetingTitle}" remarcada para ${newDate}`);
    } catch (error) {
      // Error is handled by the hook
    }
  }, [onMeetingReschedule]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium capitalize">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy", { locale: ptBR })
              : `Semana de ${format(days[0], "dd/MM")} a ${format(days[6], "dd/MM")}`}
          </h2>
          {onMeetingReschedule && (
            <p className="text-xs text-muted-foreground">
              Arraste reuniões para remarcar
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className={cn("grid grid-cols-7", viewMode === "week" ? "min-h-[300px]" : "")}>
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayMeetings = meetingsByDate.get(dayKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const isDropTarget = dragOverDay === dayKey;

            return (
              <div
                key={dayKey}
                className={cn(
                  "border-b border-r p-1 min-h-[80px] transition-colors",
                  viewMode === "week" && "min-h-[200px]",
                  !isCurrentMonth && viewMode === "month" && "bg-muted/30",
                  isDropTarget && "bg-accent/20 ring-2 ring-inset ring-accent"
                )}
                onDragOver={(e) => handleDragOver(e, dayKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dayKey, day)}
              >
                <div
                  className={cn(
                    "text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground",
                    !isCurrentMonth && viewMode === "month" && "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, viewMode === "week" ? 10 : 3).map((meeting) => (
                    <div
                      key={meeting.id}
                      draggable={!!onMeetingReschedule}
                      onDragStart={(e) => handleDragStart(e, meeting)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onMeetingClick(meeting)}
                      className={cn(
                        "w-full text-left text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer",
                        "bg-accent/10 hover:bg-accent/20 transition-colors",
                        onMeetingReschedule && "cursor-grab active:cursor-grabbing",
                        isDragging && "opacity-50"
                      )}
                    >
                      {onMeetingReschedule && (
                        <GripVertical className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColors[meeting.status])}
                      />
                      <span className="truncate">{meeting.time}</span>
                      <span className="truncate flex-1">{meeting.title}</span>
                      {meeting.type === "online" ? (
                        <Video className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <MapPin className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                  {dayMeetings.length > (viewMode === "week" ? 10 : 3) && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayMeetings.length - (viewMode === "week" ? 10 : 3)} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
