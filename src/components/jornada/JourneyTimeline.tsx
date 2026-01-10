import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, 
  FolderKanban, 
  ClipboardCheck, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  TrendingUp,
  ArrowRight 
} from "lucide-react";
import { JourneyEvent } from "@/integrations/supabase/journey-events";

interface JourneyTimelineProps {
  events: JourneyEvent[];
}

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  client_created: User,
  project_created: FolderKanban,
  diagnostic_started: ClipboardCheck,
  diagnostic_completed: ClipboardCheck,
  meeting_scheduled: Calendar,
  meeting_completed: Calendar,
  task_created: CheckCircle2,
  task_completed: CheckCircle2,
  evidence_uploaded: FileText,
  indicator_registered: TrendingUp,
  phase_advanced: ArrowRight,
};

const phaseColors: Record<string, string> = {
  onboarding: 'bg-blue-500',
  definition: 'bg-amber-500',
  execution: 'bg-green-500',
  validation: 'bg-purple-500',
};

const phaseNames: Record<string, string> = {
  onboarding: 'Onboarding',
  definition: 'Definição',
  execution: 'Execução',
  validation: 'Validação',
};

export function JourneyTimeline({ events }: JourneyTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum evento registrado ainda.</p>
        <p className="text-sm mt-1">Os eventos aparecerão aqui conforme você avança na jornada.</p>
      </div>
    );
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = format(new Date(event.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, JourneyEvent[]>);

  const sortedDates = Object.keys(eventsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <div key={date}>
          <div className="sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
            <h4 className="text-sm font-medium text-muted-foreground">
              {format(new Date(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h4>
          </div>
          
          <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-4">
            {eventsByDate[date].map((event, index) => {
              const Icon = eventIcons[event.event_type] || CheckCircle2;
              
              return (
                <div 
                  key={event.id} 
                  className="relative"
                >
                  {/* Timeline dot */}
                  <div 
                    className={`absolute -left-[31px] w-4 h-4 rounded-full ${phaseColors[event.phase]} border-2 border-background`}
                  />
                  
                  {/* Event card */}
                  <div className="bg-card border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${phaseColors[event.phase]} bg-opacity-10`}>
                        <Icon className={`h-4 w-4 ${phaseColors[event.phase].replace('bg-', 'text-')}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-medium text-foreground">
                            {event.event_title}
                          </h5>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${phaseColors[event.phase]} text-white`}>
                            {phaseNames[event.phase]}
                          </span>
                        </div>
                        
                        {event.event_description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.event_description}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(event.created_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
