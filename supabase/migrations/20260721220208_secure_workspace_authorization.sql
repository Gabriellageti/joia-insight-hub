-- Secure multi-workspace authorization for all corporate data.
-- Existing records are assigned to one legacy workspace. Only users that already
-- have a trusted public.user_roles record are backfilled as members. New/unmapped
-- accounts receive no access by default.

BEGIN;

CREATE TYPE public.workspace_role AS ENUM ('viewer', 'member', 'manager', 'admin', 'owner');

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  sidebar_compact boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX workspace_members_one_default_per_user_idx
  ON public.workspace_members (user_id) WHERE is_default;
CREATE INDEX workspace_members_user_workspace_idx
  ON public.workspace_members (user_id, workspace_id, role);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.workspace_access_level(_workspace_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
    AND member.user_id = (SELECT auth.uid())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT member.workspace_id
  FROM public.workspace_members AS member
  WHERE member.user_id = (SELECT auth.uid())
  ORDER BY member.is_default DESC, member.created_at, member.workspace_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.can_manage_finance(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.workspace_access_level(_workspace_id) >= 2, false)
    AND (
      COALESCE(private.workspace_access_level(_workspace_id) >= 3, false)
      OR EXISTS (
      SELECT 1 FROM public.user_roles AS role_entry
      WHERE role_entry.user_id = (SELECT auth.uid())
        AND role_entry.role IN ('admin_joia', 'financeiro_joia')
      )
    )
$$;

CREATE OR REPLACE FUNCTION private.storage_workspace_id(_object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN split_part(_object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN split_part(_object_name, '/', 1)::uuid
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION private.workspace_access_level(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_workspace_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_finance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.storage_workspace_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.workspace_access_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_workspace_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_finance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.storage_workspace_id(text) TO authenticated;

INSERT INTO public.workspaces (id, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000001', 'JoIA Ops — Legado', 'joia-ops-legado', NULL)
ON CONFLICT (id) DO NOTHING;

WITH ranked_roles AS (
  SELECT
    roles.user_id,
    CASE
      WHEN bool_or(roles.role = 'admin_joia') THEN 'owner'::public.workspace_role
      WHEN bool_or(roles.role = 'gestor_projetos') THEN 'manager'::public.workspace_role
      WHEN bool_or(roles.role IN ('analista', 'financeiro_joia', 'marketing_joia', 'colaborador_onboarding'))
        THEN 'member'::public.workspace_role
      ELSE 'member'::public.workspace_role
    END AS workspace_role
  FROM public.user_roles AS roles
  WHERE roles.role IN (
    'admin_joia', 'gestor_projetos', 'financeiro_joia',
    'analista', 'marketing_joia', 'colaborador_onboarding'
  )
  GROUP BY roles.user_id
)
INSERT INTO public.workspace_members (workspace_id, user_id, role, is_default, created_by)
SELECT '00000000-0000-0000-0000-000000000001', ranked.user_id, ranked.workspace_role, true, NULL
FROM ranked_roles AS ranked
ON CONFLICT (workspace_id, user_id) DO UPDATE
SET role = EXCLUDED.role, is_default = true, updated_at = now();

-- Every corporate table receives an immutable tenant key. The default resolves
-- from the caller's trusted membership and is NULL for unaffiliated accounts,
-- causing writes to fail closed.
ALTER TABLE public.clients ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.projects ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.project_audit_logs ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.meetings ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.employees ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.leads ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.diagnostics ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.indicators ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.documents ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.playbooks ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.financial_records ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.opportunities ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.deliverables ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.content_items ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.contracts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.client_contacts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.diagnostic_templates ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();
ALTER TABLE public.client_journey_events ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id();

UPDATE public.clients SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.projects SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.project_audit_logs SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.meetings SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), (SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.employees SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.leads SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.diagnostics SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), (SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.indicators SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), (SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.documents SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), (SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.playbooks SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.financial_records SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), (SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.opportunities SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), (SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.deliverables SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.content_items SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.contracts SET workspace_id = COALESCE((SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id), (SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.client_contacts SET workspace_id = COALESCE((SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;
UPDATE public.diagnostic_templates SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.client_journey_events SET workspace_id = COALESCE((SELECT c.workspace_id FROM public.clients c WHERE c.id = client_id), '00000000-0000-0000-0000-000000000001') WHERE workspace_id IS NULL;

ALTER TABLE public.clients ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.project_audit_logs ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.employees ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.diagnostics ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.indicators ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.documents ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.playbooks ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.financial_records ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.opportunities ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.deliverables ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.content_items ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.contracts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.client_contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.diagnostic_templates ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.client_journey_events ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX clients_workspace_idx ON public.clients (workspace_id);
CREATE INDEX projects_workspace_idx ON public.projects (workspace_id);
CREATE INDEX meetings_workspace_idx ON public.meetings (workspace_id);
CREATE INDEX employees_workspace_idx ON public.employees (workspace_id);
CREATE INDEX leads_workspace_idx ON public.leads (workspace_id);
CREATE INDEX diagnostics_workspace_idx ON public.diagnostics (workspace_id);
CREATE INDEX indicators_workspace_idx ON public.indicators (workspace_id);
CREATE INDEX documents_workspace_idx ON public.documents (workspace_id);
CREATE INDEX playbooks_workspace_idx ON public.playbooks (workspace_id);
CREATE INDEX financial_records_workspace_idx ON public.financial_records (workspace_id);
CREATE INDEX opportunities_workspace_idx ON public.opportunities (workspace_id);
CREATE INDEX deliverables_workspace_idx ON public.deliverables (workspace_id);
CREATE INDEX content_items_workspace_idx ON public.content_items (workspace_id);
CREATE INDEX contracts_workspace_idx ON public.contracts (workspace_id);
CREATE INDEX client_contacts_workspace_idx ON public.client_contacts (workspace_id);
CREATE INDEX diagnostic_templates_workspace_idx ON public.diagnostic_templates (workspace_id);
CREATE INDEX client_journey_events_workspace_idx ON public.client_journey_events (workspace_id);

CREATE OR REPLACE FUNCTION private.prevent_workspace_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'workspace_id is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.prevent_workspace_reassignment() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'clients','projects','project_audit_logs','meetings','employees','leads',
    'diagnostics','indicators','documents','playbooks','financial_records','opportunities','deliverables',
    'content_items','contracts','client_contacts','diagnostic_templates','client_journey_events'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS protect_workspace_id ON public.%I', table_name);
    EXECUTE format('CREATE TRIGGER protect_workspace_id BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.prevent_workspace_reassignment()', table_name);
  END LOOP;
END $$;

-- Remove every historical policy from the affected corporate tables before
-- installing the fail-closed model below.
DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (ARRAY[
      'clients','projects','project_audit_logs','meetings','employees','leads',
      'diagnostics','indicators','documents','playbooks','financial_records','opportunities','deliverables',
      'content_items','contracts','client_contacts','diagnostic_templates','template_sections',
      'template_questions','template_opportunity_rules','indicator_history','client_journey_events'
    ])
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END $$;

CREATE POLICY workspaces_member_select ON public.workspaces FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(id), 0) >= 1);
CREATE POLICY workspaces_admin_update ON public.workspaces FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(id), 0) >= 4)
WITH CHECK (COALESCE(private.workspace_access_level(id), 0) >= 4);

CREATE POLICY workspace_members_member_select ON public.workspace_members FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 1);
CREATE POLICY workspace_members_admin_insert ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4 AND (role <> 'owner' OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 5));
CREATE POLICY workspace_members_admin_update ON public.workspace_members FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4 AND (role <> 'owner' OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 5))
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4 AND (role <> 'owner' OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 5));
CREATE POLICY workspace_members_admin_delete ON public.workspace_members FOR DELETE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4 AND user_id <> (SELECT auth.uid()) AND (role <> 'owner' OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 5));

CREATE OR REPLACE FUNCTION private.protect_workspace_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.workspace_id <> OLD.workspace_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'workspace and user are immutable' USING ERRCODE = '42501';
  END IF;
  IF OLD.role = 'owner' AND (TG_OP = 'DELETE' OR NEW.role <> 'owner')
     AND (SELECT count(*) FROM public.workspace_members WHERE workspace_id = OLD.workspace_id AND role = 'owner') <= 1 THEN
    RAISE EXCEPTION 'workspace must retain an owner' USING ERRCODE = '23514';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_workspace_membership() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_workspace_membership_before_write
BEFORE UPDATE OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION private.protect_workspace_membership();

CREATE POLICY user_preferences_self_select ON public.user_preferences FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY user_preferences_self_insert ON public.user_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY user_preferences_self_update ON public.user_preferences FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY profiles_workspace_select ON public.profiles FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members mine
    JOIN public.workspace_members theirs ON theirs.workspace_id = mine.workspace_id
    WHERE mine.user_id = (SELECT auth.uid()) AND theirs.user_id = id
  )
);
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY user_roles_self_select ON public.user_roles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Legacy role helpers accepted an arbitrary user id and were callable from the
-- Data API. Policies can still execute private helpers as their owning role,
-- but clients must not use them to enumerate another person's authorization.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.user_has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.task_comment_notification_dispatches (
  comment_id uuid NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'push')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, recipient_id, channel)
);
REVOKE ALL ON TABLE private.task_comment_notification_dispatches FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_task_comment_notification(
  _comment_id uuid,
  _recipient_id uuid,
  _channel text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO private.task_comment_notification_dispatches(comment_id, recipient_id, channel)
  VALUES (_comment_id, _recipient_id, _channel)
  ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_task_comment_notification(
  _comment_id uuid,
  _recipient_id uuid,
  _channel text
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  DELETE FROM private.task_comment_notification_dispatches
  WHERE comment_id = _comment_id AND recipient_id = _recipient_id AND channel = _channel;
$$;

REVOKE ALL ON FUNCTION public.claim_task_comment_notification(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_task_comment_notification(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_task_comment_notification(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_task_comment_notification(uuid, uuid, text) TO service_role;

-- Remove the historical global role bypass from project access. Workspace
-- administrators see projects through the workspace policy; project-level edits
-- still require an explicit project membership.
CREATE OR REPLACE FUNCTION private.user_project_access_level(_user_id uuid, _project_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _user_id IS NULL OR _project_id IS NULL THEN 0
    ELSE COALESCE((
      SELECT CASE member.access_level WHEN 'manager' THEN 3 WHEN 'editor' THEN 2 ELSE 1 END
      FROM public.project_members AS member
      WHERE member.project_id = _project_id AND member.user_id = _user_id
    ), 0)
  END
$$;

-- Workspace-wide operational tables. Members can read/write; managers delete.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'meetings','diagnostics','indicators','documents','opportunities','deliverables','client_contacts','client_journey_events'
  ] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2)', table_name || '_member_select', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2)', table_name || '_member_insert', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2) WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2)', table_name || '_member_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)', table_name || '_manager_delete', table_name);
  END LOOP;
END $$;

-- Administrative catalogues.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['clients','employees','leads','playbooks','content_items'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2)', table_name || '_member_select', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)', table_name || '_manager_insert', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3) WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)', table_name || '_manager_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4)', table_name || '_admin_delete', table_name);
  END LOOP;
END $$;

-- Projects retain project membership and gain tenant isolation.
CREATE POLICY projects_member_select ON public.projects FOR SELECT TO authenticated
USING (
  COALESCE(private.workspace_access_level(workspace_id), 0) >= 3
  OR (COALESCE(private.workspace_access_level(workspace_id), 0) >= 1
      AND private.user_project_access_level((SELECT auth.uid()), id) >= 1)
);
CREATE POLICY projects_manager_insert ON public.projects FOR INSERT TO authenticated
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);
CREATE POLICY projects_project_manager_update ON public.projects FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3 AND private.user_project_access_level((SELECT auth.uid()), id) >= 3)
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);
CREATE POLICY projects_admin_delete ON public.projects FOR DELETE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4);

-- Personal tasks remain private. Project tasks require explicit project access;
-- there is no workspace-global or legacy-role bypass.
DROP POLICY IF EXISTS "Users can view permitted tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create permitted tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update permitted tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete permitted tasks" ON public.tasks;
CREATE POLICY tasks_owner_or_project_select ON public.tasks FOR SELECT TO authenticated
USING (
  (task_type = 'personal' AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid())))
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1)
);
CREATE POLICY tasks_owner_or_project_insert ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid()) AND assigned_to IS NOT NULL AND (
    (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL AND assigned_to = (SELECT auth.uid()))
    OR (task_type = 'project' AND project_id IS NOT NULL
        AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
        AND private.user_project_access_level(assigned_to, project_id) >= 1)
  )
);
CREATE POLICY tasks_owner_or_project_update ON public.tasks FOR UPDATE TO authenticated
USING (
  (task_type = 'personal' AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid())))
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1)
)
WITH CHECK (
  (task_type = 'personal' AND project_id IS NULL AND client_id IS NULL
    AND created_by = (SELECT auth.uid()) AND assigned_to = (SELECT auth.uid()))
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1
      AND private.user_project_access_level(assigned_to, project_id) >= 1)
);
CREATE POLICY tasks_owner_or_project_delete ON public.tasks FOR DELETE TO authenticated
USING (
  (task_type = 'personal' AND created_by = (SELECT auth.uid()))
  OR (task_type = 'project' AND project_id IS NOT NULL
      AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 3)
);

CREATE POLICY project_audit_logs_member_select ON public.project_audit_logs FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2 AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1);
CREATE POLICY project_audit_logs_member_insert ON public.project_audit_logs FOR INSERT TO authenticated
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2 AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1);

-- Templates: members read, managers create/update, admins delete.
CREATE POLICY diagnostic_templates_member_select ON public.diagnostic_templates FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);
CREATE POLICY diagnostic_templates_manager_insert ON public.diagnostic_templates FOR INSERT TO authenticated
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);
CREATE POLICY diagnostic_templates_manager_update ON public.diagnostic_templates FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);
CREATE POLICY diagnostic_templates_admin_delete ON public.diagnostic_templates FOR DELETE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4);

CREATE POLICY template_sections_parent_select ON public.template_sections FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.diagnostic_templates t WHERE t.id = template_id));
CREATE POLICY template_sections_parent_insert ON public.template_sections FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_templates t WHERE t.id = template_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));
CREATE POLICY template_sections_parent_update ON public.template_sections FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.diagnostic_templates t WHERE t.id = template_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3))
WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_templates t WHERE t.id = template_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));
CREATE POLICY template_sections_parent_delete ON public.template_sections FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.diagnostic_templates t WHERE t.id = template_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));

CREATE POLICY template_questions_parent_select ON public.template_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.template_sections s JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE s.id = section_id));
CREATE POLICY template_questions_parent_insert ON public.template_questions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.template_sections s JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE s.id = section_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));
CREATE POLICY template_questions_parent_update ON public.template_questions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.template_sections s JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE s.id = section_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3))
WITH CHECK (EXISTS (SELECT 1 FROM public.template_sections s JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE s.id = section_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));
CREATE POLICY template_questions_parent_delete ON public.template_questions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.template_sections s JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE s.id = section_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));

CREATE POLICY template_rules_parent_select ON public.template_opportunity_rules FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.template_questions q JOIN public.template_sections s ON s.id = q.section_id JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE q.id = question_id));
CREATE POLICY template_rules_parent_insert ON public.template_opportunity_rules FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.template_questions q JOIN public.template_sections s ON s.id = q.section_id JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE q.id = question_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));
CREATE POLICY template_rules_parent_update ON public.template_opportunity_rules FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.template_questions q JOIN public.template_sections s ON s.id = q.section_id JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE q.id = question_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3))
WITH CHECK (EXISTS (SELECT 1 FROM public.template_questions q JOIN public.template_sections s ON s.id = q.section_id JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE q.id = question_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));
CREATE POLICY template_rules_parent_delete ON public.template_opportunity_rules FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.template_questions q JOIN public.template_sections s ON s.id = q.section_id JOIN public.diagnostic_templates t ON t.id = s.template_id WHERE q.id = question_id AND COALESCE(private.workspace_access_level(t.workspace_id), 0) >= 3));

CREATE POLICY indicator_history_parent_select ON public.indicator_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.indicators i WHERE i.id = indicator_id));
CREATE POLICY indicator_history_parent_insert ON public.indicator_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND COALESCE(private.workspace_access_level(i.workspace_id), 0) >= 2));
CREATE POLICY indicator_history_parent_update ON public.indicator_history FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND COALESCE(private.workspace_access_level(i.workspace_id), 0) >= 2))
WITH CHECK (EXISTS (SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND COALESCE(private.workspace_access_level(i.workspace_id), 0) >= 2));
CREATE POLICY indicator_history_parent_delete ON public.indicator_history FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND COALESCE(private.workspace_access_level(i.workspace_id), 0) >= 3));

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['financial_records','contracts'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.can_manage_finance(workspace_id))', table_name || '_finance_select', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.can_manage_finance(workspace_id))', table_name || '_finance_insert', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.can_manage_finance(workspace_id)) WITH CHECK (private.can_manage_finance(workspace_id))', table_name || '_finance_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.can_manage_finance(workspace_id))', table_name || '_finance_delete', table_name);
  END LOOP;
END $$;

-- Storage paths must start with the workspace UUID: <workspace>/<resource>/file.
-- Re-home legacy objects when their document record provides an unambiguous
-- workspace mapping. Unmatched objects are preserved but remain inaccessible.
UPDATE storage.objects AS object
SET name = document.workspace_id::text || '/legacy/' || object.name
FROM public.documents AS document
WHERE object.bucket_id = 'documents'
  AND private.storage_workspace_id(object.name) IS NULL
  AND split_part(document.url, '/documents/', 2) = object.name;

UPDATE public.documents AS document
SET url = document.workspace_id::text || '/legacy/' || split_part(document.url, '/documents/', 2)
WHERE document.url LIKE '%/documents/%'
  AND EXISTS (
    SELECT 1 FROM storage.objects AS object
    WHERE object.bucket_id = 'documents'
      AND object.name = document.workspace_id::text || '/legacy/' || split_part(document.url, '/documents/', 2)
  );

UPDATE storage.buckets SET public = false WHERE id = 'documents';
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY documents_storage_member_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND COALESCE(private.workspace_access_level(private.storage_workspace_id(name)), 0) >= 2);
CREATE POLICY documents_storage_member_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND COALESCE(private.workspace_access_level(private.storage_workspace_id(name)), 0) >= 2);
CREATE POLICY documents_storage_member_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND COALESCE(private.workspace_access_level(private.storage_workspace_id(name)), 0) >= 2)
WITH CHECK (bucket_id = 'documents' AND COALESCE(private.workspace_access_level(private.storage_workspace_id(name)), 0) >= 2);
CREATE POLICY documents_storage_manager_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND COALESCE(private.workspace_access_level(private.storage_workspace_id(name)), 0) >= 3);

GRANT SELECT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT INSERT, UPDATE ON public.user_preferences TO authenticated;
REVOKE ALL ON public.workspaces, public.workspace_members, public.user_preferences FROM anon;

COMMIT;
