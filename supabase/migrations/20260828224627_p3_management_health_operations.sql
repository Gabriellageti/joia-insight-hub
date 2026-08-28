BEGIN;

-- P3 keeps operational truth in the existing entities. These tables only hold
-- workspace policy and a user's voluntary watch list.
CREATE TABLE public.workspace_operational_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  inactivity_days smallint NOT NULL DEFAULT 14 CHECK (inactivity_days BETWEEN 1 AND 90),
  project_stale_days smallint NOT NULL DEFAULT 7 CHECK (project_stale_days BETWEEN 1 AND 90),
  blocked_stale_days smallint NOT NULL DEFAULT 3 CHECK (blocked_stale_days BETWEEN 1 AND 30),
  due_soon_days smallint NOT NULL DEFAULT 7 CHECK (due_soon_days BETWEEN 1 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.workspace_operational_settings (workspace_id)
SELECT id FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

CREATE TABLE public.entity_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'project')),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (entity_type = 'client' AND client_id IS NOT NULL AND project_id IS NULL)
    OR (entity_type = 'project' AND project_id IS NOT NULL AND client_id IS NULL)
  )
);
CREATE UNIQUE INDEX entity_favorites_client_unique_idx ON public.entity_favorites (user_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX entity_favorites_project_unique_idx ON public.entity_favorites (user_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX entity_favorites_workspace_user_idx ON public.entity_favorites (workspace_id, user_id);

-- Existing deliverables are also the project's milestone source.
ALTER TABLE public.deliverables
  ADD COLUMN responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN item_type text NOT NULL DEFAULT 'deliverable' CHECK (item_type IN ('deliverable', 'milestone'));

ALTER TABLE public.tasks
  ADD COLUMN block_reason text,
  ADD COLUMN block_reason_category text CHECK (block_reason_category IS NULL OR block_reason_category IN ('client', 'dependency', 'decision', 'resource', 'technical', 'other')),
  ADD COLUMN blocked_at timestamptz;

CREATE OR REPLACE FUNCTION private.prepare_task_blocking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'blocked' THEN
    IF NULLIF(btrim(NEW.block_reason), '') IS NULL THEN
      RAISE EXCEPTION 'block_reason is required when a task is blocked' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'blocked' THEN
      NEW.blocked_at := COALESCE(NEW.blocked_at, now());
    ELSE
      NEW.blocked_at := OLD.blocked_at;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'blocked' THEN
    NEW.blocked_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.prepare_task_blocking() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prepare_task_blocking BEFORE INSERT OR UPDATE OF status, block_reason, blocked_at ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.prepare_task_blocking();

CREATE INDEX tasks_blocked_duration_idx ON public.tasks (workspace_id, blocked_at) WHERE status = 'blocked';
CREATE INDEX projects_workspace_status_due_idx ON public.projects (workspace_id, status, end_date);
CREATE INDEX deliverables_workspace_due_idx ON public.deliverables (workspace_id, status, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX deliverables_responsible_due_idx ON public.deliverables (responsible_user_id, due_date) WHERE responsible_user_id IS NOT NULL;
CREATE INDEX meeting_next_steps_responsible_due_idx ON public.meeting_next_steps (responsible_user_id, due_date) WHERE responsible_user_id IS NOT NULL AND completed_at IS NULL;
CREATE INDEX activity_logs_actor_created_idx ON public.activity_logs (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX activity_logs_entity_created_idx ON public.activity_logs (entity_type, created_at DESC);

-- Explainable health. The view never stores a second status and always observes
-- the caller's RLS on projects, tasks, meetings and activity logs.
CREATE VIEW public.operational_project_health
WITH (security_invoker = true)
AS
SELECT
  p.workspace_id,
  p.id AS project_id,
  p.client_id,
  p.name AS project_name,
  c.name AS client_name,
  p.status AS project_status,
  p.end_date,
  p.responsible,
  metrics.total_tasks,
  metrics.done_tasks,
  CASE WHEN metrics.total_tasks = 0 THEN COALESCE(p.progress, 0)
       ELSE round(metrics.done_tasks * 100.0 / metrics.total_tasks)::integer END AS progress,
  metrics.open_tasks,
  metrics.overdue_tasks,
  metrics.blocked_tasks,
  metrics.urgent_tasks,
  metrics.pending_meetings,
  metrics.overdue_next_steps,
  metrics.last_activity_at,
  score.value AS risk_score,
  CASE
    WHEN lower(COALESCE(p.status, '')) LIKE '%conclu%' THEN 'completed'
    WHEN score.value >= 8 THEN 'critical'
    WHEN score.value >= 5 THEN 'risk'
    WHEN score.value >= 3 THEN 'attention'
    ELSE 'healthy'
  END AS health,
  reasons.value AS risk_reasons
FROM public.projects p
LEFT JOIN public.clients c ON c.id = p.client_id
LEFT JOIN public.workspace_operational_settings settings ON settings.workspace_id = p.workspace_id
CROSS JOIN LATERAL (
  SELECT
    count(*)::integer AS total_tasks,
    count(*) FILTER (WHERE t.status = 'done')::integer AS done_tasks,
    count(*) FILTER (WHERE t.status <> 'done')::integer AS open_tasks,
    count(*) FILTER (WHERE t.status <> 'done' AND t.due_date < current_date)::integer AS overdue_tasks,
    count(*) FILTER (WHERE t.status = 'blocked')::integer AS blocked_tasks,
    count(*) FILTER (WHERE t.status <> 'done' AND t.priority = 'urgent')::integer AS urgent_tasks,
    (SELECT count(*)::integer FROM public.meetings m WHERE m.project_id = p.id AND m.status NOT IN ('Realizada', 'Cancelada') AND m.date < now()) AS pending_meetings,
    (SELECT count(*)::integer FROM public.meeting_next_steps ns JOIN public.meetings m ON m.id = ns.meeting_id WHERE m.project_id = p.id AND ns.completed_at IS NULL AND ns.due_date < current_date) AS overdue_next_steps,
    COALESCE((SELECT max(a.created_at) FROM public.activity_logs a WHERE a.project_id = p.id), p.updated_at, p.created_at) AS last_activity_at
  FROM public.tasks t WHERE t.project_id = p.id
) metrics
CROSS JOIN LATERAL (
  SELECT
    (CASE WHEN metrics.overdue_tasks > 0 THEN 2 ELSE 0 END
     + CASE WHEN metrics.blocked_tasks > 0 THEN 2 ELSE 0 END
     + CASE WHEN metrics.urgent_tasks > 0 THEN 1 ELSE 0 END
     + CASE WHEN p.end_date < current_date AND lower(COALESCE(p.status, '')) NOT LIKE '%conclu%' THEN 3
            WHEN p.end_date <= current_date + COALESCE(settings.due_soon_days, 7) AND lower(COALESCE(p.status, '')) NOT LIKE '%conclu%' THEN 1 ELSE 0 END
     + CASE WHEN metrics.last_activity_at < now() - make_interval(days => COALESCE(settings.project_stale_days, 7)) THEN 1 ELSE 0 END
     + CASE WHEN metrics.pending_meetings > 0 THEN 1 ELSE 0 END
     + CASE WHEN metrics.overdue_next_steps > 0 THEN 1 ELSE 0 END)::integer AS value
) score
CROSS JOIN LATERAL (
  SELECT COALESCE(jsonb_agg(reason ORDER BY points DESC), '[]'::jsonb) AS value
  FROM (VALUES
    (CASE WHEN metrics.overdue_tasks > 0 THEN format('%s tarefa(s) atrasada(s)', metrics.overdue_tasks) END, 2),
    (CASE WHEN metrics.blocked_tasks > 0 THEN format('%s tarefa(s) bloqueada(s)', metrics.blocked_tasks) END, 2),
    (CASE WHEN metrics.urgent_tasks > 0 THEN format('%s tarefa(s) urgente(s) aberta(s)', metrics.urgent_tasks) END, 1),
    (CASE WHEN p.end_date < current_date AND lower(COALESCE(p.status, '')) NOT LIKE '%conclu%' THEN 'Prazo do projeto vencido'
          WHEN p.end_date <= current_date + COALESCE(settings.due_soon_days, 7) AND lower(COALESCE(p.status, '')) NOT LIKE '%conclu%' THEN 'Prazo do projeto próximo' END,
      CASE WHEN p.end_date < current_date THEN 3 ELSE 1 END),
    (CASE WHEN metrics.last_activity_at < now() - make_interval(days => COALESCE(settings.project_stale_days, 7)) THEN 'Sem atividade recente' END, 1),
    (CASE WHEN metrics.pending_meetings > 0 THEN format('%s reunião(ões) pendente(s)', metrics.pending_meetings) END, 1),
    (CASE WHEN metrics.overdue_next_steps > 0 THEN format('%s próximo(s) passo(s) atrasado(s)', metrics.overdue_next_steps) END, 1)
  ) AS r(reason, points) WHERE reason IS NOT NULL
) reasons;

CREATE VIEW public.operational_client_health
WITH (security_invoker = true)
AS
SELECT
  c.workspace_id,
  c.id AS client_id,
  c.name AS client_name,
  c.status AS client_status,
  metrics.active_projects,
  metrics.risk_projects,
  metrics.critical_projects,
  metrics.open_tasks,
  metrics.overdue_tasks,
  metrics.blocked_tasks,
  metrics.last_activity_at,
  (metrics.last_activity_at < now() - make_interval(days => COALESCE(settings.inactivity_days, 14))) AS no_follow_up,
  score.value AS risk_score,
  CASE WHEN score.value >= 8 THEN 'critical' WHEN score.value >= 5 THEN 'risk' WHEN score.value >= 3 THEN 'attention' ELSE 'healthy' END AS health,
  reasons.value AS risk_reasons
FROM public.clients c
LEFT JOIN public.workspace_operational_settings settings ON settings.workspace_id = c.workspace_id
CROSS JOIN LATERAL (
  SELECT
    (SELECT count(*)::integer FROM public.projects p WHERE p.client_id = c.id AND lower(COALESCE(p.status, '')) NOT LIKE '%conclu%') AS active_projects,
    (SELECT count(*)::integer FROM public.operational_project_health h WHERE h.client_id = c.id AND h.health = 'risk') AS risk_projects,
    (SELECT count(*)::integer FROM public.operational_project_health h WHERE h.client_id = c.id AND h.health = 'critical') AS critical_projects,
    (SELECT count(*)::integer FROM public.tasks t WHERE t.client_id = c.id AND t.status <> 'done') AS open_tasks,
    (SELECT count(*)::integer FROM public.tasks t WHERE t.client_id = c.id AND t.status <> 'done' AND t.due_date < current_date) AS overdue_tasks,
    (SELECT count(*)::integer FROM public.tasks t WHERE t.client_id = c.id AND t.status = 'blocked') AS blocked_tasks,
    COALESCE((SELECT max(a.created_at) FROM public.activity_logs a WHERE a.client_id = c.id), c.updated_at, c.created_at) AS last_activity_at
) metrics
CROSS JOIN LATERAL (
  SELECT (CASE WHEN metrics.critical_projects > 0 THEN 4 ELSE 0 END
    + CASE WHEN metrics.risk_projects > 0 THEN 2 ELSE 0 END
    + CASE WHEN metrics.overdue_tasks > 0 THEN 2 ELSE 0 END
    + CASE WHEN metrics.blocked_tasks > 0 THEN 2 ELSE 0 END
    + CASE WHEN metrics.last_activity_at < now() - make_interval(days => COALESCE(settings.inactivity_days, 14)) THEN 2 ELSE 0 END)::integer AS value
) score
CROSS JOIN LATERAL (
  SELECT COALESCE(jsonb_agg(reason ORDER BY points DESC), '[]'::jsonb) AS value
  FROM (VALUES
    (CASE WHEN metrics.critical_projects > 0 THEN format('%s projeto(s) crítico(s)', metrics.critical_projects) END, 4),
    (CASE WHEN metrics.risk_projects > 0 THEN format('%s projeto(s) em risco', metrics.risk_projects) END, 2),
    (CASE WHEN metrics.overdue_tasks > 0 THEN format('%s tarefa(s) atrasada(s)', metrics.overdue_tasks) END, 2),
    (CASE WHEN metrics.blocked_tasks > 0 THEN format('%s tarefa(s) bloqueada(s)', metrics.blocked_tasks) END, 2),
    (CASE WHEN metrics.last_activity_at < now() - make_interval(days => COALESCE(settings.inactivity_days, 14)) THEN format('Sem acompanhamento há mais de %s dias', COALESCE(settings.inactivity_days, 14)) END, 2)
  ) AS r(reason, points) WHERE reason IS NOT NULL
) reasons;

CREATE OR REPLACE FUNCTION public.get_operations_dashboard(
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
  access_level integer;
  personal_scope boolean;
  result jsonb;
BEGIN
  access_level := COALESCE(private.workspace_access_level(target_workspace), 0);
  IF actor IS NULL OR access_level < 1 THEN
    RAISE EXCEPTION 'workspace access denied' USING ERRCODE = '42501';
  END IF;
  personal_scope := access_level < 3;

  WITH scoped_tasks AS (
    SELECT t.* FROM public.tasks t
    WHERE t.workspace_id = target_workspace
      AND (NOT personal_scope OR t.assigned_to = actor)
      AND (_client_id IS NULL OR t.client_id = _client_id)
      AND (_responsible_id IS NULL OR t.assigned_to = _responsible_id)
  ), scoped_projects AS (
    SELECT h.* FROM public.operational_project_health h
    WHERE h.workspace_id = target_workspace
      AND (_client_id IS NULL OR h.client_id = _client_id)
      AND (NOT personal_scope OR EXISTS (SELECT 1 FROM scoped_tasks t WHERE t.project_id = h.project_id))
  ), scoped_clients AS (
    SELECT h.* FROM public.operational_client_health h
    WHERE h.workspace_id = target_workspace
      AND (_client_id IS NULL OR h.client_id = _client_id)
      AND (NOT personal_scope OR EXISTS (SELECT 1 FROM scoped_tasks t WHERE t.client_id = h.client_id))
  ), scoped_meetings AS (
    SELECT m.* FROM public.meetings m
    WHERE m.workspace_id = target_workspace
      AND (_client_id IS NULL OR m.client_id = _client_id)
      AND (NOT personal_scope OR m.responsible_user_id = actor)
      AND (_responsible_id IS NULL OR m.responsible_user_id = _responsible_id)
  ), deliveries AS (
    SELECT 'task'::text AS type, t.id, t.title, t.due_date, t.client_id, t.project_id, t.assigned_to AS responsible_id, t.status
      FROM scoped_tasks t WHERE t.status <> 'done' AND t.due_date BETWEEN current_date AND current_date + 30
    UNION ALL
    SELECT d.item_type, d.id, d.title, d.due_date, p.client_id, d.project_id, d.responsible_user_id, COALESCE(d.status, 'pending')
      FROM public.deliverables d JOIN public.projects p ON p.id = d.project_id
      WHERE d.workspace_id = target_workspace AND COALESCE(d.status, '') NOT IN ('done','concluido','concluído') AND d.due_date BETWEEN current_date AND current_date + 30
        AND (_client_id IS NULL OR p.client_id = _client_id) AND (_responsible_id IS NULL OR d.responsible_user_id = _responsible_id)
        AND (NOT personal_scope OR d.responsible_user_id = actor)
    UNION ALL
    SELECT 'next_step', ns.id, ns.description, ns.due_date, m.client_id, m.project_id, ns.responsible_user_id, CASE WHEN ns.completed_at IS NULL THEN 'pending' ELSE 'done' END
      FROM public.meeting_next_steps ns JOIN scoped_meetings m ON m.id = ns.meeting_id
      WHERE ns.completed_at IS NULL AND ns.due_date BETWEEN current_date AND current_date + 30
  )
  SELECT jsonb_build_object(
    'scope', CASE WHEN personal_scope THEN 'personal' ELSE 'company' END,
    'periodDays', LEAST(GREATEST(_period_days, 7), 365),
    'kpis', jsonb_build_object(
      'activeProjects', (SELECT count(*) FROM scoped_projects WHERE health <> 'completed'),
      'riskProjects', (SELECT count(*) FROM scoped_projects WHERE health IN ('risk','critical')),
      'lateProjects', (SELECT count(*) FROM scoped_projects WHERE end_date < current_date AND health <> 'completed'),
      'openTasks', (SELECT count(*) FROM scoped_tasks WHERE status <> 'done'),
      'lateTasks', (SELECT count(*) FROM scoped_tasks WHERE status <> 'done' AND due_date < current_date),
      'blockedTasks', (SELECT count(*) FROM scoped_tasks WHERE status = 'blocked'),
      'attentionClients', (SELECT count(*) FROM scoped_clients WHERE health IN ('attention','risk','critical')),
      'pendingMeetings', (SELECT count(*) FROM scoped_meetings WHERE status NOT IN ('Realizada','Cancelada') AND date < now()),
      'weekDeliveries', (SELECT count(*) FROM deliveries WHERE due_date <= current_date + 7)
    ),
    'projects', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.risk_score DESC, x.end_date NULLS LAST) FROM (SELECT * FROM scoped_projects ORDER BY risk_score DESC, end_date NULLS LAST LIMIT 8) x), '[]'::jsonb),
    'clients', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.risk_score DESC) FROM (SELECT * FROM scoped_clients ORDER BY risk_score DESC LIMIT 8) x), '[]'::jsonb),
    'attention', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.priority_rank DESC, x.due_date NULLS LAST) FROM (
      SELECT t.id, 'task'::text AS type, t.title, t.due_date, t.client_id, t.project_id,
        CASE WHEN t.status = 'blocked' THEN 'Tarefa bloqueada' WHEN t.due_date < current_date THEN 'Tarefa atrasada' ELSE 'Tarefa urgente' END AS reason,
        CASE WHEN t.status = 'blocked' THEN 3 WHEN t.due_date < current_date THEN 2 ELSE 1 END AS priority_rank
      FROM scoped_tasks t WHERE t.status = 'blocked' OR (t.status <> 'done' AND t.due_date < current_date) OR (t.status <> 'done' AND t.priority = 'urgent')
      ORDER BY priority_rank DESC, due_date NULLS LAST LIMIT 10
    ) x), '[]'::jsonb),
    'deliveries', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.due_date) FROM (SELECT * FROM deliveries ORDER BY due_date LIMIT 20) x), '[]'::jsonb),
    'weekly', jsonb_build_object(
      'completedTasks', (SELECT count(*) FROM scoped_tasks WHERE status = 'done' AND completed_at >= now() - interval '7 days'),
      'createdTasks', (SELECT count(*) FROM scoped_tasks WHERE created_at >= now() - interval '7 days'),
      'newBlocks', (SELECT count(*) FROM scoped_tasks WHERE blocked_at >= now() - interval '7 days'),
      'completedMeetings', (SELECT count(*) FROM scoped_meetings WHERE status = 'Realizada' AND ended_at >= now() - interval '7 days')
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_operations(_workspace_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE target_workspace uuid := COALESCE(_workspace_id, private.current_workspace_id()); result jsonb;
BEGIN
  IF COALESCE(private.workspace_access_level(target_workspace), 0) < 3 THEN
    RAISE EXCEPTION 'manager access required' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.overdue_tasks DESC, x.open_tasks DESC, x.member_name), '[]'::jsonb)
  INTO result
  FROM (
    SELECT wm.user_id, COALESCE(p.full_name, 'Usuário sem nome') AS member_name, wm.role,
      count(t.id) FILTER (WHERE t.status <> 'done')::integer AS open_tasks,
      count(t.id) FILTER (WHERE t.status <> 'done' AND t.due_date = current_date)::integer AS today_tasks,
      count(t.id) FILTER (WHERE t.status <> 'done' AND t.due_date < current_date)::integer AS overdue_tasks,
      count(t.id) FILTER (WHERE t.status = 'blocked')::integer AS blocked_tasks,
      count(t.id) FILTER (WHERE t.completed_at >= now() - interval '7 days')::integer AS week_completed,
      count(DISTINCT t.project_id) FILTER (WHERE t.status <> 'done' AND t.project_id IS NOT NULL)::integer AS active_projects,
      count(t.id) FILTER (WHERE t.status <> 'done' AND t.due_date BETWEEN current_date AND current_date + 7)::integer AS week_deliveries,
      CASE WHEN count(t.id) FILTER (WHERE t.status <> 'done') >= 16 OR count(t.id) FILTER (WHERE t.status <> 'done' AND t.due_date < current_date) >= 5 THEN 'overloaded'
           WHEN count(t.id) FILTER (WHERE t.status <> 'done') >= 11 OR count(t.id) FILTER (WHERE t.status <> 'done' AND t.due_date < current_date) >= 3 THEN 'high'
           WHEN count(t.id) FILTER (WHERE t.status <> 'done') >= 5 THEN 'normal' ELSE 'available' END AS capacity
    FROM public.workspace_members wm
    JOIN public.profiles p ON p.id = wm.user_id
    LEFT JOIN public.tasks t ON t.assigned_to = wm.user_id AND t.workspace_id = wm.workspace_id
    WHERE wm.workspace_id = target_workspace
    GROUP BY wm.user_id, p.full_name, wm.role
  ) x;
  RETURN result;
END;
$$;

-- Append general operational events to the P2 log. Meeting-origin tasks keep
-- their specialized P2 event and are skipped here to avoid duplicate history.
CREATE OR REPLACE FUNCTION private.log_core_operational_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE payload jsonb; action_name text; entity_name text; entity_id uuid; workspace_id uuid; client_id uuid; project_id uuid; task_id uuid;
BEGIN
  payload := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_TABLE_NAME = 'tasks' AND NULLIF(payload->>'source_meeting_id', '') IS NOT NULL AND TG_OP <> 'DELETE' THEN
    RETURN NEW;
  END IF;
  action_name := TG_TABLE_NAME || '_' || lower(TG_OP);
  entity_name := COALESCE(payload->>'title', payload->>'name', 'Registro operacional');
  entity_id := (payload->>'id')::uuid;
  workspace_id := (payload->>'workspace_id')::uuid;
  client_id := CASE WHEN TG_TABLE_NAME = 'clients' THEN entity_id ELSE NULLIF(payload->>'client_id', '')::uuid END;
  project_id := CASE WHEN TG_TABLE_NAME = 'projects' THEN entity_id ELSE NULLIF(payload->>'project_id', '')::uuid END;
  task_id := CASE WHEN TG_TABLE_NAME = 'tasks' THEN entity_id ELSE NULL END;
  INSERT INTO public.activity_logs (workspace_id, actor_id, action_type, entity_type, entity_id, client_id, project_id, task_id, title, description, metadata)
  VALUES (
    workspace_id, auth.uid(), action_name, rtrim(TG_TABLE_NAME, 's'), entity_id,
    client_id, project_id, task_id,
    entity_name,
    CASE WHEN TG_OP = 'INSERT' THEN 'Registro criado' WHEN TG_OP = 'DELETE' THEN 'Registro removido' ELSE 'Registro atualizado' END,
    CASE WHEN TG_TABLE_NAME = 'tasks' THEN jsonb_build_object('status', payload->>'status', 'priority', payload->>'priority') ELSE '{}'::jsonb END
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.log_core_operational_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER log_task_operational_activity AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION private.log_core_operational_activity();
CREATE TRIGGER log_project_operational_activity AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION private.log_core_operational_activity();
CREATE TRIGGER log_client_operational_activity AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION private.log_core_operational_activity();

ALTER TABLE public.workspace_operational_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_operational_settings_select ON public.workspace_operational_settings FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 1);
CREATE POLICY workspace_operational_settings_update ON public.workspace_operational_settings FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3 AND updated_by = (SELECT auth.uid()));

CREATE POLICY entity_favorites_select ON public.entity_favorites FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 1);
CREATE POLICY entity_favorites_insert ON public.entity_favorites FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 1);
CREATE POLICY entity_favorites_delete ON public.entity_favorites FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 1);

REVOKE ALL ON public.workspace_operational_settings, public.entity_favorites FROM anon, authenticated;
GRANT SELECT ON public.workspace_operational_settings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.entity_favorites TO authenticated;
GRANT UPDATE (inactivity_days, project_stale_days, blocked_stale_days, due_soon_days, updated_at, updated_by) ON public.workspace_operational_settings TO authenticated;

REVOKE ALL ON public.operational_project_health, public.operational_client_health FROM PUBLIC, anon;
GRANT SELECT ON public.operational_project_health, public.operational_client_health TO authenticated;
REVOKE ALL ON FUNCTION public.get_operations_dashboard(uuid, integer, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_operations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_operations_dashboard(uuid, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_operations(uuid) TO authenticated;

COMMIT;
