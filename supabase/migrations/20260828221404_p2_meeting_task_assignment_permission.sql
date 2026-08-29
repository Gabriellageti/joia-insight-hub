-- The task policies must not call the privileged access-level lookup directly.
-- Expose only a scoped boolean check, and only when the actor belongs to the
-- same workspace being checked.

BEGIN;

CREATE OR REPLACE FUNCTION private.can_assign_workspace_task(_assignee_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND COALESCE(private.workspace_access_level(_workspace_id), 0) >= 1
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members AS member
      WHERE member.workspace_id = _workspace_id
        AND member.user_id = _assignee_id
    )
$$;

REVOKE ALL ON FUNCTION private.can_assign_workspace_task(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_assign_workspace_task(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS tasks_scoped_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_scoped_update ON public.tasks;

CREATE POLICY tasks_scoped_insert ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND assigned_to IS NOT NULL
  AND private.can_assign_workspace_task(assigned_to, workspace_id)
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
  AND private.can_assign_workspace_task(assigned_to, workspace_id)
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

COMMIT;
