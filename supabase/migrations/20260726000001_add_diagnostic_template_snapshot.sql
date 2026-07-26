-- Mantém o roteiro original de diagnósticos já aplicados, mesmo após alterações no template.
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS template_snapshot jsonb NULL;

COMMENT ON COLUMN public.diagnostics.template_snapshot IS 'Cópia do template usado na aplicação do diagnóstico';
