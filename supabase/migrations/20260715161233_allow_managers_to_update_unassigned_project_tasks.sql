-- Imported planning tasks may intentionally start without an assignee. Keep
-- ordinary task updates bound to a valid assignee, but allow administrators
-- and project managers to manage an unassigned project task until ownership
-- is decided. Project membership and client consistency remain mandatory.
DROP POLICY IF EXISTS "Users can update permitted tasks" ON public.tasks;

CREATE POLICY "Users can update permitted tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  private.user_has_role((SELECT auth.uid()), 'admin_joia')
  OR created_by = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
  OR (
    task_type = 'project'
    AND project_id IS NOT NULL
    AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
  )
)
WITH CHECK (
  (
    assigned_to IS NOT NULL
    AND (
      (
        task_type = 'personal'
        AND project_id IS NULL
        AND client_id IS NULL
        AND (
          created_by = (SELECT auth.uid())
          OR assigned_to = (SELECT auth.uid())
          OR private.user_has_role((SELECT auth.uid()), 'admin_joia')
        )
      )
      OR (
        task_type = 'project'
        AND project_id IS NOT NULL
        AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 1
        AND private.user_project_access_level(assigned_to, project_id) >= 1
        AND EXISTS (
          SELECT 1
          FROM public.projects AS project
          WHERE project.id = project_id
            AND public.tasks.client_id IS NOT DISTINCT FROM project.client_id
        )
      )
    )
  )
  OR (
    assigned_to IS NULL
    AND task_type = 'project'
    AND project_id IS NOT NULL
    AND (
      private.user_has_role((SELECT auth.uid()), 'admin_joia')
      OR private.user_project_access_level((SELECT auth.uid()), project_id) >= 3
    )
    AND EXISTS (
      SELECT 1
      FROM public.projects AS project
      WHERE project.id = project_id
        AND public.tasks.client_id IS NOT DISTINCT FROM project.client_id
    )
  )
);
