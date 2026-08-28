-- P2: turn the existing meeting record into an operational workspace while
-- preserving legacy rows, the single tasks table and the documents module.

BEGIN;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_status_check;

UPDATE public.meetings
SET status = CASE
  WHEN lower(COALESCE(status, '')) IN ('realizada', 'concluída', 'concluida', 'completed', 'done') THEN 'Realizada'
  WHEN lower(COALESCE(status, '')) IN ('em andamento', 'in_progress', 'in progress') THEN 'Em andamento'
  WHEN lower(COALESCE(status, '')) IN ('cancelada', 'cancelled') THEN 'Cancelada'
  ELSE 'Agendada'
END,
notes = COALESCE(notes, minutes),
end_date = COALESCE(
  end_date,
  date + make_interval(mins => CASE WHEN duration ~ '^[0-9]+$' THEN duration::integer ELSE 60 END)
);

ALTER TABLE public.meetings
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'Agendada',
  ADD CONSTRAINT meetings_status_check CHECK (status IN ('Agendada', 'Em andamento', 'Realizada', 'Cancelada')),
  ADD CONSTRAINT meetings_end_after_start_check CHECK (end_date IS NULL OR date IS NULL OR end_date > date);

CREATE TABLE public.meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  discussed boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id uuid REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL,
  description text NOT NULL CHECK (length(trim(description)) > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_next_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (length(trim(description)) > 0),
  responsible_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsible_name text,
  due_date date,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  participant_type text NOT NULL CHECK (participant_type IN ('internal', 'external')),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  company text,
  email text,
  phone text,
  position text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meeting_participants_type_check CHECK (
    (participant_type = 'internal' AND user_id IS NOT NULL)
    OR (participant_type = 'external' AND user_id IS NULL)
  )
);

CREATE UNIQUE INDEX meeting_participants_internal_unique_idx
  ON public.meeting_participants (meeting_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX meeting_agenda_items_order_idx ON public.meeting_agenda_items (meeting_id, position, created_at);
CREATE INDEX meeting_decisions_meeting_idx ON public.meeting_decisions (meeting_id, created_at);
CREATE INDEX meeting_next_steps_meeting_idx ON public.meeting_next_steps (meeting_id, completed_at, due_date);
CREATE INDEX meeting_participants_meeting_idx ON public.meeting_participants (meeting_id, participant_type);

INSERT INTO public.meeting_agenda_items (meeting_id, title, description, position, created_by)
SELECT id, 'Pauta inicial', agenda, 0, created_by
FROM public.meetings
WHERE NULLIF(trim(agenda), '') IS NOT NULL;

INSERT INTO public.meeting_decisions (meeting_id, description, created_by)
SELECT id, decisions, created_by
FROM public.meetings
WHERE NULLIF(trim(decisions), '') IS NOT NULL
  AND decisions !~* '^https?://';

UPDATE public.meetings
SET meeting_link = decisions
WHERE decisions ~* '^https?://'
  AND meeting_link IS NULL;

INSERT INTO public.meeting_participants (meeting_id, participant_type, name, created_by)
SELECT DISTINCT meeting.id, 'external', trim(participant_name), meeting.created_by
FROM public.meetings AS meeting
CROSS JOIN LATERAL unnest(COALESCE(meeting.participants, ARRAY[]::text[])) AS participant_name
WHERE NULLIF(trim(participant_name), '') IS NOT NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source_meeting_id uuid REFERENCES public.meetings(id),
  ADD COLUMN IF NOT EXISTS source_decision_id uuid REFERENCES public.meeting_decisions(id),
  ADD COLUMN IF NOT EXISTS source_next_step_id uuid REFERENCES public.meeting_next_steps(id);

CREATE INDEX tasks_source_meeting_idx ON public.tasks (source_meeting_id) WHERE source_meeting_id IS NOT NULL;
CREATE UNIQUE INDEX tasks_source_decision_unique_idx ON public.tasks (source_decision_id) WHERE source_decision_id IS NOT NULL;
CREATE UNIQUE INDEX tasks_source_next_step_unique_idx ON public.tasks (source_next_step_id) WHERE source_next_step_id IS NOT NULL;

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_workspace_created_idx ON public.activity_logs (workspace_id, created_at DESC);
CREATE INDEX activity_logs_client_created_idx ON public.activity_logs (client_id, created_at DESC) WHERE client_id IS NOT NULL;
CREATE INDEX activity_logs_project_created_idx ON public.activity_logs (project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX activity_logs_meeting_created_idx ON public.activity_logs (meeting_id, created_at DESC) WHERE meeting_id IS NOT NULL;
CREATE INDEX meetings_operational_queue_idx ON public.meetings (workspace_id, status, date);
CREATE INDEX meetings_responsible_date_idx ON public.meetings (responsible_user_id, date) WHERE responsible_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.prepare_meeting_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  scoped_workspace_id uuid;
  scoped_client_id uuid;
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT project.workspace_id, project.client_id
      INTO scoped_workspace_id, scoped_client_id
    FROM public.projects AS project
    WHERE project.id = NEW.project_id;
    IF scoped_workspace_id IS NULL THEN
      RAISE EXCEPTION 'meeting requires a valid project' USING ERRCODE = '23514';
    END IF;
    IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM scoped_client_id THEN
      RAISE EXCEPTION 'meeting project and client do not match' USING ERRCODE = '23514';
    END IF;
    NEW.client_id := scoped_client_id;
  ELSIF NEW.client_id IS NOT NULL THEN
    SELECT client.workspace_id INTO scoped_workspace_id
    FROM public.clients AS client WHERE client.id = NEW.client_id;
    IF scoped_workspace_id IS NULL THEN
      RAISE EXCEPTION 'meeting requires a valid client' USING ERRCODE = '23514';
    END IF;
  ELSE
    scoped_workspace_id := private.current_workspace_id();
  END IF;

  IF scoped_workspace_id IS NULL THEN
    RAISE EXCEPTION 'meeting requires a workspace membership' USING ERRCODE = '23514';
  END IF;
  NEW.workspace_id := scoped_workspace_id;
  NEW.updated_by := actor_id;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := actor_id;
  ELSE
    IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'meeting audit scope is immutable' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status = 'Em andamento' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.started_at := COALESCE(NEW.started_at, now());
  END IF;
  IF NEW.status = 'Realizada' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.started_at := COALESCE(NEW.started_at, now());
    NEW.ended_at := COALESCE(NEW.ended_at, now());
    NEW.completed_by := actor_id;
  ELSIF NEW.status <> 'Realizada' THEN
    NEW.ended_at := NULL;
    NEW.completed_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_meeting_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_workspace_id ON public.meetings;
DROP TRIGGER IF EXISTS prepare_meeting_write ON public.meetings;
CREATE TRIGGER prepare_meeting_write
BEFORE INSERT OR UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION private.prepare_meeting_write();

CREATE OR REPLACE FUNCTION private.protect_task_meeting_origin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  origin public.meetings%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.source_meeting_id IS DISTINCT FROM OLD.source_meeting_id
    OR NEW.source_decision_id IS DISTINCT FROM OLD.source_decision_id
    OR NEW.source_next_step_id IS DISTINCT FROM OLD.source_next_step_id
  ) THEN
    RAISE EXCEPTION 'task meeting origin is immutable' USING ERRCODE = '42501';
  END IF;

  IF NEW.source_decision_id IS NOT NULL THEN
    SELECT decision.meeting_id INTO NEW.source_meeting_id
    FROM public.meeting_decisions AS decision WHERE decision.id = NEW.source_decision_id;
    IF NEW.source_meeting_id IS NULL THEN RAISE EXCEPTION 'invalid meeting decision origin' USING ERRCODE = '23514'; END IF;
  END IF;
  IF NEW.source_next_step_id IS NOT NULL THEN
    SELECT next_step.meeting_id INTO NEW.source_meeting_id
    FROM public.meeting_next_steps AS next_step WHERE next_step.id = NEW.source_next_step_id;
    IF NEW.source_meeting_id IS NULL THEN RAISE EXCEPTION 'invalid meeting next step origin' USING ERRCODE = '23514'; END IF;
  END IF;
  IF NEW.source_decision_id IS NOT NULL AND NEW.source_next_step_id IS NOT NULL THEN
    RAISE EXCEPTION 'task can have only one meeting item origin' USING ERRCODE = '23514';
  END IF;

  IF NEW.source_meeting_id IS NOT NULL THEN
    SELECT * INTO origin FROM public.meetings WHERE id = NEW.source_meeting_id;
    IF origin.id IS NULL THEN RAISE EXCEPTION 'invalid meeting origin' USING ERRCODE = '23514'; END IF;
    IF origin.project_id IS NOT NULL THEN
      NEW.task_type := 'project'; NEW.project_id := origin.project_id; NEW.client_id := origin.client_id;
    ELSIF origin.client_id IS NOT NULL THEN
      NEW.task_type := 'client'; NEW.project_id := NULL; NEW.client_id := origin.client_id;
    ELSIF NEW.task_type <> 'personal' THEN
      RAISE EXCEPTION 'internal meeting actions must create personal tasks' USING ERRCODE = '23514';
    END IF;
    NEW.workspace_id := origin.workspace_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_task_meeting_origin() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_task_meeting_origin ON public.tasks;
CREATE TRIGGER protect_task_meeting_origin
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.protect_task_meeting_origin();

CREATE OR REPLACE FUNCTION private.log_meeting_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  action_name text;
  description_text text;
BEGIN
  IF TG_OP = 'INSERT' THEN action_name := 'meeting_created'; description_text := 'Reunião criada';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN action_name := 'meeting_status_changed'; description_text := 'Status alterado de ' || OLD.status || ' para ' || NEW.status;
  ELSE action_name := 'meeting_updated'; description_text := 'Reunião atualizada';
  END IF;
  INSERT INTO public.activity_logs (workspace_id, actor_id, action_type, entity_type, entity_id, client_id, project_id, meeting_id, title, description, metadata)
  VALUES (NEW.workspace_id, auth.uid(), action_name, 'meeting', NEW.id, NEW.client_id, NEW.project_id, NEW.id, NEW.title, description_text, jsonb_build_object('status', NEW.status));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.log_meeting_child_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent public.meetings%ROWTYPE;
  row_meeting_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.meeting_id ELSE NEW.meeting_id END;
  item_description text;
  action_name text;
BEGIN
  SELECT * INTO parent FROM public.meetings WHERE id = row_meeting_id;
  IF TG_TABLE_NAME = 'meeting_decisions' THEN
    item_description := CASE WHEN TG_OP = 'DELETE' THEN OLD.description ELSE NEW.description END;
    action_name := CASE WHEN TG_OP = 'INSERT' THEN 'decision_created' WHEN TG_OP = 'DELETE' THEN 'decision_deleted' ELSE 'decision_updated' END;
  ELSIF TG_TABLE_NAME = 'meeting_next_steps' THEN
    item_description := CASE WHEN TG_OP = 'DELETE' THEN OLD.description ELSE NEW.description END;
    action_name := CASE WHEN TG_OP = 'INSERT' THEN 'next_step_created' WHEN TG_OP = 'DELETE' THEN 'next_step_deleted' WHEN NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN 'next_step_completion_changed' ELSE 'next_step_updated' END;
  ELSE
    item_description := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    action_name := CASE WHEN TG_OP = 'INSERT' THEN 'agenda_item_created' WHEN TG_OP = 'DELETE' THEN 'agenda_item_deleted' ELSE 'agenda_item_updated' END;
  END IF;
  INSERT INTO public.activity_logs (workspace_id, actor_id, action_type, entity_type, entity_id, client_id, project_id, meeting_id, title, description)
  VALUES (parent.workspace_id, auth.uid(), action_name, TG_TABLE_NAME, CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END, parent.client_id, parent.project_id, parent.id, parent.title, item_description);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION private.log_meeting_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE parent public.meetings%ROWTYPE;
BEGIN
  IF NEW.source_meeting_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT * INTO parent FROM public.meetings WHERE id = NEW.source_meeting_id;
  INSERT INTO public.activity_logs (workspace_id, actor_id, action_type, entity_type, entity_id, client_id, project_id, meeting_id, task_id, title, description, metadata)
  VALUES (parent.workspace_id, auth.uid(), CASE WHEN TG_OP = 'INSERT' THEN 'meeting_task_created' ELSE 'meeting_task_status_changed' END, 'task', NEW.id, parent.client_id, parent.project_id, parent.id, NEW.id, NEW.title, CASE WHEN TG_OP = 'INSERT' THEN 'Tarefa criada a partir da reunião' ELSE 'Status da tarefa alterado' END, jsonb_build_object('status', NEW.status));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.log_meeting_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.log_meeting_child_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.log_meeting_task_activity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER log_meeting_activity AFTER INSERT OR UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION private.log_meeting_activity();
CREATE TRIGGER log_meeting_agenda_activity AFTER INSERT OR UPDATE OR DELETE ON public.meeting_agenda_items FOR EACH ROW EXECUTE FUNCTION private.log_meeting_child_activity();
CREATE TRIGGER log_meeting_decision_activity AFTER INSERT OR UPDATE OR DELETE ON public.meeting_decisions FOR EACH ROW EXECUTE FUNCTION private.log_meeting_child_activity();
CREATE TRIGGER log_meeting_next_step_activity AFTER INSERT OR UPDATE OR DELETE ON public.meeting_next_steps FOR EACH ROW EXECUTE FUNCTION private.log_meeting_child_activity();
CREATE TRIGGER log_meeting_task_activity AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION private.log_meeting_task_activity();

CREATE TRIGGER update_meeting_agenda_items_updated_at BEFORE UPDATE ON public.meeting_agenda_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_decisions_updated_at BEFORE UPDATE ON public.meeting_decisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_next_steps_updated_at BEFORE UPDATE ON public.meeting_next_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_next_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meetings_member_select ON public.meetings;
DROP POLICY IF EXISTS meetings_member_insert ON public.meetings;
DROP POLICY IF EXISTS meetings_member_update ON public.meetings;
DROP POLICY IF EXISTS meetings_manager_delete ON public.meetings;
CREATE POLICY meetings_workspace_select ON public.meetings FOR SELECT TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 1);
CREATE POLICY meetings_workspace_insert ON public.meetings FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);
CREATE POLICY meetings_workspace_update ON public.meetings FOR UPDATE TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2) WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);
CREATE POLICY meetings_workspace_delete ON public.meetings FOR DELETE TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);

DO $$
DECLARE child_table text;
BEGIN
  FOREACH child_table IN ARRAY ARRAY['meeting_agenda_items','meeting_decisions','meeting_next_steps','meeting_participants'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.meetings meeting WHERE meeting.id = meeting_id AND COALESCE(private.workspace_access_level(meeting.workspace_id), 0) >= 1))', child_table || '_select', child_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.meetings meeting WHERE meeting.id = meeting_id AND COALESCE(private.workspace_access_level(meeting.workspace_id), 0) >= 2))', child_table || '_insert', child_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.meetings meeting WHERE meeting.id = meeting_id AND COALESCE(private.workspace_access_level(meeting.workspace_id), 0) >= 2)) WITH CHECK (EXISTS (SELECT 1 FROM public.meetings meeting WHERE meeting.id = meeting_id AND COALESCE(private.workspace_access_level(meeting.workspace_id), 0) >= 2))', child_table || '_update', child_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.meetings meeting WHERE meeting.id = meeting_id AND COALESCE(private.workspace_access_level(meeting.workspace_id), 0) >= 2))', child_table || '_delete', child_table);
  END LOOP;
END $$;

CREATE POLICY activity_logs_workspace_select ON public.activity_logs FOR SELECT TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 1);

REVOKE ALL ON public.meetings, public.meeting_agenda_items, public.meeting_decisions, public.meeting_next_steps, public.meeting_participants, public.activity_logs FROM anon;
REVOKE ALL ON public.meeting_agenda_items, public.meeting_decisions, public.meeting_next_steps, public.meeting_participants, public.activity_logs FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_agenda_items, public.meeting_decisions, public.meeting_next_steps, public.meeting_participants TO authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;

COMMIT;
