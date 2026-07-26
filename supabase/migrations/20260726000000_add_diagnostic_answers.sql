-- Preserva respostas para que um diagnóstico em andamento possa ser retomado.
ALTER TABLE public.diagnostics
ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.diagnostics.answers IS 'Respostas por pergunta, usadas para retomar a execução do diagnóstico';
