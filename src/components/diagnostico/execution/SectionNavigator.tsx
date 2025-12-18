import { useMemo } from "react";
import { Check, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateSection, TemplateQuestion } from "@/types";
import { DiagnosticAnswer } from "@/types/diagnostic-execution";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SectionGroup {
  section: TemplateSection;
  questions: { section: TemplateSection; question: TemplateQuestion; globalIndex: number }[];
}

interface SectionNavigatorProps {
  sections: SectionGroup[];
  currentIndex: number;
  answers: Record<string, DiagnosticAnswer>;
  onJumpTo: (globalIndex: number) => void;
}

export function SectionNavigator({
  sections,
  currentIndex,
  answers,
  onJumpTo,
}: SectionNavigatorProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    // Open the section containing the current question by default
    const initial: Record<string, boolean> = {};
    sections.forEach((group) => {
      const containsCurrent = group.questions.some((q) => q.globalIndex === currentIndex);
      initial[group.section.id] = containsCurrent;
    });
    return initial;
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const getSectionProgress = (group: SectionGroup) => {
    const answered = group.questions.filter((q) => answers[q.question.id]).length;
    const total = group.questions.length;
    return { answered, total, percent: total > 0 ? Math.round((answered / total) * 100) : 0 };
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="p-3 border-b bg-muted/50">
        <h3 className="font-medium text-sm">Navegação</h3>
      </div>
      <ScrollArea className="h-[300px] lg:h-[calc(100vh-400px)]">
        <div className="p-2">
          {sections.map((group) => {
            const progress = getSectionProgress(group);
            const isOpen = openSections[group.section.id];
            const containsCurrent = group.questions.some((q) => q.globalIndex === currentIndex);

            return (
              <Collapsible
                key={group.section.id}
                open={isOpen}
                onOpenChange={() => toggleSection(group.section.id)}
              >
                <CollapsibleTrigger className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-muted transition-colors",
                  containsCurrent && "bg-accent/10"
                )}>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{group.section.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {progress.answered}/{progress.total} ({progress.percent}%)
                    </p>
                  </div>
                  {progress.percent === 100 && (
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 border-l pl-2 mt-1 space-y-0.5">
                    {group.questions.map((item) => {
                      const isAnswered = !!answers[item.question.id];
                      const isCurrent = item.globalIndex === currentIndex;

                      return (
                        <button
                          key={item.question.id}
                          onClick={() => onJumpTo(item.globalIndex)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors",
                            isCurrent ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                            !isCurrent && isAnswered && "text-muted-foreground"
                          )}
                        >
                          {isAnswered ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className={cn(
                              "h-3.5 w-3.5 flex-shrink-0",
                              item.question.required ? "text-accent" : "text-muted-foreground"
                            )} />
                          )}
                          <span className="truncate">{item.question.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
