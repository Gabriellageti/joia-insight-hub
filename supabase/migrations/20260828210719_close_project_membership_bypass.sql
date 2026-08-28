BEGIN;

DROP POLICY IF EXISTS "Admins can manage project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Admins can create projects" ON public.projects;

CREATE OR REPLACE FUNCTION private.prevent_project_membership_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'project and user are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_project_membership_reassignment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_project_membership_before_update ON public.project_members;
CREATE TRIGGER protect_project_membership_before_update
BEFORE UPDATE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION private.prevent_project_membership_reassignment();

CREATE POLICY project_members_manager_insert ON public.project_members FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects AS project
  WHERE project.id = project_id
    AND COALESCE(private.workspace_access_level(project.workspace_id), 0) >= 3
    AND private.user_project_access_level((SELECT auth.uid()), project.id) >= 3
));

CREATE POLICY project_members_manager_update ON public.project_members FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects AS project
  WHERE project.id = project_id
    AND COALESCE(private.workspace_access_level(project.workspace_id), 0) >= 3
    AND private.user_project_access_level((SELECT auth.uid()), project.id) >= 3
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects AS project
  WHERE project.id = project_id
    AND COALESCE(private.workspace_access_level(project.workspace_id), 0) >= 3
    AND private.user_project_access_level((SELECT auth.uid()), project.id) >= 3
));

CREATE POLICY project_members_manager_delete ON public.project_members FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects AS project
  WHERE project.id = project_id
    AND COALESCE(private.workspace_access_level(project.workspace_id), 0) >= 3
    AND private.user_project_access_level((SELECT auth.uid()), project.id) >= 3
));

-- No current browser flow reads or writes this future financial catalogue.
-- Keep it server-only until a workspace-scoped model is explicitly designed.
REVOKE ALL ON TABLE public.financial_recurring_rules FROM authenticated;

COMMIT;
