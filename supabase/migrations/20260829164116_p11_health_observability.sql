-- P11: expose only a non-sensitive component heartbeat for external health checks.
BEGIN;

CREATE TABLE public.system_health_components (
  component text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unknown')),
  checked_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.system_health_components ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_health_components FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.system_health_components TO anon, authenticated;

CREATE POLICY system_health_public_read
  ON public.system_health_components FOR SELECT TO anon, authenticated
  USING (true);

INSERT INTO public.system_health_components(component, status, checked_at, details)
VALUES ('automation-scheduler', 'unknown', now(), '{}'::jsonb)
ON CONFLICT (component) DO NOTHING;

CREATE OR REPLACE FUNCTION private.run_all_scheduled_automations_with_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  runner_result jsonb;
  failed_count integer;
BEGIN
  BEGIN
    runner_result := private.run_all_scheduled_automations();
    failed_count := COALESCE((runner_result ->> 'failed_workspaces')::integer, 0);
    INSERT INTO public.system_health_components(component, status, checked_at, details)
    VALUES (
      'automation-scheduler',
      CASE WHEN failed_count = 0 THEN 'healthy' ELSE 'degraded' END,
      now(),
      jsonb_build_object(
        'processed_workspaces', COALESCE((runner_result ->> 'processed_workspaces')::integer, 0),
        'failed_workspaces', failed_count,
        'skipped_workspaces', COALESCE((runner_result ->> 'skipped_workspaces')::integer, 0)
      )
    ) ON CONFLICT (component) DO UPDATE SET
      status = EXCLUDED.status,
      checked_at = EXCLUDED.checked_at,
      details = EXCLUDED.details;
    RETURN runner_result;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_health_components(component, status, checked_at, details)
    VALUES (
      'automation-scheduler', 'degraded', now(),
      jsonb_build_object('sqlstate', SQLSTATE)
    ) ON CONFLICT (component) DO UPDATE SET
      status = EXCLUDED.status,
      checked_at = EXCLUDED.checked_at,
      details = EXCLUDED.details;
    RETURN jsonb_build_object('status', 'failed', 'sqlstate', SQLSTATE, 'ran_at', now());
  END;
END;
$$;

REVOKE ALL ON FUNCTION private.run_all_scheduled_automations_with_health()
  FROM PUBLIC, anon, authenticated;

DO $$
DECLARE existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job
  WHERE jobname = 'joia-p11-temporal-automations';
  IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
  PERFORM cron.schedule(
    'joia-p11-temporal-automations',
    '*/5 * * * *',
    'SELECT private.run_all_scheduled_automations_with_health();'
  );
END;
$$;

COMMIT;
