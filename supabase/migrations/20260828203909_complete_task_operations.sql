-- Complete the single task source used by the Action Plan, clients, projects
-- and assignee views. Legacy workflow values are folded into the five states
-- used by JoIA Ops without duplicating records.

BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id(),
  ADD COLUMN IF NOT EXISTS observations text;

-- Remove legacy domain constraints before rewriting their values. They are
-- recreated with the stricter operational vocabulary below in this transaction.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_previous_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_structure_check;

UPDATE public.tasks AS task
SET workspace_id = project.workspace_id,
    client_id = project.client_id,
    task_type = 'project'
FROM public.projects AS project
WHERE task.project_id = project.id;

UPDATE public.tasks AS task
SET workspace_id = client.workspace_id,
    task_type = 'client'
FROM public.clients AS client
WHERE task.project_id IS NULL
  AND task.client_id = client.id;

UPDATE public.tasks AS task
SET workspace_id = (
  SELECT member.workspace_id
  FROM public.workspace_members AS member
  WHERE member.user_id = COALESCE(task.created_by, task.assigned_to)
  ORDER BY member.is_default DESC, member.created_at, member.workspace_id
  LIMIT 1
)
WHERE task.workspace_id IS NULL;

UPDATE public.tasks
SET status = CASE
  WHEN status IN ('done', 'concluida', 'concluída', 'concluido', 'concluído') THEN 'done'
  WHEN status IN ('in_progress', 'in progress', 'em andamento') THEN 'in_progress'
  WHEN status IN ('waiting', 'aguardando', 'review', 'em revisão', 'em revisao') THEN 'waiting'
  WHEN status IN ('blocked', 'bloqueada', 'bloqueado') THEN 'blocked'
  ELSE 'not_started'
END,
previous_status = CASE
  WHEN previous_status IN ('in_progress', 'in progress', 'em andamento') THEN 'in_progress'
  WHEN previous_status IN ('waiting', 'aguardando', 'review', 'em revisão', 'em revisao') THEN 'waiting'
  WHEN previous_status IN ('blocked', 'bloqueada', 'bloqueado') THEN 'blocked'
  ELSE 'not_started'
END;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_task_type_check CHECK (task_type IN ('personal', 'client', 'project')),
  ADD CONSTRAINT tasks_status_check CHECK (status IN ('not_started', 'in_progress', 'waiting', 'blocked', 'done')),
  ADD CONSTRAINT tasks_previous_status_check CHECK (
    previous_status IS NULL OR previous_status IN ('not_started', 'in_progress', 'waiting', 'blocked')
  ),
  ADD CONSTRAINT tasks_structure_check CHECK (
    (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL)
    OR (task_type = 'client' AND project_id IS NULL AND client_id IS NOT NULL)
    OR (task_type = 'project' AND project_id IS NOT NULL)
  );

ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'not_started';

CREATE INDEX IF NOT EXISTS tasks_client_id_idx ON public.tasks (client_id);
CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON public.tasks (workspace_id);
CREATE INDEX IF NOT EXISTS tasks_operational_queue_idx
  ON public.tasks (workspace_id, status, due_date, priority);

CREATE OR REPLACE FUNCTION private.user_workspace_access_level(_user_id uuid, _workspace_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT CASE member.role
      WHEN 'owner' THEN 5
      WHEN 'admin' THEN 4
      WHEN 'manager' THEN 3
      WHEN 'member' THEN 2
      WHEN 'viewer' THEN 1
      ELSE 0
    END
    FROM public.workspace_members AS member
    WHERE member.workspace_id = _workspace_id
      AND member.user_id = _user_id
    LIMIT 1
  ), 0)
$$;

REVOKE ALL ON FUNCTION private.user_workspace_access_level(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.protect_task_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_is_creator boolean := false;
  actor_is_manager boolean := false;
  scoped_client_id uuid;
  scoped_workspace_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.task_type = 'project' THEN
    SELECT project.client_id, project.workspace_id
      INTO scoped_client_id, scoped_workspace_id
    FROM public.projects AS project
    WHERE project.id = NEW.project_id;
    IF scoped_workspace_id IS NULL THEN
      RAISE EXCEPTION 'project task requires a valid project' USING ERRCODE = '23514';
    END IF;
    NEW.client_id := scoped_client_id;
    NEW.workspace_id := scoped_workspace_id;
  ELSIF NEW.task_type = 'client' THEN
    SELECT client.workspace_id INTO scoped_workspace_id
    FROM public.clients AS client
    WHERE client.id = NEW.client_id;
    IF scoped_workspace_id IS NULL THEN
      RAISE EXCEPTION 'client task requires a valid client' USING ERRCODE = '23514';
    END IF;
    NEW.project_id := NULL;
    NEW.workspace_id := scoped_workspace_id;
  ELSE
    NEW.project_id := NULL;
    NEW.client_id := NULL;
    NEW.workspace_id := private.current_workspace_id();
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := actor_id;
    IF NEW.status = 'done' THEN
      NEW.previous_status := COALESCE(NULLIF(NEW.previous_status, 'done'), 'not_started');
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := actor_id;
    ELSE
      NEW.completed_at := NULL;
      NEW.completed_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  actor_is_creator := OLD.created_by = actor_id;
  actor_is_manager := private.workspace_access_level(OLD.workspace_id) >= 3
    OR (OLD.project_id IS NOT NULL AND private.user_project_access_level(actor_id, OLD.project_id) >= 3);

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable' USING ERRCODE = '42501';
  END IF;

  IF NOT actor_is_creator AND NOT actor_is_manager AND (
    NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
    OR NEW.task_type IS DISTINCT FROM OLD.task_type
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
  ) THEN
    RAISE EXCEPTION 'only the creator or a manager can change task ownership' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'done' THEN
      NEW.previous_status := CASE
        WHEN OLD.status = 'done' THEN COALESCE(OLD.previous_status, 'not_started')
        ELSE OLD.status
      END;
      NEW.completed_at := now();
      NEW.completed_by := actor_id;
    ELSE
      NEW.completed_at := NULL;
      NEW.completed_by := NULL;
      NEW.previous_status := OLD.previous_status;
    END IF;
  ELSE
    NEW.completed_at := OLD.completed_at;
    NEW.completed_by := OLD.completed_by;
    NEW.previous_status := OLD.previous_status;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_task_write() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS tasks_owner_or_project_select ON public.tasks;
DROP POLICY IF EXISTS tasks_owner_or_project_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_owner_or_project_update ON public.tasks;
DROP POLICY IF EXISTS tasks_owner_or_project_delete ON public.tasks;

CREATE POLICY tasks_scoped_select ON public.tasks FOR SELECT TO authenticated
USING (
  (task_type = 'personal' AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid())))
  OR (task_type = 'client' AND client_id IS NOT NULL
      AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 1)
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1)
);

CREATE POLICY tasks_scoped_insert ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND assigned_to IS NOT NULL
  AND private.user_workspace_access_level(assigned_to, workspace_id) >= 1
  AND (
    (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL
      AND assigned_to = (SELECT auth.uid()))
    OR (task_type = 'client' AND project_id IS NULL AND client_id IS NOT NULL
      AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 2)
    OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
      AND private.user_project_access_level(assigned_to, project_id) >= 1)
  )
);

CREATE POLICY tasks_scoped_update ON public.tasks FOR UPDATE TO authenticated
USING (
  (task_type = 'personal' AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid())))
  OR (task_type = 'client' AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 2)
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 2)
)
WITH CHECK (
  assigned_to IS NOT NULL
  AND private.user_workspace_access_level(assigned_to, workspace_id) >= 1
  AND (
    (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL
      AND created_by = (SELECT auth.uid()) AND assigned_to = (SELECT auth.uid()))
    OR (task_type = 'client' AND project_id IS NULL AND client_id IS NOT NULL
      AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 2)
    OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
      AND private.user_project_access_level(assigned_to, project_id) >= 1)
  )
);

CREATE POLICY tasks_scoped_delete ON public.tasks FOR DELETE TO authenticated
USING (
  (task_type = 'personal' AND created_by = (SELECT auth.uid()))
  OR (task_type = 'client' AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 3)
);

COMMIT;
