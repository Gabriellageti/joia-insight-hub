-- Reconcile the legacy employee role labels with the RBAC table used by RLS.
-- This is intentionally a one-time backfill: employees remains mutable under
-- legacy policies and must not become a dynamic authorization source.
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT
  employee.user_id,
  CASE lower(trim(employee.role))
    WHEN 'admin joia' THEN 'admin_joia'::public.app_role
    WHEN 'gestor de projetos' THEN 'gestor_projetos'::public.app_role
    WHEN 'analista' THEN 'analista'::public.app_role
    WHEN 'financeiro joia' THEN 'financeiro_joia'::public.app_role
    WHEN 'marketing joia' THEN 'marketing_joia'::public.app_role
    WHEN 'colaborador onboarding' THEN 'colaborador_onboarding'::public.app_role
    ELSE NULL
  END
FROM public.employees employee
WHERE employee.user_id IS NOT NULL
  AND lower(coalesce(employee.status, 'active')) = 'active'
  AND lower(trim(employee.role)) IN (
    'admin joia',
    'gestor de projetos',
    'analista',
    'financeiro joia',
    'marketing joia',
    'colaborador onboarding'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Existing internal users historically had company-wide project visibility.
-- Preserve that behavior explicitly through project membership, while client
-- roles continue to receive no implicit access.
INSERT INTO public.project_members (project_id, user_id, access_level, created_by)
SELECT
  project.id,
  role_entry.user_id,
  CASE
    WHEN role_entry.role IN ('admin_joia', 'gestor_projetos') THEN 'manager'
    ELSE 'editor'
  END,
  role_entry.user_id
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
  WHEN public.project_members.access_level = 'manager'
    OR EXCLUDED.access_level = 'manager' THEN 'manager'
  WHEN public.project_members.access_level = 'editor'
    OR EXCLUDED.access_level = 'editor' THEN 'editor'
  ELSE 'viewer'
END;

-- Ensure every legacy project task remains visible to its creator and assignee,
-- even when that user does not have an employee role record.
INSERT INTO public.project_members (project_id, user_id, access_level, created_by)
SELECT DISTINCT
  task.project_id,
  participant.user_id,
  'editor',
  task.created_by
FROM public.tasks task
CROSS JOIN LATERAL (
  VALUES (task.created_by), (task.assigned_to)
) AS participant(user_id)
WHERE task.task_type = 'project'
  AND task.project_id IS NOT NULL
  AND participant.user_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE
SET access_level = CASE
  WHEN public.project_members.access_level = 'manager' THEN 'manager'
  ELSE 'editor'
END;
