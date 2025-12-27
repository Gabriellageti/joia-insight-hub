-- Tabela principal de templates de diagnóstico
CREATE TABLE public.diagnostic_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description jsonb NULL, -- Armazena description, tags, status, version, estimatedTimeMinutes
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para templates
CREATE INDEX idx_diagnostic_templates_name ON public.diagnostic_templates(name);
CREATE INDEX idx_diagnostic_templates_updated_at ON public.diagnostic_templates(updated_at DESC);

-- Enable RLS
ALTER TABLE public.diagnostic_templates ENABLE ROW LEVEL SECURITY;

-- Policies para templates (todos autenticados podem ver/editar)
CREATE POLICY "Authenticated users can view templates" 
ON public.diagnostic_templates FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert templates" 
ON public.diagnostic_templates FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates" 
ON public.diagnostic_templates FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete templates" 
ON public.diagnostic_templates FOR DELETE 
USING (true);

-- Tabela de seções do template
CREATE TABLE public.template_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  position integer NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 1,
  audit jsonb NULL, -- Armazena updatedAt e outras informações de auditoria
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para seções
CREATE INDEX idx_template_sections_template_id ON public.template_sections(template_id);
CREATE INDEX idx_template_sections_position ON public.template_sections(template_id, position);

-- Enable RLS
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;

-- Policies para seções
CREATE POLICY "Authenticated users can view sections" 
ON public.template_sections FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert sections" 
ON public.template_sections FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sections" 
ON public.template_sections FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete sections" 
ON public.template_sections FOR DELETE 
USING (true);

-- Tabela de perguntas do template
CREATE TABLE public.template_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.template_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  type text NOT NULL DEFAULT 'yes_no', -- yes_no, text, number, select, multi_select, date, scale
  position integer NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 1,
  criticality text NULL DEFAULT 'media', -- baixa, media, alta
  required boolean NOT NULL DEFAULT false,
  helper_text text NULL,
  options jsonb NULL, -- Para select/multi_select: array de {value, label, score?}
  min_value numeric NULL, -- Para number/scale
  max_value numeric NULL, -- Para number/scale
  audit jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para perguntas
CREATE INDEX idx_template_questions_template_id ON public.template_questions(template_id);
CREATE INDEX idx_template_questions_section_id ON public.template_questions(section_id);
CREATE INDEX idx_template_questions_position ON public.template_questions(section_id, position);

-- Enable RLS
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;

-- Policies para perguntas
CREATE POLICY "Authenticated users can view questions" 
ON public.template_questions FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert questions" 
ON public.template_questions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update questions" 
ON public.template_questions FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete questions" 
ON public.template_questions FOR DELETE 
USING (true);

-- Tabela de regras de oportunidade (vinculadas a perguntas)
CREATE TABLE public.template_opportunity_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.template_questions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  type text NULL, -- Tipo da oportunidade: Eficiência operacional, Receita incremental, etc.
  estimated_value numeric NULL,
  confidence text NULL DEFAULT 'media', -- baixa, media, alta
  evidence_type text NULL DEFAULT 'a_coletar',
  enabled boolean NOT NULL DEFAULT true,
  auto_generate boolean NOT NULL DEFAULT true,
  condition jsonb NOT NULL, -- {type: 'yes_no', expectedAnswer: 'no'} ou {type: 'always'}
  audit jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para regras
CREATE INDEX idx_template_opportunity_rules_template_id ON public.template_opportunity_rules(template_id);
CREATE INDEX idx_template_opportunity_rules_question_id ON public.template_opportunity_rules(question_id);

-- Enable RLS
ALTER TABLE public.template_opportunity_rules ENABLE ROW LEVEL SECURITY;

-- Policies para regras
CREATE POLICY "Authenticated users can view rules" 
ON public.template_opportunity_rules FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert rules" 
ON public.template_opportunity_rules FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rules" 
ON public.template_opportunity_rules FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete rules" 
ON public.template_opportunity_rules FOR DELETE 
USING (true);

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_diagnostic_templates_updated_at
BEFORE UPDATE ON public.diagnostic_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_sections_updated_at
BEFORE UPDATE ON public.template_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_questions_updated_at
BEFORE UPDATE ON public.template_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_opportunity_rules_updated_at
BEFORE UPDATE ON public.template_opportunity_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE public.diagnostic_templates IS 'Templates de diagnóstico reutilizáveis';
COMMENT ON TABLE public.template_sections IS 'Seções dentro de um template de diagnóstico';
COMMENT ON TABLE public.template_questions IS 'Perguntas dentro de uma seção do template';
COMMENT ON TABLE public.template_opportunity_rules IS 'Regras para gerar oportunidades automaticamente baseado em respostas';