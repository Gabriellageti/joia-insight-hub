BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"2320b1be-f999-4a1a-b1d4-79458041d13d","role":"authenticated"}';
SELECT public.get_operations_dashboard('00000000-0000-0000-0000-000000000001'::uuid, 30, NULL, NULL)->>'scope' AS owner_scope;
SELECT public.get_operations_dashboard('00000000-0000-0000-0000-000000000001'::uuid, 30, NULL, NULL)->'kpis' AS owner_kpis;
SELECT jsonb_array_length(public.get_team_operations('00000000-0000-0000-0000-000000000001'::uuid)) AS team_members;

DO $$
BEGIN
  INSERT INTO public.tasks (id, workspace_id, title, task_type, assigned_to, created_by, status, priority)
  VALUES ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000001', 'Bloqueio sem motivo', 'personal', '2320b1be-f999-4a1a-b1d4-79458041d13d', '2320b1be-f999-4a1a-b1d4-79458041d13d', 'blocked', 'high');
  RAISE EXCEPTION 'blocked task without reason should fail';
EXCEPTION WHEN check_violation THEN
  NULL;
END
$$;

INSERT INTO public.tasks (id, workspace_id, title, task_type, assigned_to, created_by, status, priority, block_reason, block_reason_category)
VALUES ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000001', 'Bloqueio válido', 'personal', '2320b1be-f999-4a1a-b1d4-79458041d13d', '2320b1be-f999-4a1a-b1d4-79458041d13d', 'blocked', 'high', 'Dependência externa', 'dependency');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = '00000000-0000-0000-0000-000000003002' AND blocked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'blocked timestamp was not recorded';
  END IF;
  IF (SELECT count(*) FROM public.activity_logs WHERE task_id = '00000000-0000-0000-0000-000000003002' AND action_type = 'tasks_insert') <> 1 THEN
    RAISE EXCEPTION 'task activity was not recorded exactly once';
  END IF;
END
$$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"9e0a217a-dc5d-4458-b2fe-ace82d103975","role":"authenticated"}';
SELECT public.get_operations_dashboard('00000000-0000-0000-0000-000000000001'::uuid, 30, NULL, NULL)->>'scope' AS member_scope;
ROLLBACK;
