-- Before project membership RLS was introduced, every authenticated account
-- could create projects. Preserve that capability only for confirmed,
-- non-anonymous accounts that already existed when the secure policies landed
-- and were left without an explicit role. The analyst role is intentionally the
-- least privileged internal role that can create a project; the creator trigger
-- grants manager access only to the project they create.
INSERT INTO public.user_roles (user_id, role)
SELECT auth_user.id, 'analista'::public.app_role
FROM auth.users AS auth_user
JOIN public.profiles AS profile ON profile.id = auth_user.id
WHERE auth_user.created_at < TIMESTAMPTZ '2026-07-14 18:17:40+00'
  AND auth_user.email_confirmed_at IS NOT NULL
  AND COALESCE(auth_user.is_anonymous, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS existing_role
    WHERE existing_role.user_id = auth_user.id
  )
ON CONFLICT (user_id, role) DO NOTHING;
