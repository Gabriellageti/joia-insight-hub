-- Adicionar colunas faltantes na tabela diagnostics para suportar o sistema de diagnósticos completo

-- Colunas de template
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS template_id uuid NULL,
ADD COLUMN IF NOT EXISTS template_name text NULL;

-- Colunas desnormalizadas para performance (nomes de cliente e projeto)
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS client_name text NULL,
ADD COLUMN IF NOT EXISTS project_name text NULL;

-- Colunas de progresso
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_questions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS answered_questions integer DEFAULT 0;

-- Colunas de responsável
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS responsible_id uuid NULL,
ADD COLUMN IF NOT EXISTS responsible_name text NULL;

-- Coluna de data alvo
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS due_date date NULL;

-- Contagem de oportunidades
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS opportunities_count integer DEFAULT 0;

-- Configuração de geração automática de oportunidades
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS auto_generate_opportunities boolean DEFAULT true;

-- Colunas de relatório e plano de ação (armazenadas como JSONB)
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS action_plan jsonb NULL,
ADD COLUMN IF NOT EXISTS report_payload jsonb NULL;

-- Adicionar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_diagnostics_template_id ON public.diagnostics(template_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_responsible_id ON public.diagnostics(responsible_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_status ON public.diagnostics(status);
CREATE INDEX IF NOT EXISTS idx_diagnostics_due_date ON public.diagnostics(due_date);

-- Comentários descritivos
COMMENT ON COLUMN public.diagnostics.template_id IS 'ID do template usado para criar este diagnóstico';
COMMENT ON COLUMN public.diagnostics.template_name IS 'Nome do template (desnormalizado para performance)';
COMMENT ON COLUMN public.diagnostics.client_name IS 'Nome do cliente (desnormalizado para performance)';
COMMENT ON COLUMN public.diagnostics.project_name IS 'Nome do projeto (desnormalizado para performance)';
COMMENT ON COLUMN public.diagnostics.progress IS 'Porcentagem de progresso do diagnóstico (0-100)';
COMMENT ON COLUMN public.diagnostics.total_questions IS 'Total de perguntas do template';
COMMENT ON COLUMN public.diagnostics.answered_questions IS 'Número de perguntas respondidas';
COMMENT ON COLUMN public.diagnostics.responsible_id IS 'ID do usuário responsável pelo diagnóstico';
COMMENT ON COLUMN public.diagnostics.responsible_name IS 'Nome do responsável (desnormalizado para performance)';
COMMENT ON COLUMN public.diagnostics.due_date IS 'Data alvo para conclusão do diagnóstico';
COMMENT ON COLUMN public.diagnostics.opportunities_count IS 'Número de oportunidades identificadas';
COMMENT ON COLUMN public.diagnostics.auto_generate_opportunities IS 'Se deve gerar oportunidades automaticamente ao concluir';
COMMENT ON COLUMN public.diagnostics.action_plan IS 'Plano de ação gerado em formato JSON';
COMMENT ON COLUMN public.diagnostics.report_payload IS 'Payload do relatório gerado em formato JSON';