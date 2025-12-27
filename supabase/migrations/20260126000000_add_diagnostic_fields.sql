-- Extend diagnostics to store full execution metadata
ALTER TABLE public.diagnostics
  ADD COLUMN template_id UUID REFERENCES public.diagnostic_templates(id) ON DELETE SET NULL,
  ADD COLUMN template_name TEXT,
  ADD COLUMN project_name TEXT,
  ADD COLUMN client_name TEXT,
  ADD COLUMN progress INTEGER DEFAULT 0,
  ADD COLUMN total_questions INTEGER DEFAULT 0,
  ADD COLUMN answered_questions INTEGER DEFAULT 0,
  ADD COLUMN opportunities_count INTEGER DEFAULT 0,
  ADD COLUMN auto_generate_opportunities BOOLEAN DEFAULT true,
  ADD COLUMN responsible_name TEXT,
  ADD COLUMN responsible_id UUID,
  ADD COLUMN due_date DATE,
  ADD COLUMN action_plan JSONB,
  ADD COLUMN report_payload JSONB;
