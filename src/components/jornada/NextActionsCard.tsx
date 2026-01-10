import { ArrowRight, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface NextActionsCardProps {
  actions: SuggestedAction[];
  onActionClick?: (actionId: string) => void;
}

const priorityConfig = {
  high: { 
    icon: AlertCircle, 
    color: 'text-red-500', 
    bg: 'bg-red-500/10',
    badge: 'bg-red-500 text-white' 
  },
  medium: { 
    icon: Clock, 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500 text-white' 
  },
  low: { 
    icon: CheckCircle2, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500 text-white' 
  },
};

const priorityLabels = {
  high: 'Urgente',
  medium: 'Importante',
  low: 'Recomendado',
};

export function NextActionsCard({ actions, onActionClick }: NextActionsCardProps) {
  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Próximas Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Todas as ações desta fase foram concluídas!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Avance para a próxima fase quando estiver pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-primary" />
          Próximas Ações Sugeridas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const config = priorityConfig[action.priority];
          const Icon = config.icon;
          
          return (
            <div
              key={action.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
                config.bg
              )}
              onClick={() => onActionClick?.(action.id)}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("h-5 w-5 mt-0.5", config.color)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-medium text-sm text-foreground">
                      {action.title}
                    </h5>
                    <Badge className={cn("text-xs", config.badge)}>
                      {priorityLabels[action.priority]}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </p>
                </div>
                
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
