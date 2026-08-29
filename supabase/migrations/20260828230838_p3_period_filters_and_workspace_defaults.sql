BEGIN;

ALTER FUNCTION public.get_operations_dashboard(uuid, integer, uuid, uuid)
RENAME TO get_operations_dashboard_base;

REVOKE ALL ON FUNCTION public.get_operations_dashboard_base(uuid, integer, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_operations_dashboard_base(uuid, integer, uuid, uuid) TO authenticated;

CREATE FUNCTION public.get_operations_dashboard(
  _workspace_id uuid DEFAULT NULL,
  _period_days integer DEFAULT 30,
  _client_id uuid DEFAULT NULL,
  _responsible_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_workspace uuid := COALESCE(_workspace_id, private.current_workspace_id());
  actor uuid := auth.uid();
  period_days integer := LEAST(GREATEST(_period_days, 7), 365);
  personal_scope boolean;
  result jsonb;
  summary jsonb;
BEGIN
  IF actor IS NULL OR COALESCE(private.workspace_access_level(target_workspace), 0) < 1 THEN
    RAISE EXCEPTION 'workspace access denied' USING ERRCODE = '42501';
  END IF;
  personal_scope := private.workspace_access_level(target_workspace) < 3;
  result := public.get_operations_dashboard_base(target_workspace, period_days, _client_id, _responsible_id);

  WITH scoped_tasks AS (
    SELECT t.* FROM public.tasks t
    WHERE t.workspace_id = target_workspace
      AND (NOT personal_scope OR t.assigned_to = actor)
      AND (_client_id IS NULL OR t.client_id = _client_id)
      AND (_responsible_id IS NULL OR t.assigned_to = _responsible_id)
  ), scoped_meetings AS (
    SELECT m.* FROM public.meetings m
    WHERE m.workspace_id = target_workspace
      AND (NOT personal_scope OR m.responsible_user_id = actor)
      AND (_client_id IS NULL OR m.client_id = _client_id)
      AND (_responsible_id IS NULL OR m.responsible_user_id = _responsible_id)
  )
  SELECT jsonb_build_object(
    'completedTasks', (SELECT count(*) FROM scoped_tasks WHERE status = 'done' AND completed_at >= now() - make_interval(days => period_days)),
    'createdTasks', (SELECT count(*) FROM scoped_tasks WHERE created_at >= now() - make_interval(days => period_days)),
    'newBlocks', (SELECT count(*) FROM scoped_tasks WHERE blocked_at >= now() - make_interval(days => period_days)),
    'completedMeetings', (SELECT count(*) FROM scoped_meetings WHERE status = 'Realizada' AND ended_at >= now() - make_interval(days => period_days))
  ) INTO summary;

  RETURN jsonb_set(result, '{weekly}', summary, true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_operations_dashboard(uuid, integer, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_operations_dashboard(uuid, integer, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.seed_workspace_operational_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.workspace_operational_settings (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.seed_workspace_operational_settings() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER seed_workspace_operational_settings
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION private.seed_workspace_operational_settings();

COMMIT;
