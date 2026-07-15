-- First functional phase of the Action Plan.
-- Reuses public.tasks, preserves existing rows and introduces explicit project access.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'viewer' CHECK (access_level IN ('viewer', 'editor', 'manager')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS project_members_user_project_idx ON public.project_members (user_id, project_id);
CREATE INDEX IF NOT EXISTS project_members_project_access_idx ON public.project_members (project_id, access_level, user_id);

-- Existing authenticated internal roles already had global project access. Preserve that
-- behavior explicitly while preventing client roles from inheriting it accidentally.
INSERT INTO public.project_members (project_id, user_id, access_level, created_by)
SELECT
  project.id,
  role_entry.user_id,
  CASE WHEN role_entry.role IN ('admin_joia', 'gestor_projetos') THEN 'manager' ELSE 'editor' END,
  NULL
FROM public.projects project
CROSS JOIN public.user_roles role_entry
WHERE role_entry.role IN (
  'admin_joia',
  'gestor_projetos',
  'analista',
  'financeiro_joia',
  'marketing_joia',
  'colaborador_onboarding'
)
ON CONFLICT (project_id, user_id) DO UPDATE
SET access_level = CASE
  WHEN EXCLUDED.access_level = 'manager' THEN 'manager'
  ELSE public.project_members.access_level
END;

CREATE OR REPLACE FUNCTION private.user_project_access_level(_user_id uuid, _project_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _user_id IS NULL OR _project_id IS NULL THEN 0
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles role_entry
      WHERE role_entry.user_id = _user_id AND role_entry.role = 'admin_joia'
    ) THEN 3
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles role_entry
      WHERE role_entry.user_id = _user_id AND role_entry.role = 'gestor_projetos'
    ) THEN 3
    ELSE COALESCE((
      SELECT CASE member.access_level WHEN 'manager' THEN 3 WHEN 'editor' THEN 2 ELSE 1 END
      FROM public.project_members member
      WHERE member.project_id = _project_id AND member.user_id = _user_id
    ), 0)
  END
$$;

REVOKE ALL ON FUNCTION private.user_project_access_level(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_project_access_level(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.user_has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles role_entry
    WHERE role_entry.user_id = _user_id AND role_entry.role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.user_has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Members can view projects" ON public.projects FOR SELECT TO authenticated
USING (private.user_project_access_level((SELECT auth.uid()), id) >= 1);

CREATE POLICY "Internal users can create projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (
  private.user_has_role((SELECT auth.uid()), 'admin_joia')
  OR private.user_has_role((SELECT auth.uid()), 'gestor_projetos')
  OR private.user_has_role((SELECT auth.uid()), 'analista')
  OR private.user_has_role((SELECT auth.uid()), 'financeiro_joia')
  OR private.user_has_role((SELECT auth.uid()), 'marketing_joia')
  OR private.user_has_role((SELECT auth.uid()), 'colaborador_onboarding')
);

CREATE POLICY "Managers can update projects" ON public.projects FOR UPDATE TO authenticated
USING (private.user_project_access_level((SELECT auth.uid()), id) >= 3)
WITH CHECK (private.user_project_access_level((SELECT auth.uid()), id) >= 3);

CREATE POLICY "Managers can delete projects" ON public.projects FOR DELETE TO authenticated
USING (private.user_project_access_level((SELECT auth.uid()), id) >= 3);

CREATE POLICY "Members can view project memberships" ON public.project_members FOR SELECT TO authenticated
USING (private.user_project_access_level((SELECT auth.uid()), project_id) >= 1);

CREATE OR REPLACE FUNCTION private.add_project_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, access_level, created_by)
    VALUES (NEW.id, actor_id, 'manager', actor_id)
    ON CONFLICT (project_id, user_id) DO UPDATE SET access_level = 'manager';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.add_project_creator_membership() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS add_project_creator_membership ON public.projects;
CREATE TRIGGER add_project_creator_membership
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION private.add_project_creator_membership();

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_status text,
  ADD COLUMN IF NOT EXISTS source_diagnostic_id text,
  ADD COLUMN IF NOT EXISTS source_action_id text;

-- Normalize legacy rows before adding strict constraints and restrictive policies.
UPDATE public.tasks task
SET
  task_type = CASE WHEN task.project_id IS NULL THEN 'personal' ELSE 'project' END,
  client_id = CASE WHEN task.project_id IS NULL THEN NULL ELSE project.client_id END,
  status = CASE
    WHEN lower(COALESCE(task.status, '')) IN ('done', 'concluida', 'concluÃ­da', 'concluido', 'concluÃ­do') THEN 'done'
    WHEN lower(COALESCE(task.status, '')) IN ('next', 'proximas', 'prÃ³ximas') THEN 'next'
    WHEN lower(COALESCE(task.status, '')) IN ('in progress', 'in_progress', 'em andamento') THEN 'in_progress'
    WHEN lower(COALESCE(task.status, '')) IN ('waiting', 'aguardando') THEN 'waiting'
    WHEN lower(COALESCE(task.status, '')) IN ('review', 'validation', 'em revisao', 'em revisÃ£o', 'em validacao', 'em validaÃ§Ã£o') THEN 'review'
    ELSE 'backlog'
  END,
  priority = CASE
    WHEN lower(COALESCE(task.priority, '')) IN ('urgent', 'urgente') THEN 'urgent'
    WHEN lower(COALESCE(task.priority, '')) IN ('high', 'alta') THEN 'high'
    WHEN lower(COALESCE(task.priority, '')) IN ('low', 'baixa') THEN 'low'
    ELSE 'medium'
  END
FROM public.projects project
WHERE task.project_id = project.id;

UPDATE public.tasks task
SET
  task_type = 'personal',
  client_id = NULL,
  status = CASE
    WHEN lower(COALESCE(task.status, '')) IN ('done', 'concluida', 'concluÃ­da', 'concluido', 'concluÃ­do') THEN 'done'
    WHEN lower(COALESCE(task.status, '')) IN ('next', 'proximas', 'prÃ³ximas') THEN 'next'
    WHEN lower(COALESCE(task.status, '')) IN ('in progress', 'in_progress', 'em andamento') THEN 'in_progress'
    WHEN lower(COALESCE(task.status, '')) IN ('waiting', 'aguardando') THEN 'waiting'
    WHEN lower(COALESCE(task.status, '')) IN ('review', 'validation', 'em revisao', 'em revisÃ£o', 'em validacao', 'em validaÃ§Ã£o') THEN 'review'
    ELSE 'backlog'
  END,
  priority = CASE
    WHEN lower(COALESCE(task.priority, '')) IN ('urgent', 'urgente') THEN 'urgent'
    WHEN lower(COALESCE(task.priority, '')) IN ('high', 'alta') THEN 'high'
    WHEN lower(COALESCE(task.priority, '')) IN ('low', 'baixa') THEN 'low'
    ELSE 'medium'
  END
WHERE task.project_id IS NULL;

WITH resolved_owners AS (
  SELECT
    task.id,
    COALESCE(
      task.assigned_to,
      (SELECT profile.id FROM public.profiles profile
       WHERE task.responsible IS NOT NULL
         AND lower(trim(profile.full_name)) = lower(trim(task.responsible))
       ORDER BY profile.id LIMIT 1),
      (SELECT member.user_id FROM public.project_members member
       WHERE member.project_id = task.project_id
       ORDER BY CASE member.access_level WHEN 'manager' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, member.user_id
       LIMIT 1),
      (SELECT role_entry.user_id FROM public.user_roles role_entry
       WHERE role_entry.role IN ('admin_joia', 'gestor_projetos', 'analista')
       ORDER BY CASE role_entry.role WHEN 'admin_joia' THEN 0 WHEN 'gestor_projetos' THEN 1 ELSE 2 END, role_entry.user_id
       LIMIT 1)
    ) AS owner_id
  FROM public.tasks task
)
UPDATE public.tasks task
SET assigned_to = owner.owner_id,
    created_by = COALESCE(task.created_by, owner.owner_id)
FROM resolved_owners owner
WHERE task.id = owner.id;

UPDATE public.tasks
SET completed_at = COALESCE(completed_at, updated_at, created_at, now()),
    previous_status = COALESCE(NULLIF(previous_status, 'done'), 'in_progress')
WHERE status = 'done';

UPDATE public.tasks
SET completed_at = NULL,
    completed_by = NULL
WHERE status <> 'done';

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_previous_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_title_not_blank_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_dates_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_completion_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_structure_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_task_type_check CHECK (task_type IN ('personal', 'project')),
  ADD CONSTRAINT tasks_status_check CHECK (status IN ('backlog', 'next', 'in_progress', 'waiting', 'review', 'done')),
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD CONSTRAINT tasks_previous_status_check CHECK (previous_status IS NULL OR previous_status IN ('backlog', 'next', 'in_progress', 'waiting', 'review')),
  ADD CONSTRAINT tasks_title_not_blank_check CHECK (length(trim(title)) > 0),
  ADD CONSTRAINT tasks_dates_check CHECK (start_date IS NULL OR due_date IS NULL OR due_date >= start_date),
  ADD CONSTRAINT tasks_structure_check CHECK (
    (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL)
    OR (task_type = 'project' AND project_id IS NOT NULL)
  ),
  ADD CONSTRAINT tasks_completion_check CHECK (
    (status = 'done' AND completed_at IS NOT NULL)
    OR (status <> 'done' AND completed_at IS NULL AND completed_by IS NULL)
  );

ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'backlog';
ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT 'medium';
ALTER TABLE public.tasks ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN priority SET NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON public.tasks (created_by);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON public.tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_workspace_idx ON public.tasks (assigned_to, created_by, task_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_diagnostic_action_unique_idx
  ON public.tasks (source_diagnostic_id, source_action_id)
  WHERE source_diagnostic_id IS NOT NULL AND source_action_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  action text NOT NULL CHECK (action IN ('created', 'status_changed', 'completed', 'reopened')),
  previous_value jsonb,
  new_value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS task_history_task_created_idx ON public.task_history (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS task_history_user_id_idx ON public.task_history (user_id);

CREATE OR REPLACE FUNCTION private.protect_task_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_is_admin boolean := false;
  actor_is_creator boolean := false;
  actor_is_manager boolean := false;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles role_entry
    WHERE role_entry.user_id = actor_id AND role_entry.role = 'admin_joia'
  ) INTO actor_is_admin;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := actor_id;
    IF NEW.status = 'done' THEN
      NEW.previous_status := COALESCE(NULLIF(NEW.previous_status, 'done'), 'in_progress');
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := actor_id;
    ELSE
      NEW.completed_at := NULL;
      NEW.completed_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  actor_is_creator := OLD.created_by = actor_id;
  actor_is_manager := actor_is_admin OR (
    OLD.project_id IS NOT NULL
    AND private.user_project_access_level(actor_id, OLD.project_id) >= 3
  );

  IF NOT actor_is_admin AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable' USING ERRCODE = '42501';
  END IF;

  IF NOT actor_is_creator AND NOT actor_is_manager AND (
    NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
    OR NEW.task_type IS DISTINCT FROM OLD.task_type
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
  ) THEN
    RAISE EXCEPTION 'only the creator or a project manager can change task ownership' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'done' THEN
      NEW.previous_status := CASE WHEN OLD.status = 'done' THEN COALESCE(OLD.previous_status, 'in_progress') ELSE OLD.status END;
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
DROP TRIGGER IF EXISTS protect_task_write ON public.tasks;
CREATE TRIGGER protect_task_write
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.protect_task_write();

DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view permitted tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create permitted tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update permitted tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete permitted tasks" ON public.tasks;

CREATE POLICY "Users can view permitted tasks" ON public.tasks FOR SELECT TO authenticated
USING (
  private.user_has_role((SELECT auth.uid()), 'admin_joia')
  OR (task_type = 'personal' AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid())))
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1)
);

CREATE POLICY "Users can create permitted tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND assigned_to IS NOT NULL
  AND (
    (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL)
    OR (
      task_type = 'project'
      AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
      AND private.user_project_access_level(assigned_to, project_id) >= 1
      AND EXISTS (
        SELECT 1 FROM public.projects project
        WHERE project.id = project_id AND public.tasks.client_id IS NOT DISTINCT FROM project.client_id
      )
    )
  )
);

CREATE POLICY "Users can update permitted tasks" ON public.tasks FOR UPDATE TO authenticated
USING (
  private.user_has_role((SELECT auth.uid()), 'admin_joia')
  OR created_by = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 2)
)
WITH CHECK (
  assigned_to IS NOT NULL
  AND (
    (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL
      AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid())
           OR private.user_has_role((SELECT auth.uid()), 'admin_joia')))
    OR (
      task_type = 'project'
      AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1
      AND private.user_project_access_level(assigned_to, project_id) >= 1
      AND EXISTS (
        SELECT 1 FROM public.projects project
        WHERE project.id = project_id AND public.tasks.client_id IS NOT DISTINCT FROM project.client_id
      )
    )
  )
);

CREATE POLICY "Users can delete permitted tasks" ON public.tasks FOR DELETE TO authenticated
USING (
  private.user_has_role((SELECT auth.uid()), 'admin_joia')
  OR (task_type = 'personal' AND created_by = (SELECT auth.uid()))
  OR (task_type = 'project' AND project_id IS NOT NULL AND (
    private.user_project_access_level((SELECT auth.uid()), project_id) >= 3
    OR (created_by = (SELECT auth.uid()) AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1)
  ))
);

DROP POLICY IF EXISTS "Users can view permitted task history" ON public.task_history;
CREATE POLICY "Users can view permitted task history" ON public.task_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id));

DROP POLICY IF EXISTS "Authenticated users can view task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Authenticated users can insert task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can view comments from permitted tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can comment on permitted tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own permitted comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own permitted comments" ON public.task_comments;

CREATE POLICY "Users can view comments from permitted tasks" ON public.task_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id));
CREATE POLICY "Users can comment on permitted tasks" ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id));
CREATE POLICY "Users can update their own permitted comments" ON public.task_comments FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id))
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id));
CREATE POLICY "Users can delete their own permitted comments" ON public.task_comments FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id));

CREATE OR REPLACE FUNCTION private.audit_task_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  history_action text;
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_history (task_id, user_id, action, previous_value, new_value)
    VALUES (NEW.id, actor_id, 'created', NULL, jsonb_build_object('status', NEW.status));
    IF NEW.status = 'done' THEN
      INSERT INTO public.task_history (task_id, user_id, action, previous_value, new_value)
      VALUES (
        NEW.id,
        actor_id,
        'completed',
        jsonb_build_object('status', NEW.previous_status),
        jsonb_build_object('status', NEW.status)
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    history_action := CASE
      WHEN NEW.status = 'done' THEN 'completed'
      WHEN OLD.status = 'done' THEN 'reopened'
      ELSE 'status_changed'
    END;

    INSERT INTO public.task_history (task_id, user_id, action, previous_value, new_value)
    VALUES (
      NEW.id,
      actor_id,
      history_action,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_task_status_change ON public.tasks;
DROP TRIGGER IF EXISTS audit_task_change ON public.tasks;
DROP TRIGGER IF EXISTS audit_task_created ON public.tasks;
CREATE TRIGGER audit_task_created
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.audit_task_change();
CREATE TRIGGER audit_task_change
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.audit_task_change();

REVOKE ALL ON FUNCTION private.audit_task_change() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT ON public.task_history TO authenticated;
REVOKE ALL ON public.project_members, public.tasks, public.task_history FROM anon;
