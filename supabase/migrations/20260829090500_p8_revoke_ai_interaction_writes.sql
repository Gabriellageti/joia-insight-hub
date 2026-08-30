BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.ai_interactions FROM authenticated;
GRANT SELECT ON public.ai_interactions TO authenticated;
REVOKE ALL ON public.ai_interactions FROM anon;

COMMIT;
