-- Create client_journey_events table to track the journey of each client through the consulting methodology
CREATE TABLE public.client_journey_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  phase TEXT NOT NULL DEFAULT 'onboarding',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create index for faster queries by client
CREATE INDEX idx_client_journey_events_client_id ON public.client_journey_events(client_id);
CREATE INDEX idx_client_journey_events_phase ON public.client_journey_events(phase);
CREATE INDEX idx_client_journey_events_event_type ON public.client_journey_events(event_type);
CREATE INDEX idx_client_journey_events_created_at ON public.client_journey_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.client_journey_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all journey events" 
ON public.client_journey_events 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create journey events" 
ON public.client_journey_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update journey events" 
ON public.client_journey_events 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete journey events" 
ON public.client_journey_events 
FOR DELETE 
USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.client_journey_events IS 'Tracks all events in the client consulting journey following the JoIA methodology';
COMMENT ON COLUMN public.client_journey_events.event_type IS 'Type of event: client_created, project_created, diagnostic_started, diagnostic_completed, meeting_scheduled, meeting_completed, task_created, task_completed, evidence_uploaded, indicator_registered, phase_advanced';
COMMENT ON COLUMN public.client_journey_events.phase IS 'Current phase: onboarding, definition, execution, validation';