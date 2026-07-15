-- Keep project creation restricted to authenticated internal users while
-- avoiding a function call in the INSERT policy. The direct lookup makes the
-- authorization decision use the same authenticated user id and role rows
-- exposed to the application.
DROP POLICY IF EXISTS "Internal users can create projects" ON public.projects;

CREATE POLICY "Internal users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles AS role_entry
    WHERE role_entry.user_id = (SELECT auth.uid())
      AND role_entry.role IN (
        'admin_joia'::public.app_role,
        'gestor_projetos'::public.app_role,
        'analista'::public.app_role,
        'financeiro_joia'::public.app_role,
        'marketing_joia'::public.app_role,
        'colaborador_onboarding'::public.app_role
      )
  )
);
