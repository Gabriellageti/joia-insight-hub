import { CheckCircle2, Circle, Clock, FileCheck2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/types";
import { getDeliveryStepsForProject, getProjectTypeLabel } from "@/lib/project-delivery";

interface ProjectDeliveryWorkflowProps {
  project: Project;
}

const getStepStatus = (index: number, activeIndex: number) => {
  if (index < activeIndex) return "completed";
  if (index === activeIndex) return "active";
  return "pending";
};

export function ProjectDeliveryWorkflow({ project }: ProjectDeliveryWorkflowProps) {
  const steps = getDeliveryStepsForProject(project);
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.title.toLowerCase() === project.phase.toLowerCase())
  );
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;
  const completedSteps = steps.filter((_, index) => index < safeActiveIndex).length;
  const workflowProgress = Math.round((completedSteps / steps.length) * 100);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Esteira de Entrega
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Acompanhe as etapas de construção para {getProjectTypeLabel(project.projectType).toLowerCase()}.
            </p>
          </div>
          <Badge variant="secondary">{getProjectTypeLabel(project.projectType)}</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso da esteira</span>
            <span className="font-medium">{workflowProgress}%</span>
          </div>
          <Progress value={workflowProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(index, safeActiveIndex);
            const isCompleted = status === "completed";
            const isActive = status === "active";
            const Icon = isCompleted ? CheckCircle2 : isActive ? Clock : Circle;

            return (
              <div
                key={step.title}
                className={`rounded-lg border p-4 transition-colors ${
                  isActive ? "border-primary/40 bg-primary/5" : "bg-card"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <Icon
                      className={`mt-0.5 h-5 w-5 ${
                        isCompleted ? "text-green-600" : isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{step.title}</h4>
                        {isActive && <Badge>Em andamento</Badge>}
                        {isCompleted && <Badge variant="outline">Concluída</Badge>}
                        {step.approvalRequired && (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Aprovação
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Checklist recomendado
                    </p>
                    <ul className="space-y-1 text-sm">
                      {step.checklist.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Entregáveis esperados
                    </p>
                    <ul className="space-y-1 text-sm">
                      {step.deliverables.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
