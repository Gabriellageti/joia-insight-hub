-- Existing accounts created before the profile trigger, and collaborators added
-- after creating an account, need this one-time reconciliation.
INSERT INTO public.profiles (id, full_name)
SELECT
  auth_user.id,
  COALESCE(
    NULLIF(trim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(split_part(auth_user.email, '@', 1), ''),
    'Usuário'
  )
FROM auth.users auth_user
ON CONFLICT (id) DO NOTHING;

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
