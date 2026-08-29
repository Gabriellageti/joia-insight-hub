-- Read-only production smoke test. Every transaction is rolled back.
BEGIN;
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::text FROM auth.users WHERE email = 'joia-audit-1784670424@web-library.net'),
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.workspace_members) <> 0 THEN
    RAISE EXCEPTION 'unaffiliated membership leak';
  END IF;
  IF (SELECT count(*) FROM public.clients) <> 0 THEN
    RAISE EXCEPTION 'unaffiliated client leak';
  END IF;
END
$$;
ROLLBACK;

BEGIN;
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM public.user_roles WHERE role = 'admin_joia' LIMIT 1),
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.workspace_members) < 1 THEN
    RAISE EXCEPTION 'admin membership unavailable';
  END IF;
  IF (SELECT count(*) FROM public.clients) < 1 THEN
    RAISE EXCEPTION 'authorized client access unavailable';
  END IF;
END
$$;
ROLLBACK;
