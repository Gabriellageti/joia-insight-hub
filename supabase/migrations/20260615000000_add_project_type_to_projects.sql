ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'consulting';

UPDATE public.projects
SET project_type = 'consulting'
WHERE project_type IS NULL;

COMMENT ON COLUMN public.projects.project_type IS 'Classifica projetos entre consultoria, sites, sistemas, IA, automações e outros tipos de entrega.';
