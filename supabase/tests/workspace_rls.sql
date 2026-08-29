-- Execute em um banco local descartável após `supabase db reset`.
-- O teste inteiro é revertido e não deve ser executado contra produção.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a@example.invalid', '', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b@example.invalid', '', now(), now(), now()),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-0000-8000-000000000000', 'authenticated', 'authenticated', 'rls-none@example.invalid', '', now(), now(), now());

INSERT INTO public.workspaces (id, name, slug) VALUES
  ('10000000-0000-4000-9000-000000000001', 'Workspace A', 'rls-workspace-a'),
  ('20000000-0000-4000-9000-000000000002', 'Workspace B', 'rls-workspace-b');
INSERT INTO public.workspace_members (workspace_id, user_id, role, is_default) VALUES
  ('10000000-0000-4000-9000-000000000001', '10000000-0000-4000-8000-000000000001', 'admin', true),
  ('20000000-0000-4000-9000-000000000002', '20000000-0000-4000-8000-000000000002', 'member', true);

INSERT INTO public.clients (id, name, workspace_id) VALUES
  ('10000000-0000-4000-a000-000000000001', 'Cliente A', '10000000-0000-4000-9000-000000000001'),
  ('20000000-0000-4000-a000-000000000002', 'Cliente B', '20000000-0000-4000-9000-000000000002');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.clients) <> 0 THEN RAISE EXCEPTION 'usuário sem membership acessou clientes'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.clients) <> 1 THEN RAISE EXCEPTION 'membro acessou workspace incorreto'; END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE name = 'Cliente B') THEN RAISE EXCEPTION 'BOLA entre workspaces'; END IF;
END $$;

DO $$
DECLARE affected integer;
BEGIN
  WITH updated AS (
    UPDATE public.clients SET name = 'tentativa cross-workspace'
    WHERE id = '20000000-0000-4000-a000-000000000002'
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM updated;
  IF affected <> 0 THEN RAISE EXCEPTION 'update cross-workspace permitido'; END IF;
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id, name, owner_id)
    VALUES ('documents', '20000000-0000-4000-9000-000000000002/clients/teste.txt', auth.uid());
    RAISE EXCEPTION 'storage cross-workspace permitido';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;
END $$;

ROLLBACK;
