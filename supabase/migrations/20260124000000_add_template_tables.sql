-- Diagnostic templates tables

CREATE TABLE public.diagnostic_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnostic_templates ENABLE ROW LEVEL SECURITY;

-- Sections that belong to a diagnostic template
CREATE TABLE public.template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_template_sections_template_id ON public.template_sections(template_id);

-- Questions that belong to a section and template
CREATE TABLE public.template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.template_sections(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  metadata JSONB,
  conditions JSONB,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT template_questions_type_check CHECK (question_type IN ('text', 'number', 'select', 'boolean', 'rating', 'date'))
);
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_template_questions_template_id ON public.template_questions(template_id);
CREATE INDEX idx_template_questions_section_id ON public.template_questions(section_id);

-- Opportunity rules linked to template questions
CREATE TABLE public.template_opportunity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.template_sections(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.template_questions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rule_conditions JSONB NOT NULL,
  actions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.template_opportunity_rules ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_template_opportunity_rules_template_id ON public.template_opportunity_rules(template_id);
CREATE INDEX idx_template_opportunity_rules_section_id ON public.template_opportunity_rules(section_id);

-- Updated_at triggers
CREATE TRIGGER update_diagnostic_templates_updated_at BEFORE UPDATE ON public.diagnostic_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_template_sections_updated_at BEFORE UPDATE ON public.template_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_template_questions_updated_at BEFORE UPDATE ON public.template_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_template_opportunity_rules_updated_at BEFORE UPDATE ON public.template_opportunity_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies (allow authenticated CRUD similar to existing tables)
CREATE POLICY "Authenticated users can view diagnostic templates" ON public.diagnostic_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert diagnostic templates" ON public.diagnostic_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update diagnostic templates" ON public.diagnostic_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete diagnostic templates" ON public.diagnostic_templates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view template sections" ON public.template_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert template sections" ON public.template_sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update template sections" ON public.template_sections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete template sections" ON public.template_sections FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view template questions" ON public.template_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert template questions" ON public.template_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update template questions" ON public.template_questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete template questions" ON public.template_questions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view template opportunity rules" ON public.template_opportunity_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert template opportunity rules" ON public.template_opportunity_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update template opportunity rules" ON public.template_opportunity_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete template opportunity rules" ON public.template_opportunity_rules FOR DELETE TO authenticated USING (true);
