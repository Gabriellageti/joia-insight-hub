-- JoIA management access: administrators manage internal data; collaborators work
-- in the operational areas only. This migration deliberately does not change H2O.

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
      WHERE role_entry.user_id = _user_id
        AND role_entry.role IN ('admin_joia', 'gestor_projetos')
    ) THEN 3
    ELSE COALESCE((
      SELECT CASE member.access_level WHEN 'manager' THEN 3 WHEN 'editor' THEN 2 ELSE 1 END
      FROM public.project_members member
      WHERE member.project_id = _project_id AND member.user_id = _user_id
    ), 0)
  END
$$;

-- Project inclusion is explicit. An editor is an operator; a manager is a
-- project partner and can access that project's financial records.
DROP POLICY IF EXISTS "Admins can manage project memberships" ON public.project_members;
CREATE POLICY "Admins can manage project memberships" ON public.project_members FOR ALL TO authenticated
USING (private.user_has_role((SELECT auth.uid()), 'admin_joia'))
WITH CHECK (private.user_has_role((SELECT auth.uid()), 'admin_joia'));

-- A new authenticated account is only linked when its e-mail already exists in
-- the internal team register. It receives the collaborator role by default;
-- administrators can then promote it from Configurações > Usuários.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.employees
  SET user_id = NEW.id
  WHERE user_id IS NULL
    AND email IS NOT NULL
    AND lower(trim(email)) = lower(trim(NEW.email));

  IF EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'analista'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Link existing internal accounts in the same safe, e-mail-based way.
UPDATE public.employees employee
SET user_id = auth_user.id
FROM auth.users auth_user
WHERE employee.user_id IS NULL
  AND employee.email IS NOT NULL
  AND lower(trim(employee.email)) = lower(trim(auth_user.email));

INSERT INTO public.user_roles (user_id, role)
SELECT employee.user_id, 'analista'::public.app_role
FROM public.employees employee
WHERE employee.user_id IS NOT NULL
  AND lower(coalesce(employee.status, 'active')) = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles role_entry WHERE role_entry.user_id = employee.user_id
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Management records are not merely hidden: they are inaccessible to non-admins.
DO $$
DECLARE
  target_table text;
  policy_name text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['employees', 'playbooks', 'financial_records', 'content_items', 'leads']
  LOOP
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, target_table);
    END LOOP;

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.user_has_role((SELECT auth.uid()), ''admin_joia''))', target_table || '_admin_select', target_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.user_has_role((SELECT auth.uid()), ''admin_joia''))', target_table || '_admin_insert', target_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.user_has_role((SELECT auth.uid()), ''admin_joia'')) WITH CHECK (private.user_has_role((SELECT auth.uid()), ''admin_joia''))', target_table || '_admin_update', target_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.user_has_role((SELECT auth.uid()), ''admin_joia''))', target_table || '_admin_delete', target_table);
  END LOOP;
END
$$;

-- The Financeiro area stays admin-only in the app. A project partner can read
-- records only for a project where they have manager access.
DROP POLICY IF EXISTS "financial_records_admin_select" ON public.financial_records;
CREATE POLICY "financial_records_admin_or_project_partner_select" ON public.financial_records FOR SELECT TO authenticated
USING (
  private.user_has_role((SELECT auth.uid()), 'admin_joia')
  OR (project_id IS NOT NULL AND private.user_project_access_level((SELECT auth.uid()), project_id) >= 3)
);

-- Only administrators can create a project. Analysts remain able to manage
-- project tasks through the access level above.
DROP POLICY IF EXISTS "Internal users can create projects" ON public.projects;
CREATE POLICY "Admins can create projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (private.user_has_role((SELECT auth.uid()), 'admin_joia'));
