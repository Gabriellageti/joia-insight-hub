import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  fetchJourneyEvents, 
  createJourneyEvent, 
  JourneyEvent, 
  JourneyPhase, 
  JourneyEventType,
  CreateJourneyEventInput 
} from '@/integrations/supabase/journey-events';
import { useData } from '@/contexts/DataContext';

export interface PhaseChecklist {
  id: string;
  label: string;
  completed: boolean;
  eventType?: JourneyEventType;
}

export interface PhaseInfo {
  id: JourneyPhase;
  name: string;
  description: string;
  checklist: PhaseChecklist[];
  progress: number;
}

export function useClientJourney(clientId: string | undefined) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { projects, diagnostics, tasks, meetings, clients } = useData();

  const client = useMemo(() => 
    clients.find(c => c.id === clientId),
    [clients, clientId]
  );

  const clientProjects = useMemo(() => 
    projects.filter(p => p.clientId === clientId),
    [projects, clientId]
  );

  const clientDiagnostics = useMemo(() => 
    diagnostics.filter(d => d.clientId === clientId),
    [diagnostics, clientId]
  );

  const clientTasks = useMemo(() => 
    tasks.filter(t => t.clientId === clientId),
    [tasks, clientId]
  );

  const clientMeetings = useMemo(() => 
    meetings.filter(m => m.clientId === clientId),
    [meetings, clientId]
  );

  const loadEvents = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      const data = await fetchJourneyEvents(clientId);
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const registerEvent = useCallback(async (input: Omit<CreateJourneyEventInput, 'client_id'>) => {
    if (!clientId) throw new Error('Client ID is required');
    
    const event = await createJourneyEvent({
      ...input,
      client_id: clientId,
    });
    
    setEvents(prev => [...prev, event]);
    return event;
  }, [clientId]);

  // Calculate current phase based on events and data
  const currentPhase = useMemo((): JourneyPhase => {
    // Check if we have completed validation events
    const hasValidationEvents = events.some(e => e.phase === 'validation');
    if (hasValidationEvents) return 'validation';

    // Check if we have execution events (specific diagnostics, tasks in progress)
    const hasExecutionEvents = events.some(e => e.phase === 'execution');
    const hasSpecificDiagnostics = clientDiagnostics.some(d => 
      d.templateName && !d.templateName.toLowerCase().includes('kickoff')
    );
    if (hasExecutionEvents || hasSpecificDiagnostics) return 'execution';

    // Check if we have definition events (projects created after kickoff)
    const hasDefinitionEvents = events.some(e => e.phase === 'definition');
    const hasCompletedKickoff = clientDiagnostics.some(d => 
      d.templateName?.toLowerCase().includes('kickoff') && d.status === 'completed'
    );
    if (hasDefinitionEvents || hasCompletedKickoff) return 'definition';

    return 'onboarding';
  }, [events, clientDiagnostics]);

  // Build phase info with checklists
  const phases = useMemo((): PhaseInfo[] => {
    const hasKickoffStarted = clientDiagnostics.some(d => 
      d.templateName?.toLowerCase().includes('kickoff')
    );
    const hasKickoffCompleted = clientDiagnostics.some(d => 
      d.templateName?.toLowerCase().includes('kickoff') && d.status === 'completed'
    );
    const hasProjects = clientProjects.length > 0;
    const hasContacts = client?.contatoPrincipal?.nome || client?.contatoPrincipal?.email || client?.primaryContactName || client?.primaryContactEmail;
    const hasMeetings = clientMeetings.length > 0;
    const assessmentPresented = events.some(e => e.event_type === 'meeting_completed' && e.phase === 'onboarding');

    const onboardingChecklist: PhaseChecklist[] = [
      { id: 'client_created', label: 'Cliente cadastrado', completed: !!client },
      { id: 'contacts_registered', label: 'Contatos registrados', completed: !!hasContacts },
      { id: 'project_created', label: 'Projeto inicial criado', completed: hasProjects },
      { id: 'kickoff_started', label: 'Kickoff iniciado', completed: hasKickoffStarted },
      { id: 'kickoff_completed', label: 'Kickoff concluído', completed: hasKickoffCompleted },
      { id: 'assessment_presented', label: 'Assessment apresentado', completed: assessmentPresented },
    ];

    const hasSpecificProjects = clientProjects.some(p => 
      p.name.toLowerCase().includes('compras') || 
      p.name.toLowerCase().includes('vendas') ||
      p.name.toLowerCase().includes('financeiro')
    );

    const definitionChecklist: PhaseChecklist[] = [
      { id: 'areas_prioritized', label: 'Áreas priorizadas', completed: hasSpecificProjects },
      { id: 'specific_projects_created', label: 'Projetos específicos criados', completed: hasSpecificProjects },
      { id: 'responsibles_defined', label: 'Responsáveis definidos', completed: clientProjects.some(p => p.responsible) },
    ];

    const hasSpecificDiagnostics = clientDiagnostics.some(d => 
      !d.templateName?.toLowerCase().includes('kickoff') && d.status === 'completed'
    );
    const hasActionPlan = clientTasks.length > 0;
    const hasCompletedTasks = clientTasks.some(t => t.status === 'done');
    const hasEvidence = events.some(e => e.event_type === 'evidence_uploaded');

    const executionChecklist: PhaseChecklist[] = [
      { id: 'specific_diagnostic', label: 'Diagnóstico específico executado', completed: hasSpecificDiagnostics },
      { id: 'action_plan', label: 'Plano de ação gerado', completed: hasActionPlan },
      { id: 'tasks_in_progress', label: 'Tarefas em andamento', completed: hasCompletedTasks },
      { id: 'evidence_collected', label: 'Evidências coletadas', completed: hasEvidence },
    ];

    const hasIndicators = events.some(e => e.event_type === 'indicator_registered');
    const hasValidationMeeting = events.some(e => 
      e.event_type === 'meeting_completed' && e.phase === 'validation'
    );

    const validationChecklist: PhaseChecklist[] = [
      { id: 'indicators_registered', label: 'Indicadores registrados', completed: hasIndicators },
      { id: 'results_validated', label: 'Resultados validados com cliente', completed: hasValidationMeeting },
      { id: 'next_area_started', label: 'Próxima área iniciada ou projeto concluído', completed: false },
    ];

    const calculateProgress = (checklist: PhaseChecklist[]) => {
      const completed = checklist.filter(item => item.completed).length;
      return Math.round((completed / checklist.length) * 100);
    };

    return [
      {
        id: 'onboarding' as JourneyPhase,
        name: 'Onboarding',
        description: 'Cadastro do cliente, projeto inicial e Kickoff',
        checklist: onboardingChecklist,
        progress: calculateProgress(onboardingChecklist),
      },
      {
        id: 'definition' as JourneyPhase,
        name: 'Definição',
        description: 'Priorização de áreas e criação de projetos específicos',
        checklist: definitionChecklist,
        progress: calculateProgress(definitionChecklist),
      },
      {
        id: 'execution' as JourneyPhase,
        name: 'Execução',
        description: 'Diagnósticos específicos, plano de ação e coleta de evidências',
        checklist: executionChecklist,
        progress: calculateProgress(executionChecklist),
      },
      {
        id: 'validation' as JourneyPhase,
        name: 'Validação',
        description: 'Registro de indicadores e validação de resultados',
        checklist: validationChecklist,
        progress: calculateProgress(validationChecklist),
      },
    ];
  }, [client, clientProjects, clientDiagnostics, clientTasks, clientMeetings, events]);

  // Calculate suggested next actions
  const suggestedActions = useMemo(() => {
    const actions: { id: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }[] = [];
    const currentPhaseInfo = phases.find(p => p.id === currentPhase);

    if (!currentPhaseInfo) return actions;

    // Find incomplete items in current phase
    const incompleteItems = currentPhaseInfo.checklist.filter(item => !item.completed);
    
    for (const item of incompleteItems.slice(0, 3)) {
      actions.push({
        id: item.id,
        title: item.label,
        description: getActionDescription(item.id),
        priority: incompleteItems.indexOf(item) === 0 ? 'high' : 'medium',
      });
    }

    return actions;
  }, [phases, currentPhase]);

  const overallProgress = useMemo(() => {
    const phaseIndex = phases.findIndex(p => p.id === currentPhase);
    const phasesCompleted = phaseIndex;
    const currentPhaseProgress = phases[phaseIndex]?.progress || 0;
    
    return Math.round(((phasesCompleted * 100) + currentPhaseProgress) / phases.length);
  }, [phases, currentPhase]);

  return {
    events,
    loading,
    error,
    currentPhase,
    phases,
    suggestedActions,
    overallProgress,
    registerEvent,
    refresh: loadEvents,
  };
}

function getActionDescription(itemId: string): string {
  const descriptions: Record<string, string> = {
    client_created: 'Complete o cadastro do cliente com todas as informações necessárias',
    contacts_registered: 'Adicione os contatos principais do cliente',
    project_created: 'Crie o projeto inicial para iniciar o trabalho',
    kickoff_started: 'Inicie o diagnóstico de Kickoff para conhecer a empresa',
    kickoff_completed: 'Finalize o diagnóstico de Kickoff',
    assessment_presented: 'Agende uma reunião para apresentar o assessment ao cliente',
    areas_prioritized: 'Defina com o cliente quais áreas atacar primeiro',
    specific_projects_created: 'Crie projetos específicos para cada área priorizada',
    responsibles_defined: 'Defina os responsáveis por cada projeto',
    specific_diagnostic: 'Execute o diagnóstico específico da área',
    action_plan: 'Gere o plano de ação a partir do diagnóstico',
    tasks_in_progress: 'Execute as tarefas do plano de ação',
    evidence_collected: 'Colete e documente as evidências das ações realizadas',
    indicators_registered: 'Registre os indicadores de resultado',
    results_validated: 'Valide os resultados com o cliente',
    next_area_started: 'Inicie a próxima área ou conclua o projeto',
  };

  return descriptions[itemId] || 'Complete esta etapa para avançar na jornada';
}
