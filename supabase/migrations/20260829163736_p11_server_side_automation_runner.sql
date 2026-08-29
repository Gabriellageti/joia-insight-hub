-- P11: temporal automations must execute without a browser session.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS private.automation_scheduler_health (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  last_started_at timestamptz NOT NULL,
  last_finished_at timestamptz,
  last_status text NOT NULL CHECK (last_status IN ('running', 'success', 'failed', 'skipped')),
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0)
);

REVOKE ALL ON private.automation_scheduler_health FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.run_scheduled_automations_for_workspace(
  p_workspace uuid,
  p_actor uuid,
  p_trigger text DEFAULT 'server'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rule public.automation_rules%ROWTYPE;
  item record;
  recipient_id uuid;
  run_id uuid;
  idempotency text;
  started timestamptz;
  affected integer;
  total integer := 0;
  skipped integer := 0;
  failed integer := 0;
BEGIN
  IF p_workspace IS NULL
     OR p_actor IS NULL
     OR private.user_workspace_access_level(p_actor, p_workspace) < 2 THEN
    RAISE EXCEPTION 'automation workspace or actor denied' USING ERRCODE = '42501';
  END IF;

  IF p_trigger NOT IN ('server', 'manual', 'browser') THEN
    RAISE EXCEPTION 'invalid automation trigger' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_workspace::text),
    pg_catalog.hashtext('scheduled_automations')
  );

  FOR rule IN
    SELECT *
    FROM public.automation_rules
    WHERE workspace_id = p_workspace
      AND event_type = 'schedule.tick'
      AND enabled
    ORDER BY rule_key
  LOOP
    IF rule.rule_key = 'urgent_task_overdue' THEN
      FOR item IN
        SELECT t.id, t.title, t.assigned_to, t.client_id, t.project_id
        FROM public.tasks AS t
        WHERE t.workspace_id = p_workspace
          AND t.status <> 'done'
          AND t.priority = 'urgent'
          AND t.due_date < CURRENT_DATE
      LOOP
        idempotency := rule.rule_key || ':' || item.id || ':' || CURRENT_DATE;
        started := clock_timestamp();
        run_id := NULL;
        INSERT INTO public.automation_runs(
          workspace_id, rule_id, entity_type, entity_id, idempotency_key, status, result
        ) VALUES (
          p_workspace, rule.id, 'task', item.id, idempotency, 'running',
          jsonb_build_object('trigger', p_trigger)
        ) ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped := skipped + 1; CONTINUE; END IF;
        BEGIN
          affected := private.automation_notify(
            p_workspace, item.assigned_to, 'automation_alert',
            'Tarefa urgente atrasada', item.title,
            'automation:urgent-overdue:' || item.id, 'urgent',
            '/minhas-tarefas', item.id, item.client_id, item.project_id
          );
          UPDATE public.automation_runs SET
            status = 'success',
            result = jsonb_build_object('affected', affected, 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          total := total + 1;
        EXCEPTION WHEN OTHERS THEN
          UPDATE public.automation_runs SET
            status = 'failed', error_message = left(SQLERRM, 1000),
            result = jsonb_build_object('sqlstate', SQLSTATE, 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          failed := failed + 1;
        END;
      END LOOP;

    ELSIF rule.rule_key = 'inactive_project_attention' THEN
      FOR item IN
        SELECT h.project_id AS id, h.project_name AS title, h.client_id
        FROM public.operational_project_health AS h
        JOIN public.workspace_operational_settings AS s ON s.workspace_id = h.workspace_id
        WHERE h.workspace_id = p_workspace
          AND h.health <> 'completed'
          AND h.last_activity_at < now() - make_interval(days => s.project_stale_days)
      LOOP
        idempotency := rule.rule_key || ':' || item.id || ':' || CURRENT_DATE;
        started := clock_timestamp();
        run_id := NULL;
        INSERT INTO public.automation_runs(
          workspace_id, rule_id, entity_type, entity_id, idempotency_key, status, result
        ) VALUES (
          p_workspace, rule.id, 'project', item.id, idempotency, 'running',
          jsonb_build_object('trigger', p_trigger)
        ) ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped := skipped + 1; CONTINUE; END IF;
        BEGIN
          affected := 0;
          FOR recipient_id IN
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id = p_workspace AND role::text IN ('owner', 'admin', 'manager')
          LOOP
            affected := affected + private.automation_notify(
              p_workspace, recipient_id, 'automation_alert',
              'Projeto sem atividade recente', item.title,
              'automation:project-stale:' || item.id, 'important',
              '/projetos/' || item.id, NULL, item.client_id, item.id
            );
          END LOOP;
          UPDATE public.automation_runs SET
            status = 'success',
            result = jsonb_build_object('affected', affected, 'health', 'attention', 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          total := total + 1;
        EXCEPTION WHEN OTHERS THEN
          UPDATE public.automation_runs SET
            status = 'failed', error_message = left(SQLERRM, 1000),
            result = jsonb_build_object('sqlstate', SQLSTATE, 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          failed := failed + 1;
        END;
      END LOOP;

    ELSIF rule.rule_key = 'overdue_next_step_task' THEN
      FOR item IN
        SELECT ns.id, ns.description AS title, ns.responsible_user_id, ns.due_date,
          m.id AS meeting_id, m.project_id, m.client_id
        FROM public.meeting_next_steps AS ns
        JOIN public.meetings AS m ON m.id = ns.meeting_id
        WHERE m.workspace_id = p_workspace
          AND ns.completed_at IS NULL
          AND ns.due_date < CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM public.tasks AS existing_task
            WHERE existing_task.source_next_step_id = ns.id
          )
      LOOP
        idempotency := rule.rule_key || ':' || item.id;
        started := clock_timestamp();
        run_id := NULL;
        INSERT INTO public.automation_runs(
          workspace_id, rule_id, entity_type, entity_id, idempotency_key, status, result
        ) VALUES (
          p_workspace, rule.id, 'meeting_next_step', item.id, idempotency, 'running',
          jsonb_build_object('trigger', p_trigger)
        ) ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped := skipped + 1; CONTINUE; END IF;
        BEGIN
          INSERT INTO public.tasks(
            workspace_id, title, description, project_id, client_id, type,
            responsible, priority, due_date, status, task_type, assigned_to,
            created_by, source_meeting_id, source_next_step_id
          ) VALUES (
            p_workspace, item.title,
            'Próximo passo atrasado convertido automaticamente em pendência.',
            item.project_id, item.client_id, 'Tarefa', 'Responsável', 'high',
            item.due_date, 'not_started',
            CASE WHEN item.project_id IS NOT NULL THEN 'project'
                 WHEN item.client_id IS NOT NULL THEN 'client'
                 ELSE 'personal' END,
            COALESCE(item.responsible_user_id, p_actor), p_actor,
            item.meeting_id, item.id
          );
          UPDATE public.automation_runs SET
            status = 'success',
            result = jsonb_build_object('created_task', true, 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          total := total + 1;
        EXCEPTION WHEN OTHERS THEN
          UPDATE public.automation_runs SET
            status = 'failed', error_message = left(SQLERRM, 1000),
            result = jsonb_build_object('sqlstate', SQLSTATE, 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          failed := failed + 1;
        END;
      END LOOP;

    ELSIF rule.rule_key = 'blocked_task_escalation' THEN
      FOR item IN
        SELECT t.id, t.title, t.client_id, t.project_id
        FROM public.tasks AS t
        JOIN public.workspace_operational_settings AS s ON s.workspace_id = t.workspace_id
        WHERE t.workspace_id = p_workspace
          AND t.status = 'blocked'
          AND t.blocked_at < now() - make_interval(days => s.blocked_stale_days)
      LOOP
        idempotency := rule.rule_key || ':' || item.id || ':' || CURRENT_DATE;
        started := clock_timestamp();
        run_id := NULL;
        INSERT INTO public.automation_runs(
          workspace_id, rule_id, entity_type, entity_id, idempotency_key, status, result
        ) VALUES (
          p_workspace, rule.id, 'task', item.id, idempotency, 'running',
          jsonb_build_object('trigger', p_trigger)
        ) ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped := skipped + 1; CONTINUE; END IF;
        BEGIN
          affected := 0;
          FOR recipient_id IN
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id = p_workspace AND role::text IN ('owner', 'admin', 'manager')
          LOOP
            affected := affected + private.automation_notify(
              p_workspace, recipient_id, 'automation_alert', 'Bloqueio prolongado',
              item.title, 'automation:blocked-stale:' || item.id, 'urgent',
              '/plano-acao', item.id, item.client_id, item.project_id
            );
          END LOOP;
          UPDATE public.automation_runs SET
            status = 'success',
            result = jsonb_build_object('affected', affected, 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          total := total + 1;
        EXCEPTION WHEN OTHERS THEN
          UPDATE public.automation_runs SET
            status = 'failed', error_message = left(SQLERRM, 1000),
            result = jsonb_build_object('sqlstate', SQLSTATE, 'trigger', p_trigger),
            finished_at = clock_timestamp(),
            duration_ms = GREATEST(0, round(extract(epoch FROM (clock_timestamp() - started)) * 1000)::integer)
          WHERE id = run_id;
          failed := failed + 1;
        END;
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'workspace_id', p_workspace,
    'executed', total,
    'deduplicated', skipped,
    'failed', failed,
    'trigger', p_trigger,
    'ran_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.run_all_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  workspace_record record;
  actor_id uuid;
  workspace_result jsonb;
  processed integer := 0;
  failed integer := 0;
  skipped integer := 0;
BEGIN
  FOR workspace_record IN
    SELECT DISTINCT r.workspace_id
    FROM public.automation_rules AS r
    WHERE r.event_type = 'schedule.tick' AND r.enabled
    ORDER BY r.workspace_id
  LOOP
    SELECT wm.user_id INTO actor_id
    FROM public.workspace_members AS wm
    WHERE wm.workspace_id = workspace_record.workspace_id
      AND wm.role::text IN ('owner', 'admin', 'manager', 'member')
    ORDER BY CASE wm.role::text
      WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'manager' THEN 3 ELSE 4 END,
      wm.created_at, wm.user_id
    LIMIT 1;

    IF actor_id IS NULL THEN
      INSERT INTO private.automation_scheduler_health(
        workspace_id, last_started_at, last_finished_at, last_status,
        last_result, last_error, consecutive_failures
      ) VALUES (
        workspace_record.workspace_id, now(), now(), 'skipped',
        jsonb_build_object('reason', 'no eligible automation actor'),
        'no eligible automation actor', 0
      ) ON CONFLICT (workspace_id) DO UPDATE SET
        last_started_at = EXCLUDED.last_started_at,
        last_finished_at = EXCLUDED.last_finished_at,
        last_status = EXCLUDED.last_status,
        last_result = EXCLUDED.last_result,
        last_error = EXCLUDED.last_error;
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO private.automation_scheduler_health(
      workspace_id, last_started_at, last_status, last_result, last_error
    ) VALUES (
      workspace_record.workspace_id, now(), 'running', '{}'::jsonb, NULL
    ) ON CONFLICT (workspace_id) DO UPDATE SET
      last_started_at = EXCLUDED.last_started_at,
      last_finished_at = NULL,
      last_status = 'running',
      last_result = '{}'::jsonb,
      last_error = NULL;

    BEGIN
      workspace_result := private.run_scheduled_automations_for_workspace(
        workspace_record.workspace_id, actor_id, 'server'
      );
      UPDATE private.automation_scheduler_health SET
        last_finished_at = now(), last_status = 'success',
        last_result = workspace_result, last_error = NULL,
        consecutive_failures = 0
      WHERE workspace_id = workspace_record.workspace_id;
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE private.automation_scheduler_health SET
        last_finished_at = now(), last_status = 'failed',
        last_result = jsonb_build_object('sqlstate', SQLSTATE),
        last_error = left(SQLERRM, 1000),
        consecutive_failures = consecutive_failures + 1
      WHERE workspace_id = workspace_record.workspace_id;
      failed := failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed_workspaces', processed,
    'failed_workspaces', failed,
    'skipped_workspaces', skipped,
    'ran_at', now()
  );
END;
$$;

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
     OR COALESCE(private.workspace_access_level(workspace_id), 0) < 2 THEN
    RAISE EXCEPTION 'workspace access denied' USING ERRCODE = '42501';
  END IF;
  RETURN private.run_scheduled_automations_for_workspace(workspace_id, actor_id, 'browser');
END;
$$;

REVOKE ALL ON FUNCTION private.run_scheduled_automations_for_workspace(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.run_all_scheduled_automations()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_scheduled_automations()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_scheduled_automations() TO authenticated;

DO $$
DECLARE existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job
  WHERE jobname = 'joia-p11-temporal-automations';
  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;
  PERFORM cron.schedule(
    'joia-p11-temporal-automations',
    '*/5 * * * *',
    'SELECT private.run_all_scheduled_automations();'
  );
END;
$$;

COMMIT;
