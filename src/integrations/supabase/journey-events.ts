import { supabase } from "./client";
import type { Json } from "./types";

export type JourneyEventType = 
  | 'client_created'
  | 'project_created'
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'task_created'
  | 'task_completed'
  | 'evidence_uploaded'
  | 'indicator_registered'
  | 'phase_advanced';

export type JourneyPhase = 'onboarding' | 'definition' | 'execution' | 'validation';

export interface JourneyEvent {
  id: string;
  client_id: string;
  project_id?: string | null;
  diagnostic_id?: string | null;
  task_id?: string | null;
  meeting_id?: string | null;
  document_id?: string | null;
  event_type: JourneyEventType;
  event_title: string;
  event_description?: string | null;
  phase: JourneyPhase;
  metadata?: Json;
  created_at: string;
  created_by?: string | null;
}

export interface CreateJourneyEventInput {
  client_id: string;
  project_id?: string | null;
  diagnostic_id?: string | null;
  task_id?: string | null;
  meeting_id?: string | null;
  document_id?: string | null;
  event_type: JourneyEventType;
  event_title: string;
  event_description?: string | null;
  phase: JourneyPhase;
  metadata?: Json;
  created_by?: string | null;
}

export async function fetchJourneyEvents(clientId: string): Promise<JourneyEvent[]> {
  const { data, error } = await supabase
    .from('client_journey_events')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching journey events:', error);
    throw error;
  }

  return (data || []) as JourneyEvent[];
}

export async function createJourneyEvent(input: CreateJourneyEventInput): Promise<JourneyEvent> {
  const insertData = {
    client_id: input.client_id,
    project_id: input.project_id,
    diagnostic_id: input.diagnostic_id,
    task_id: input.task_id,
    meeting_id: input.meeting_id,
    document_id: input.document_id,
    event_type: input.event_type,
    event_title: input.event_title,
    event_description: input.event_description,
    phase: input.phase,
    metadata: input.metadata || {},
    created_by: input.created_by,
  };

  const { data, error } = await supabase
    .from('client_journey_events')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error('Error creating journey event:', error);
    throw error;
  }

  return data as JourneyEvent;
}

export async function deleteJourneyEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_journey_events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting journey event:', error);
    throw error;
  }
}

export async function fetchAllClientsJourneyStats(): Promise<{
  clientId: string;
  phase: JourneyPhase;
  eventCount: number;
  lastEventAt: string;
}[]> {
  const { data, error } = await supabase
    .from('client_journey_events')
    .select('client_id, phase, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching journey stats:', error);
    throw error;
  }

  // Group by client and get their latest phase
  const clientStats = new Map<string, { phase: JourneyPhase; eventCount: number; lastEventAt: string }>();
  
  for (const event of data || []) {
    const existing = clientStats.get(event.client_id);
    if (!existing) {
      clientStats.set(event.client_id, {
        phase: event.phase as JourneyPhase,
        eventCount: 1,
        lastEventAt: event.created_at,
      });
    } else {
      existing.eventCount++;
    }
  }

  return Array.from(clientStats.entries()).map(([clientId, stats]) => ({
    clientId,
    ...stats,
  }));
}
