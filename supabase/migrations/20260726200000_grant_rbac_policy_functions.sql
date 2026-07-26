-- Restore the authenticated execution grants required by RLS policies.
-- Without these grants the policy itself fails before it can evaluate a role.
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_project_access_level(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
