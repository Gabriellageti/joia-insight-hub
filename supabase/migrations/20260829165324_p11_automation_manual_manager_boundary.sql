BEGIN;

CREATE OR REPLACE FUNCTION public.run_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  workspace_id uuid := private.current_workspace_id();
BEGIN
  IF actor_id IS NULL
     OR workspace_id IS NULL
     OR COALESCE(private.workspace_access_level(workspace_id), 0) < 3 THEN
    RAISE EXCEPTION 'manager access required' USING ERRCODE = '42501';
  END IF;
  RETURN private.run_scheduled_automations_for_workspace(workspace_id, actor_id, 'manual');
END;
$$;

REVOKE ALL ON FUNCTION public.run_scheduled_automations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_scheduled_automations() TO authenticated;

COMMIT;
