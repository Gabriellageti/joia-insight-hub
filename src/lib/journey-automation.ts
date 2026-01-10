import { JourneyPhase } from '@/integrations/supabase/journey-events';
import { Client, Project, Diagnostic, DiagnosticTemplate } from '@/types';

export interface AutomationContext {
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  currentPhase: JourneyPhase;
  lastDiagnostic?: Diagnostic;
}

export interface ProjectDefaults {
  clientId: string;
  clientName: string;
  name: string;
  objective: string;
  phase: string;
}

export interface DiagnosticDefaults {
  projectId?: string;
  projectName?: string;
  clientId: string;
  clientName: string;
  templateId?: string;
  templateName?: string;
  name: string;
  responsibleName?: string;
}

export interface MeetingDefaults {
  projectId?: string;
  projectName?: string;
  clientId: string;
  clientName: string;
  title: string;
  agenda: string;
  type: 'online' | 'presencial';
}

export interface TaskDefaults {
  projectId?: string;
  projectName?: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baixa';
  type: string;
}

export type ActionType = 
  | 'project_created'
  | 'kickoff_started'
  | 'kickoff_completed'
  | 'assessment_presented'
  | 'specific_projects_created'
  | 'specific_diagnostic'
  | 'action_plan'
  | 'tasks_in_progress'
  | 'evidence_collected'
  | 'indicators_registered'
  | 'results_validated'
  | 'contacts_registered'
  | 'opportunities_identified'
  | 'areas_prioritized'
  | 'responsibles_defined'
  | 'next_area_started';

export function getProjectDefaults(context: AutomationContext): ProjectDefaults {
  const { clientId, clientName, currentPhase } = context;
  
  let name = `Projeto Onboarding - ${clientName}`;
  let objective = 'Projeto inicial de consultoria para diagnóstico e identificação de oportunidades';
  let phase = 'Diagnóstico';
  
  if (currentPhase === 'definition' || currentPhase === 'execution') {
    name = `Projeto ${clientName}`;
    objective = 'Projeto de implementação de melhorias identificadas';
    phase = 'Diagnóstico';
  }
  
  return {
    clientId,
    clientName,
    name,
    objective,
    phase,
  };
}

export function getDiagnosticDefaults(
  context: AutomationContext,
  type: 'kickoff' | 'specific',
  templates: DiagnosticTemplate[],
  projects: Project[]
): DiagnosticDefaults {
  const { clientId, clientName, projectId, projectName } = context;
  
  // Find appropriate template
  let template: DiagnosticTemplate | undefined;
  let diagnosticName = '';
  
  if (type === 'kickoff') {
    template = templates.find(t => 
      t.name.toLowerCase().includes('kickoff') || 
      t.name.toLowerCase().includes('kick-off')
    );
    diagnosticName = `Kickoff JoIA - ${clientName}`;
  } else {
    // For specific diagnostics, try to match project name to template
    const project = projects.find(p => p.id === projectId);
    const projectArea = project?.name?.toLowerCase() || '';
    
    if (projectArea.includes('compras')) {
      template = templates.find(t => t.name.toLowerCase().includes('compras'));
      diagnosticName = `Diagnóstico Compras - ${clientName}`;
    } else if (projectArea.includes('vendas')) {
      template = templates.find(t => t.name.toLowerCase().includes('vendas'));
      diagnosticName = `Diagnóstico Vendas - ${clientName}`;
    } else if (projectArea.includes('financeiro')) {
      template = templates.find(t => t.name.toLowerCase().includes('financeiro'));
      diagnosticName = `Diagnóstico Financeiro - ${clientName}`;
    } else {
      diagnosticName = `Diagnóstico - ${clientName}`;
    }
  }
  
  // Find first project if not specified
  const targetProjectId = projectId || projects[0]?.id;
  const targetProjectName = projectName || projects[0]?.name;
  
  return {
    projectId: targetProjectId,
    projectName: targetProjectName,
    clientId,
    clientName,
    templateId: template?.id,
    templateName: template?.name,
    name: diagnosticName,
  };
}

export function getMeetingDefaults(
  context: AutomationContext,
  purpose: 'assessment' | 'validation' | 'followup' | 'kickoff'
): MeetingDefaults {
  const { clientId, clientName, projectId, projectName } = context;
  
  const purposes = {
    assessment: {
      title: `Apresentação Assessment - ${clientName}`,
      agenda: `- Apresentar resultados do diagnóstico Kickoff\n- Discutir oportunidades identificadas\n- Alinhar prioridades com o cliente\n- Definir próximos passos`,
    },
    validation: {
      title: `Validação de Resultados - ${clientName}`,
      agenda: `- Apresentar indicadores e resultados alcançados\n- Validar entrega das ações\n- Discutir próximas áreas ou conclusão`,
    },
    followup: {
      title: `Follow-up - ${clientName}`,
      agenda: `- Status das tarefas em andamento\n- Discussão de impedimentos\n- Alinhamento de próximos passos`,
    },
    kickoff: {
      title: `Reunião de Kickoff - ${clientName}`,
      agenda: `- Apresentação da equipe\n- Alinhamento de expectativas\n- Início do diagnóstico Kickoff`,
    },
  };
  
  return {
    projectId,
    projectName,
    clientId,
    clientName,
    title: purposes[purpose].title,
    agenda: purposes[purpose].agenda,
    type: 'online',
  };
}

export function getTaskDefaults(
  context: AutomationContext,
  taskType: 'implementation' | 'evidence' | 'indicator'
): TaskDefaults {
  const { clientId, clientName, projectId, projectName } = context;
  
  const taskTypes = {
    implementation: {
      title: `Implementar ação - ${clientName}`,
      description: 'Executar ação do plano de ação conforme definido',
      type: 'acao',
    },
    evidence: {
      title: `Coletar evidência - ${clientName}`,
      description: 'Documentar e coletar evidências da ação realizada',
      type: 'evidencia',
    },
    indicator: {
      title: `Registrar indicador - ${clientName}`,
      description: 'Medir e registrar indicador de resultado',
      type: 'indicador',
    },
  };
  
  return {
    projectId,
    projectName,
    clientId,
    clientName,
    title: taskTypes[taskType].title,
    description: taskTypes[taskType].description,
    priority: 'media',
    type: taskTypes[taskType].type,
  };
}

export function getDialogTypeForAction(actionId: string): 
  | 'project'
  | 'diagnostic'
  | 'meeting'
  | 'task'
  | 'navigate'
  | 'client'
  | null 
{
  const dialogMap: Record<string, 'project' | 'diagnostic' | 'meeting' | 'task' | 'navigate' | 'client'> = {
    project_created: 'project',
    specific_projects_created: 'project',
    kickoff_started: 'diagnostic',
    kickoff_completed: 'diagnostic',
    specific_diagnostic: 'diagnostic',
    assessment_presented: 'meeting',
    results_validated: 'meeting',
    tasks_in_progress: 'task',
    action_plan: 'navigate',
    evidence_collected: 'navigate',
    indicators_registered: 'navigate',
    contacts_registered: 'client',
    opportunities_identified: 'navigate',
    areas_prioritized: 'navigate',
    responsibles_defined: 'navigate',
    next_area_started: 'project',
  };
  
  return dialogMap[actionId] || null;
}

export function getNavigationRoute(actionId: string, clientId: string): string {
  const routes: Record<string, string> = {
    action_plan: `/plano-acao?clientId=${clientId}`,
    evidence_collected: `/documentos?clientId=${clientId}`,
    indicators_registered: `/indicadores?clientId=${clientId}`,
    opportunities_identified: `/diagnostico?clientId=${clientId}`,
    areas_prioritized: `/projetos?clientId=${clientId}`,
    responsibles_defined: `/projetos?clientId=${clientId}`,
  };
  
  return routes[actionId] || '/';
}
