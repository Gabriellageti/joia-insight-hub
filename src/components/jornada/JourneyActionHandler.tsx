import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Project, Diagnostic, DiagnosticTemplate } from '@/types';
import { JourneyPhase, JourneyEventType, CreateJourneyEventInput } from '@/integrations/supabase/journey-events';
import {
  AutomationContext,
  getProjectDefaults,
  getDiagnosticDefaults,
  getMeetingDefaults,
  getDialogTypeForAction,
  getNavigationRoute,
  ProjectDefaults,
  DiagnosticDefaults,
  MeetingDefaults,
} from '@/lib/journey-automation';
import { ProjectDialog } from '@/components/dialogs/ProjectDialog';
import { DiagnosticDialog } from '@/components/dialogs/DiagnosticDialog';
import { MeetingDialog } from '@/components/dialogs/MeetingDialog';
import { ClientDialog } from '@/components/dialogs/ClientDialog';

interface JourneyActionHandlerProps {
  client: Client;
  projects: Project[];
  diagnostics: Diagnostic[];
  templates: DiagnosticTemplate[];
  currentPhase: JourneyPhase;
  onEventRegistered: (input: Omit<CreateJourneyEventInput, 'client_id'>) => Promise<void>;
  onDataRefresh: () => void;
}

export function useJourneyActionHandler({
  client,
  projects,
  diagnostics,
  templates,
  currentPhase,
  onEventRegistered,
  onDataRefresh,
}: JourneyActionHandlerProps) {
  const navigate = useNavigate();
  
  // Dialog states
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [diagnosticDialogOpen, setDiagnosticDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  
  // Pre-filled data states
  const [projectDefaults, setProjectDefaults] = useState<ProjectDefaults | null>(null);
  const [diagnosticDefaults, setDiagnosticDefaults] = useState<DiagnosticDefaults | null>(null);
  const [meetingDefaults, setMeetingDefaults] = useState<MeetingDefaults | null>(null);
  
  // Track action context for event registration
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  
  const getContext = useCallback((): AutomationContext => {
    const clientName = client.nomeFantasia || client.razaoSocial || client.name || 'Cliente';
    const lastProject = projects[projects.length - 1];
    const lastDiagnostic = diagnostics[diagnostics.length - 1];
    
    return {
      clientId: client.id,
      clientName,
      projectId: lastProject?.id,
      projectName: lastProject?.name,
      currentPhase,
      lastDiagnostic,
    };
  }, [client, projects, diagnostics, currentPhase]);

  // Register journey event based on action
  const registerJourneyEvent = useCallback(async (
    actionId: string,
    entityType: 'project' | 'diagnostic' | 'meeting' | 'client',
    entityData: { id?: string; name?: string; templateName?: string; title?: string }
  ) => {
    const eventTypeMap: Record<string, JourneyEventType> = {
      project_created: 'project_created',
      specific_projects_created: 'project_created',
      next_area_started: 'project_created',
      kickoff_started: 'diagnostic_started',
      kickoff_completed: 'diagnostic_started',
      specific_diagnostic: 'diagnostic_started',
      assessment_presented: 'meeting_scheduled',
      results_validated: 'meeting_scheduled',
      contacts_registered: 'client_created', // Use client_created for contact updates
    };

    const eventType = eventTypeMap[actionId];
    if (!eventType) return;

    const eventTitles: Record<JourneyEventType, string> = {
      client_created: `Cliente atualizado: ${client.name || 'Cliente'}`,
      project_created: `Projeto criado: ${entityData.name || 'Novo projeto'}`,
      diagnostic_started: `Diagnóstico iniciado: ${entityData.templateName || entityData.name || 'Novo diagnóstico'}`,
      diagnostic_completed: 'Diagnóstico concluído',
      meeting_scheduled: `Reunião agendada: ${entityData.title || 'Nova reunião'}`,
      meeting_completed: 'Reunião realizada',
      task_created: 'Tarefa criada',
      task_completed: 'Tarefa concluída',
      evidence_uploaded: 'Evidência enviada',
      indicator_registered: 'Indicador registrado',
      phase_advanced: 'Fase avançada',
    };

    try {
      await onEventRegistered({
        event_type: eventType,
        event_title: eventTitles[eventType],
        event_description: `Ação realizada através da jornada do cliente`,
        phase: currentPhase,
        project_id: entityType === 'project' ? entityData.id : undefined,
        diagnostic_id: entityType === 'diagnostic' ? entityData.id : undefined,
        meeting_id: entityType === 'meeting' ? entityData.id : undefined,
      });
    } catch (error) {
      console.error('Failed to register journey event:', error);
    }
  }, [client.name, currentPhase, onEventRegistered]);

  const handleAction = useCallback((actionId: string) => {
    const dialogType = getDialogTypeForAction(actionId);
    const context = getContext();
    
    // Store action ID for event registration on success
    setCurrentActionId(actionId);
    
    switch (dialogType) {
      case 'project': {
        const defaults = getProjectDefaults(context);
        setProjectDefaults(defaults);
        setProjectDialogOpen(true);
        break;
      }
      
      case 'diagnostic': {
        const isKickoff = actionId === 'kickoff_started' || actionId === 'kickoff_completed';
        const defaults = getDiagnosticDefaults(
          context,
          isKickoff ? 'kickoff' : 'specific',
          templates,
          projects
        );
        setDiagnosticDefaults(defaults);
        setDiagnosticDialogOpen(true);
        break;
      }
      
      case 'meeting': {
        const purpose = actionId === 'assessment_presented' ? 'assessment' : 'validation';
        const defaults = getMeetingDefaults(context, purpose);
        setMeetingDefaults(defaults);
        setMeetingDialogOpen(true);
        break;
      }
      
      case 'client': {
        setClientDialogOpen(true);
        break;
      }
      
      case 'navigate': {
        const route = getNavigationRoute(actionId, client.id);
        navigate(route);
        break;
      }
      
      default:
        console.warn('Unknown action type:', actionId);
    }
  }, [getContext, templates, projects, client.id, navigate]);

  const handleDialogClose = useCallback(() => {
    setProjectDialogOpen(false);
    setDiagnosticDialogOpen(false);
    setMeetingDialogOpen(false);
    setClientDialogOpen(false);
    setProjectDefaults(null);
    setDiagnosticDefaults(null);
    setMeetingDefaults(null);
    setCurrentActionId(null);
    onDataRefresh();
  }, [onDataRefresh]);

  // Success handlers for each dialog type
  const handleProjectSuccess = useCallback((project: { id: string; name: string; clientId: string }) => {
    if (currentActionId) {
      registerJourneyEvent(currentActionId, 'project', { id: project.id, name: project.name });
    }
  }, [currentActionId, registerJourneyEvent]);

  const handleDiagnosticSuccess = useCallback((diagnostic: { id: string; name: string; templateName?: string }) => {
    if (currentActionId) {
      registerJourneyEvent(currentActionId, 'diagnostic', { 
        id: diagnostic.id, 
        name: diagnostic.name,
        templateName: diagnostic.templateName 
      });
    }
  }, [currentActionId, registerJourneyEvent]);

  const handleMeetingSuccess = useCallback((meeting: { id: string; title: string }) => {
    if (currentActionId) {
      registerJourneyEvent(currentActionId, 'meeting', { id: meeting.id, title: meeting.title });
    }
  }, [currentActionId, registerJourneyEvent]);

  const handleClientSuccess = useCallback(() => {
    if (currentActionId) {
      registerJourneyEvent(currentActionId, 'client', {});
    }
  }, [currentActionId, registerJourneyEvent]);

  // Create pre-filled project object for ProjectDialog (partial - dialog will handle defaults)
  const prefilledProject = projectDefaults ? {
    id: '',
    name: projectDefaults.name,
    clientId: projectDefaults.clientId,
    clientName: projectDefaults.clientName,
    objective: projectDefaults.objective,
    phase: projectDefaults.phase,
    status: 'green' as const,
    progress: 0,
    progressOverrideEnabled: false,
    manualProgress: 0,
    responsible: '',
    startDate: new Date().toISOString().split('T')[0],
    estimatedDurationWeeks: 4,
    forecastEndDate: '',
    endDate: '',
    createdAt: new Date().toISOString(),
  } : null;

  // Create pre-filled diagnostic object for DiagnosticDialog
  const prefilledDiagnostic = diagnosticDefaults ? {
    id: '',
    name: diagnosticDefaults.name,
    projectId: diagnosticDefaults.projectId,
    projectName: diagnosticDefaults.projectName,
    clientId: diagnosticDefaults.clientId,
    clientName: diagnosticDefaults.clientName,
    templateId: diagnosticDefaults.templateId,
    templateName: diagnosticDefaults.templateName,
    status: 'draft' as const,
    progress: 0,
    opportunities: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalQuestions: 0,
    answeredQuestions: 0,
  } : null;

  // Create pre-filled meeting object for MeetingDialog  
  const prefilledMeeting = meetingDefaults ? {
    id: '',
    title: meetingDefaults.title,
    projectId: meetingDefaults.projectId,
    projectName: meetingDefaults.projectName,
    clientId: meetingDefaults.clientId,
    clientName: meetingDefaults.clientName,
    agenda: meetingDefaults.agenda,
    status: 'scheduled' as const,
    date: new Date().toISOString(),
    time: '10:00',
    type: meetingDefaults.type,
    participants: [],
    duration: '60',
    location: '',
    hasMinutes: false,
    createdAt: new Date().toISOString(),
  } : null;

  const renderDialogs = () => (
    <>
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        project={prefilledProject}
        onSuccess={handleProjectSuccess}
      />
      
      <DiagnosticDialog
        open={diagnosticDialogOpen}
        onOpenChange={(open) => {
          setDiagnosticDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        diagnostic={prefilledDiagnostic}
        onSuccess={handleDiagnosticSuccess}
      />
      
      <MeetingDialog
        open={meetingDialogOpen}
        onOpenChange={(open) => {
          setMeetingDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        meeting={prefilledMeeting}
        onSuccess={handleMeetingSuccess}
      />
      
      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={(open) => {
          setClientDialogOpen(open);
          if (!open) {
            handleClientSuccess();
            handleDialogClose();
          }
        }}
        client={client}
      />
    </>
  );

  return {
    handleAction,
    renderDialogs,
  };
}
