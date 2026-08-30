-- P11 destructive-looking RLS tests run entirely in one transaction. The final
-- deliberate exception rolls every fixture and attempted mutation back.
BEGIN;

CREATE TEMP TABLE p11_context AS
SELECT
  owner_member.workspace_id AS workspace_a,
  owner_member.user_id AS user_a,
  member_member.user_id AS member_a,
  unmapped.user_b,
  unmapped.viewer_b,
  gen_random_uuid() AS workspace_b,
  gen_random_uuid() AS client_a,
  gen_random_uuid() AS client_b,
  gen_random_uuid() AS project_b,
  gen_random_uuid() AS task_b,
  gen_random_uuid() AS meeting_b,
  gen_random_uuid() AS document_b,
  gen_random_uuid() AS report_a,
  gen_random_uuid() AS report_b,
  gen_random_uuid() AS lead_b,
  gen_random_uuid() AS rule_b,
  gen_random_uuid() AS task_a,
  gen_random_uuid() AS attack_task
FROM LATERAL (
  SELECT workspace_id, user_id FROM public.workspace_members
  WHERE role::text IN ('owner', 'admin') ORDER BY created_at LIMIT 1
) AS owner_member
JOIN LATERAL (
  SELECT user_id FROM public.workspace_members
  WHERE workspace_id = owner_member.workspace_id AND role::text = 'member'
  ORDER BY created_at LIMIT 1
) AS member_member ON true
JOIN LATERAL (
  SELECT (array_agg(id ORDER BY id))[1] AS user_b, (array_agg(id ORDER BY id))[2] AS viewer_b
  FROM auth.users AS u
  WHERE NOT EXISTS (SELECT 1 FROM public.workspace_members AS wm WHERE wm.user_id = u.id)
) AS unmapped ON true;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM p11_context WHERE user_a IS NULL OR member_a IS NULL OR user_b IS NULL OR viewer_b IS NULL OR user_b = viewer_b) THEN
    RAISE EXCEPTION 'P11 requires owner, member and two unmapped test identities';
  END IF;
END $$;

CREATE TEMP TABLE p11_results (
  test text,
  actor text,
  action text,
  expected text,
  actual text,
  status text,
  evidence text
);
GRANT SELECT ON p11_context TO authenticated, anon;
GRANT SELECT, INSERT ON p11_results TO authenticated, anon;

INSERT INTO public.workspaces(id, name, slug, created_by)
SELECT workspace_b, '[P11 E2E] Workspace B', 'p11-e2e-' || left(workspace_b::text, 8), user_b FROM p11_context;
INSERT INTO public.workspace_members(workspace_id, user_id, role, is_default, created_by)
SELECT workspace_b, user_b, 'owner'::public.workspace_role, true, user_b FROM p11_context
UNION ALL
SELECT workspace_b, viewer_b, 'viewer'::public.workspace_role, true, user_b FROM p11_context;

SELECT set_config('request.jwt.claim.sub', (SELECT user_b::text FROM p11_context), true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', (SELECT user_b FROM p11_context), 'role', 'authenticated')::text, true);

INSERT INTO public.clients(id, workspace_id, name)
SELECT client_b, workspace_b, '[P11 E2E] Cliente B' FROM p11_context;
INSERT INTO public.projects(id, workspace_id, client_id, name)
SELECT project_b, workspace_b, client_b, '[P11 E2E] Projeto B' FROM p11_context;
INSERT INTO public.tasks(id, workspace_id, client_id, title, task_type, assigned_to, created_by)
SELECT task_b, workspace_b, client_b, '[P11 E2E] Tarefa B', 'client', user_b, user_b FROM p11_context;
INSERT INTO public.meetings(id, workspace_id, client_id, title, created_by)
SELECT meeting_b, workspace_b, client_b, '[P11 E2E] Reunião B', user_b FROM p11_context;
INSERT INTO public.documents(
  id, workspace_id, client_id, name, display_name, storage_path,
  version_group_id, uploaded_by
)
SELECT document_b, workspace_b, client_b, 'p11-document.pdf', '[P11 E2E] Documento B',
  workspace_b::text || '/p11-document.pdf', document_b, user_b FROM p11_context;
INSERT INTO storage.objects(bucket_id, name, owner_id)
SELECT 'documents', workspace_b::text || '/p11-document.pdf', user_b::text FROM p11_context;
INSERT INTO public.consulting_reports(
  id, workspace_id, client_id, period_start, period_end, version_group_id,
  status, title, created_by
)
SELECT report_b, workspace_b, client_b, CURRENT_DATE - 1, CURRENT_DATE,
  report_b, 'finalized', '[P11 E2E] Relatório B', user_b FROM p11_context;
INSERT INTO public.commercial_pipeline_stages(
  workspace_id, key, label, position, default_probability
)
SELECT workspace_b, 'proposal', '[P11 E2E] Proposta', 1, 50 FROM p11_context;
INSERT INTO public.leads(id, workspace_id, name, stage, created_by)
SELECT lead_b, workspace_b, '[P11 E2E] Lead B', 'proposal', user_b FROM p11_context;
INSERT INTO public.automation_rules(
  id, workspace_id, rule_key, name, description, event_type, action_type
)
SELECT rule_b, workspace_b, 'p11_e2e_rule', '[P11 E2E] Regra B', 'Teste transacional',
  'p11.test', 'p11.none' FROM p11_context;

SELECT set_config('request.jwt.claim.sub', (SELECT user_a::text FROM p11_context), true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', (SELECT user_a FROM p11_context), 'role', 'authenticated')::text, true);
INSERT INTO public.clients(id, workspace_id, name)
SELECT client_a, workspace_a, '[P11 E2E] Cliente A' FROM p11_context;
INSERT INTO public.tasks(id, workspace_id, client_id, title, task_type, assigned_to, created_by)
SELECT task_a, workspace_a, client_a, '[P11 E2E] Tarefa A', 'client', user_a, user_a FROM p11_context;
INSERT INTO public.consulting_reports(
  id, workspace_id, client_id, period_start, period_end, version_group_id,
  status, title, created_by
)
SELECT report_a, workspace_a, client_a, CURRENT_DATE - 1, CURRENT_DATE,
  report_a, 'draft', '[P11 E2E] Relatório A', user_a FROM p11_context;

SET LOCAL ROLE authenticated;

INSERT INTO p11_results
SELECT 'CLIENT-SELECT-CROSS', 'Admin A', 'SELECT cliente B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'RLS query count'
FROM public.clients WHERE id = (SELECT client_b FROM p11_context);
INSERT INTO p11_results
SELECT 'PROJECT-SELECT-CROSS', 'Admin A', 'SELECT projeto B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'RLS query count'
FROM public.projects WHERE id = (SELECT project_b FROM p11_context);
INSERT INTO p11_results
SELECT 'TASK-SELECT-CROSS', 'Admin A', 'SELECT tarefa B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'RLS query count'
FROM public.tasks WHERE id = (SELECT task_b FROM p11_context);
INSERT INTO p11_results
SELECT 'MEETING-SELECT-CROSS', 'Admin A', 'SELECT reunião B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'RLS query count'
FROM public.meetings WHERE id = (SELECT meeting_b FROM p11_context);
INSERT INTO p11_results
SELECT 'DOCUMENT-SELECT-CROSS', 'Admin A', 'SELECT documento B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'RLS query count'
FROM public.documents WHERE id = (SELECT document_b FROM p11_context);
INSERT INTO p11_results
SELECT 'STORAGE-SELECT-CROSS', 'Admin A', 'SELECT path conhecido B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'storage.objects RLS query count'
FROM storage.objects WHERE bucket_id = 'documents'
  AND name = (SELECT workspace_b::text || '/p11-document.pdf' FROM p11_context);
INSERT INTO p11_results
SELECT 'REPORT-SELECT-CROSS', 'Admin A', 'SELECT relatório B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'RLS query count'
FROM public.consulting_reports WHERE id = (SELECT report_b FROM p11_context);
INSERT INTO p11_results
SELECT 'CRM-SELECT-CROSS', 'Admin A', 'SELECT lead B', '0 rows', count(*)::text,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END, 'RLS query count'
FROM public.leads WHERE id = (SELECT lead_b FROM p11_context);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.clients(workspace_id, name)
    SELECT workspace_b, '[P11 E2E] Ataque de INSERT' FROM p11_context;
    INSERT INTO p11_results VALUES ('CLIENT-INSERT-CROSS','Admin A','INSERT no workspace B','denied','inserted','FAIL','RLS accepted cross-workspace insert');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('CLIENT-INSERT-CROSS','Admin A','INSERT no workspace B','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;

WITH changed AS (
  UPDATE public.clients SET name = name || ' attack'
  WHERE id = (SELECT client_b FROM p11_context) RETURNING id
)
INSERT INTO p11_results
SELECT 'CLIENT-UPDATE-CROSS','Admin A','UPDATE cliente B','0 rows',count(*)::text,
  CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS update count' FROM changed;
WITH removed AS (
  DELETE FROM public.clients WHERE id = (SELECT client_b FROM p11_context) RETURNING id
)
INSERT INTO p11_results
SELECT 'CLIENT-DELETE-CROSS','Admin A','DELETE cliente B','0 rows',count(*)::text,
  CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS delete count' FROM removed;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.projects(workspace_id, client_id, name)
    SELECT workspace_b, client_b, '[P11 E2E] Ataque projeto' FROM p11_context;
    INSERT INTO p11_results VALUES ('PROJECT-INSERT-CROSS','Admin A','INSERT projeto B','denied','inserted','FAIL','RLS accepted cross-workspace insert');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('PROJECT-INSERT-CROSS','Admin A','INSERT projeto B','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;
WITH changed AS (
  UPDATE public.projects SET name=name||' attack' WHERE id=(SELECT project_b FROM p11_context) RETURNING id
) INSERT INTO p11_results SELECT 'PROJECT-UPDATE-CROSS','Admin A','UPDATE projeto B','0 rows',count(*)::text,CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS update count' FROM changed;
WITH removed AS (
  DELETE FROM public.projects WHERE id=(SELECT project_b FROM p11_context) RETURNING id
) INSERT INTO p11_results SELECT 'PROJECT-DELETE-CROSS','Admin A','DELETE projeto B','0 rows',count(*)::text,CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS delete count' FROM removed;

WITH changed AS (
  UPDATE public.tasks SET title=title||' attack' WHERE id=(SELECT task_b FROM p11_context) RETURNING id
) INSERT INTO p11_results SELECT 'TASK-UPDATE-CROSS','Admin A','UPDATE tarefa B','0 rows',count(*)::text,CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS update count' FROM changed;
WITH removed AS (
  DELETE FROM public.tasks WHERE id=(SELECT task_b FROM p11_context) RETURNING id
) INSERT INTO p11_results SELECT 'TASK-DELETE-CROSS','Admin A','DELETE tarefa B','0 rows',count(*)::text,CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS delete count' FROM removed;

DO $$
BEGIN
  BEGIN
    UPDATE public.clients SET workspace_id = (SELECT workspace_b FROM p11_context)
    WHERE id = (SELECT client_a FROM p11_context);
    INSERT INTO p11_results VALUES ('CLIENT-WORKSPACE-REASSIGN','Admin A','alterar workspace_id','denied','updated','FAIL','tenant key changed');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('CLIENT-WORKSPACE-REASSIGN','Admin A','alterar workspace_id','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE public.tasks SET assigned_to=(SELECT user_b FROM p11_context)
    WHERE id=(SELECT task_a FROM p11_context);
    INSERT INTO p11_results VALUES ('TASK-ASSIGNEE-CROSS','Admin A','assignee_id de outro workspace','denied','updated','FAIL','cross-workspace assignee accepted');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('TASK-ASSIGNEE-CROSS','Admin A','assignee_id de outro workspace','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.tasks(id, workspace_id, client_id, title, task_type, assigned_to, created_by)
    SELECT attack_task, workspace_a, client_b, '[P11 E2E] Associação cruzada', 'client', user_a, user_a FROM p11_context;
    INSERT INTO p11_results VALUES ('TASK-CLIENT-CROSS','Admin A','client_id de outro workspace','denied','inserted','FAIL','database accepted cross-workspace relation');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('TASK-CLIENT-CROSS','Admin A','client_id de outro workspace','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;

UPDATE public.consulting_reports SET status = 'finalized'
WHERE id = (SELECT report_a FROM p11_context);
DO $$
BEGIN
  BEGIN
    UPDATE public.consulting_reports SET title = '[P11 E2E] adulterado'
    WHERE id = (SELECT report_a FROM p11_context);
    INSERT INTO p11_results VALUES ('REPORT-FINAL-UPDATE','Admin A','UPDATE relatório finalizado','denied','updated','FAIL','immutable trigger did not reject');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('REPORT-FINAL-UPDATE','Admin A','UPDATE relatório finalizado','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;

WITH removed AS (
  DELETE FROM public.consulting_reports WHERE id=(SELECT report_a FROM p11_context) RETURNING id
) INSERT INTO p11_results
SELECT 'REPORT-FINAL-DELETE','Admin A','DELETE relatório finalizado','0 rows',count(*)::text,
  CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS delete count' FROM removed;

DO $$
BEGIN
  BEGIN
    PERFORM public.get_ai_context('Mostre a reunião B', NULL, (SELECT meeting_b FROM p11_context), NULL);
    INSERT INTO p11_results VALUES ('AI-MEETING-CROSS','Admin A','contexto reunião B','denied','returned','FAIL','AI context crossed workspace');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('AI-MEETING-CROSS','Admin A','contexto reunião B','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
  BEGIN
    PERFORM public.get_ai_context('Mostre o relatório B', NULL, NULL, (SELECT report_b FROM p11_context));
    INSERT INTO p11_results VALUES ('AI-REPORT-CROSS','Admin A','contexto relatório B','denied','returned','FAIL','AI context crossed workspace');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('AI-REPORT-CROSS','Admin A','contexto relatório B','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;

DO $$
BEGIN
  BEGIN
    PERFORM public.get_ai_context('Mostre o cliente B', (SELECT client_b FROM p11_context), NULL, NULL);
    INSERT INTO p11_results VALUES ('AI-CONTEXT-CROSS','Admin A','contexto cliente B','denied','returned','FAIL','AI context crossed workspace');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('AI-CONTEXT-CROSS','Admin A','contexto cliente B','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;
SELECT set_config('request.jwt.claim.sub', (SELECT member_a::text FROM p11_context), true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', (SELECT member_a FROM p11_context), 'role', 'authenticated')::text, true);
WITH changed AS (
  UPDATE public.automation_rules SET enabled=NOT enabled WHERE workspace_id=(SELECT workspace_a FROM p11_context) RETURNING id
) INSERT INTO p11_results SELECT 'AUTOMATION-MEMBER-UPDATE','Membro A','alterar regra','0 rows',count(*)::text,CASE WHEN count(*)=0 THEN 'PASS' ELSE 'FAIL' END,'RLS update count' FROM changed;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.automation_rules(workspace_id,rule_key,name,description,event_type,action_type)
    SELECT workspace_a,'p11_attack','Ataque','Ataque','p11.attack','none' FROM p11_context;
    INSERT INTO p11_results VALUES ('AUTOMATION-MEMBER-INSERT','Membro A','criar regra','denied','inserted','FAIL','member created rule');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('AUTOMATION-MEMBER-INSERT','Membro A','criar regra','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;
DO $$
BEGIN
  BEGIN
    PERFORM public.run_scheduled_automations();
    INSERT INTO p11_results VALUES ('AUTOMATION-MEMBER-RUN','Membro A','executar automações','denied','executed','FAIL','member executed manager RPC');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p11_results VALUES ('AUTOMATION-MEMBER-RUN','Membro A','executar automações','denied','denied','PASS','SQLSTATE ' || SQLSTATE);
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', (SELECT user_b::text FROM p11_context), true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', (SELECT user_b FROM p11_context), 'role', 'authenticated')::text, true);
INSERT INTO p11_results
SELECT 'CLIENT-OWNER-B-READ','Admin B','SELECT próprio cliente','1 row',count(*)::text,
  CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END,'positive control' FROM public.clients
WHERE id = (SELECT client_b FROM p11_context);

RESET ROLE;

DO $$
DECLARE evidence jsonb;
BEGIN
  SELECT jsonb_agg(to_jsonb(result_row) ORDER BY result_row.test) INTO evidence
  FROM p11_results AS result_row;
  RAISE EXCEPTION USING
    ERRCODE = 'P1100',
    MESSAGE = 'P11_TRANSACTION_ROLLBACK_RESULTS:' || evidence::text;
END $$;
