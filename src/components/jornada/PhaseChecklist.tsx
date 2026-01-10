import { Check, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PhaseInfo } from "@/hooks/useClientJourney";
import { JourneyPhase } from "@/integrations/supabase/journey-events";

interface PhaseChecklistProps {
  phases: PhaseInfo[];
  currentPhase: JourneyPhase;
}

const phaseColors: Record<JourneyPhase, { bg: string; text: string; border: string }> = {
  onboarding: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
  definition: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500' },
  execution: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
  validation: { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500' },
};

export function PhaseChecklist({ phases, currentPhase }: PhaseChecklistProps) {
  const [expandedPhase, setExpandedPhase] = useState<JourneyPhase>(currentPhase);

  const togglePhase = (phaseId: JourneyPhase) => {
    setExpandedPhase(prev => prev === phaseId ? currentPhase : phaseId);
  };

  const getPhaseStatus = (phase: PhaseInfo, index: number): 'completed' | 'current' | 'upcoming' => {
    const currentIndex = phases.findIndex(p => p.id === currentPhase);
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => {
        const status = getPhaseStatus(phase, index);
        const isExpanded = expandedPhase === phase.id;
        const colors = phaseColors[phase.id];

        return (
          <div 
            key={phase.id}
            className={cn(
              "border rounded-lg overflow-hidden transition-all",
              status === 'current' && colors.border,
              status === 'completed' && "border-muted bg-muted/30",
              status === 'upcoming' && "border-muted opacity-60"
            )}
          >
            {/* Phase header */}
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  status === 'completed' && `${colors.bg} text-white`,
                  status === 'current' && `${colors.bg} text-white`,
                  status === 'upcoming' && "bg-muted text-muted-foreground"
                )}>
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                
                <div className="text-left">
                  <h4 className={cn(
                    "font-medium",
                    status === 'current' && colors.text,
                    status === 'upcoming' && "text-muted-foreground"
                  )}>
                    {phase.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={cn(
                    "text-sm font-medium",
                    phase.progress === 100 ? "text-green-500" : colors.text
                  )}>
                    {phase.progress}%
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Progress bar */}
            <div className="px-4 pb-2">
              <Progress 
                value={phase.progress} 
                className="h-1.5"
              />
            </div>

            {/* Checklist items */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t space-y-2">
                {phase.checklist.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md",
                      item.completed && "bg-green-500/10"
                    )}
                  >
                    {item.completed ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    
                    <span className={cn(
                      "text-sm",
                      item.completed ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
