BEGIN;

CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  start_notes text,
  end_notes text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_checkins_user_date_key UNIQUE (user_id, checkin_date),
  CONSTRAINT daily_checkins_start_notes_length CHECK (char_length(COALESCE(start_notes, '')) <= 2000),
  CONSTRAINT daily_checkins_end_notes_length CHECK (char_length(COALESCE(end_notes, '')) <= 2000),
  CONSTRAINT daily_checkins_time_order CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE public.daily_focus_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  focus_date date NOT NULL DEFAULT CURRENT_DATE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 99),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_focus_tasks_user_date_task_key UNIQUE (user_id, focus_date, task_id)
);

CREATE TABLE public.internal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('task_assigned', 'due_soon', 'overdue', 'comment', 'status_changed', 'blocked')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  body text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT internal_notifications_user_dedupe_key UNIQUE (user_id, dedupe_key)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_focus_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX daily_checkins_workspace_date_idx ON public.daily_checkins (workspace_id, checkin_date DESC);
CREATE INDEX daily_focus_tasks_user_date_position_idx ON public.daily_focus_tasks (user_id, focus_date, position);
CREATE INDEX internal_notifications_user_unread_idx ON public.internal_notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX tasks_assignee_operational_idx ON public.tasks (assigned_to, status, due_date, priority) WHERE assigned_to IS NOT NULL;
CREATE INDEX tasks_client_attention_idx ON public.tasks (client_id, status, due_date, priority) WHERE client_id IS NOT NULL AND status <> 'done';
CREATE INDEX tasks_project_attention_idx ON public.tasks (project_id, status, due_date, priority) WHERE project_id IS NOT NULL AND status <> 'done';
CREATE INDEX task_history_user_created_idx ON public.task_history (user_id, created_at DESC);
CREATE INDEX projects_end_date_status_idx ON public.projects (end_date, status) WHERE end_date IS NOT NULL;

CREATE OR REPLACE FUNCTION private.set_operational_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER daily_checkins_updated_at
BEFORE UPDATE ON public.daily_checkins
FOR EACH ROW EXECUTE FUNCTION private.set_operational_updated_at();

CREATE TRIGGER daily_focus_tasks_updated_at
BEFORE UPDATE ON public.daily_focus_tasks
FOR EACH ROW EXECUTE FUNCTION private.set_operational_updated_at();

CREATE OR REPLACE FUNCTION private.protect_daily_checkin_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := actor_id;
    NEW.workspace_id := private.current_workspace_id();
    IF NEW.workspace_id IS NULL THEN
      RAISE EXCEPTION 'workspace membership required' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.checkin_date IS DISTINCT FROM OLD.checkin_date THEN
    RAISE EXCEPTION 'check-in identity is immutable' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_daily_checkin_write
BEFORE INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW EXECUTE FUNCTION private.protect_daily_checkin_write();

CREATE OR REPLACE FUNCTION private.protect_daily_focus_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  task_workspace_id uuid;
  task_assignee_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT task.workspace_id, task.assigned_to
  INTO task_workspace_id, task_assignee_id
  FROM public.tasks task
  WHERE task.id = NEW.task_id;

  IF task_assignee_id IS DISTINCT FROM actor_id OR task_workspace_id IS NULL THEN
    RAISE EXCEPTION 'only assigned tasks can be added to daily focus' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := actor_id;
    NEW.workspace_id := task_workspace_id;
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.focus_date IS DISTINCT FROM OLD.focus_date
     OR NEW.task_id IS DISTINCT FROM OLD.task_id THEN
    RAISE EXCEPTION 'daily focus identity is immutable' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_daily_focus_write
BEFORE INSERT OR UPDATE ON public.daily_focus_tasks
FOR EACH ROW EXECUTE FUNCTION private.protect_daily_focus_write();

CREATE OR REPLACE FUNCTION private.protect_internal_notification_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.notification_type IS DISTINCT FROM OLD.notification_type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.task_id IS DISTINCT FROM OLD.task_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'only notification read state can be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_internal_notification_write
BEFORE UPDATE ON public.internal_notifications
FOR EACH ROW EXECUTE FUNCTION private.protect_internal_notification_write();

CREATE POLICY daily_checkins_own_select ON public.daily_checkins FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
CREATE POLICY daily_checkins_own_insert ON public.daily_checkins FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY daily_checkins_own_update ON public.daily_checkins FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY daily_focus_tasks_own_select ON public.daily_focus_tasks FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
CREATE POLICY daily_focus_tasks_own_insert ON public.daily_focus_tasks FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id AND task.assigned_to = (SELECT auth.uid())));
CREATE POLICY daily_focus_tasks_own_update ON public.daily_focus_tasks FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.tasks task WHERE task.id = task_id AND task.assigned_to = (SELECT auth.uid())));
CREATE POLICY daily_focus_tasks_own_delete ON public.daily_focus_tasks FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY internal_notifications_own_select ON public.internal_notifications FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
CREATE POLICY internal_notifications_own_update ON public.internal_notifications FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.daily_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_focus_tasks TO authenticated;
GRANT SELECT, UPDATE ON public.internal_notifications TO authenticated;
REVOKE ALL ON public.daily_checkins, public.daily_focus_tasks, public.internal_notifications FROM anon;

CREATE OR REPLACE FUNCTION private.notify_task_operational_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    INSERT INTO public.internal_notifications (workspace_id, user_id, notification_type, title, body, task_id, client_id, project_id, dedupe_key)
    VALUES (NEW.workspace_id, NEW.assigned_to, 'task_assigned', 'Nova tarefa atribuída', NEW.title, NEW.id, NEW.client_id, NEW.project_id, 'assigned:' || NEW.id::text || ':' || NEW.assigned_to::text)
    ON CONFLICT (user_id, dedupe_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, read_at = NULL, created_at = now();
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_to IS NOT NULL THEN
    IF NEW.status = 'blocked' THEN
      INSERT INTO public.internal_notifications (workspace_id, user_id, notification_type, title, body, task_id, client_id, project_id, dedupe_key)
      VALUES (NEW.workspace_id, NEW.assigned_to, 'blocked', 'Tarefa bloqueada', NEW.title, NEW.id, NEW.client_id, NEW.project_id, 'blocked:' || NEW.id::text)
      ON CONFLICT (user_id, dedupe_key) DO UPDATE SET body = EXCLUDED.body, read_at = NULL, created_at = now();
    ELSIF actor_id IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.internal_notifications (workspace_id, user_id, notification_type, title, body, task_id, client_id, project_id, dedupe_key)
      VALUES (NEW.workspace_id, NEW.assigned_to, 'status_changed', 'Status da tarefa atualizado', NEW.title, NEW.id, NEW.client_id, NEW.project_id, 'status:' || NEW.id::text || ':' || NEW.updated_at::text)
      ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_task_operational_change
AFTER INSERT OR UPDATE OF assigned_to, status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.notify_task_operational_change();

CREATE OR REPLACE FUNCTION private.notify_task_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient_id uuid;
  task_row public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO task_row FROM public.tasks WHERE id = NEW.task_id;
  recipient_id := COALESCE(task_row.assigned_to, task_row.created_by);
  IF recipient_id IS NOT NULL AND recipient_id IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.internal_notifications (workspace_id, user_id, notification_type, title, body, task_id, client_id, project_id, dedupe_key)
    VALUES (task_row.workspace_id, recipient_id, 'comment', 'Novo comentário em tarefa', task_row.title, task_row.id, task_row.client_id, task_row.project_id, 'comment:' || NEW.id::text)
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_task_comment
AFTER INSERT ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION private.notify_task_comment();

CREATE OR REPLACE FUNCTION public.refresh_my_task_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  inserted_count integer := 0;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.internal_notifications notification
  WHERE notification.user_id = actor_id
    AND notification.notification_type IN ('due_soon', 'overdue');

  INSERT INTO public.internal_notifications (workspace_id, user_id, notification_type, title, body, task_id, client_id, project_id, dedupe_key)
  SELECT task.workspace_id, actor_id,
    CASE WHEN task.due_date < CURRENT_DATE THEN 'overdue' ELSE 'due_soon' END,
    CASE WHEN task.due_date < CURRENT_DATE THEN 'Tarefa atrasada' ELSE 'Prazo próximo' END,
    task.title,
    task.id,
    task.client_id,
    task.project_id,
    CASE WHEN task.due_date < CURRENT_DATE THEN 'overdue:' ELSE 'due:' END || task.id::text
  FROM public.tasks task
  WHERE task.assigned_to = actor_id
    AND task.status <> 'done'
    AND task.due_date IS NOT NULL
    AND task.due_date <= CURRENT_DATE + 3
  ON CONFLICT (user_id, dedupe_key) DO UPDATE SET body = EXCLUDED.body, read_at = NULL, created_at = now();

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION private.set_operational_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.protect_daily_checkin_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.protect_daily_focus_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.protect_internal_notification_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_task_operational_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_task_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_my_task_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_task_notifications() TO authenticated;

COMMIT;
