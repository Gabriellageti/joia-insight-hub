-- The inner subtransaction ALWAYS rolls back schema/fixtures/audit events.
-- This is a database regression probe, NOT the committed production E2E smoke.
CREATE OR REPLACE FUNCTION pg_temp.p11_activity_probe()
RETURNS jsonb LANGUAGE plpgsql AS $probe$
DECLARE uid uuid := gen_random_uuid(); wid uuid := gen_random_uuid(); cid uuid;
  pid uuid; tid uuid; mid uuid; saved_ids uuid[]; event_count integer;
  run_id text := 'p11-e2e-audit-' || gen_random_uuid(); report jsonb;
BEGIN
  BEGIN
    /* MIGRATION_UNDER_TEST */
    INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data,aud,role)
    VALUES(uid,run_id || '@example.invalid',jsonb_build_object('full_name','P11-E2E-Audit'),'{}','authenticated','authenticated');
    INSERT INTO public.workspaces(id,name,slug,created_by) VALUES(wid,'P11-E2E-Audit',run_id,uid);
    INSERT INTO public.workspace_members(workspace_id,user_id,role,is_default) VALUES(wid,uid,'admin',true);
    PERFORM set_config('request.jwt.claim.sub',uid::text,true);
    INSERT INTO public.clients(name,workspace_id) VALUES('P11-E2E-Client',wid) RETURNING id INTO cid;
    INSERT INTO public.projects(name,client_id,workspace_id) VALUES('P11-E2E-Project',cid,wid) RETURNING id INTO pid;
    INSERT INTO public.tasks(title,client_id,project_id,workspace_id) VALUES('P11-E2E-Task',cid,pid,wid) RETURNING id INTO tid;
    UPDATE public.tasks SET title='P11-E2E-Task updated' WHERE id=tid;
    DELETE FROM public.tasks WHERE id=tid;
    IF NOT EXISTS(SELECT 1 FROM public.activity_logs WHERE entity_id=tid AND action_type='tasks_delete'
      AND task_id IS NULL AND metadata->'references'->>'task_id'=tid::text
      AND metadata->'entity_snapshot'->>'title'='P11-E2E-Task updated') THEN
      RAISE EXCEPTION 'Delete snapshot missing';
    END IF;
    INSERT INTO public.meetings(title,client_id,project_id,workspace_id,date)
    VALUES('P11-E2E-Meeting',cid,pid,wid,now()) RETURNING id INTO mid;
    INSERT INTO public.meeting_agenda_items(meeting_id,title) VALUES(mid,'P11-E2E-Agenda');
    INSERT INTO public.meeting_decisions(meeting_id,description) VALUES(mid,'P11-E2E-Decision');
    INSERT INTO public.meeting_next_steps(meeting_id,description) VALUES(mid,'P11-E2E-Next');
    DELETE FROM public.meetings WHERE id=mid;
    IF NOT EXISTS(SELECT 1 FROM public.activity_logs WHERE entity_id=mid AND action_type='meetings_delete') THEN
      RAISE EXCEPTION 'Meeting deletion not retained';
    END IF;
    IF (SELECT count(*) FROM public.activity_logs WHERE metadata->'references'->>'meeting_id'=mid::text
      AND action_type IN ('agenda_item_deleted','decision_deleted','next_step_deleted')) <> 3 THEN
      RAISE EXCEPTION 'Meeting cascade deletion snapshots missing';
    END IF;
    SELECT array_agg(id),count(*) INTO saved_ids,event_count FROM public.activity_logs WHERE workspace_id=wid;
    DELETE FROM public.projects WHERE id=pid;
    DELETE FROM public.clients WHERE id=cid;
    DELETE FROM public.workspaces WHERE id=wid;
    DELETE FROM auth.users WHERE id=uid;
    IF (SELECT count(*) FROM public.activity_logs WHERE id=ANY(saved_ids)) <> event_count THEN
      RAISE EXCEPTION 'Audit rows lost during cleanup';
    END IF;
    IF EXISTS(SELECT 1 FROM public.activity_logs WHERE id=ANY(saved_ids) AND
      (workspace_id IS NOT NULL OR actor_id IS NOT NULL OR metadata->>'test_run_id' IS DISTINCT FROM run_id
        OR metadata->'references'->>'workspace_id' IS DISTINCT FROM wid::text)) THEN
      RAISE EXCEPTION 'Historical context or cleanup isolation incorrect';
    END IF;
    IF has_table_privilege('authenticated','public.activity_logs','UPDATE')
       OR has_table_privilege('authenticated','public.activity_logs','DELETE') THEN
      RAISE EXCEPTION 'Browser audit mutation allowed';
    END IF;
    report := jsonb_build_object('result','PASS','run',run_id,'eventsRetained',event_count,
      'taskDelete',true,'meetingCascade',true,'clientProjectWorkspaceCleanup',true,'originalReferences',true,
      'browserMutationDenied',true,'fixtureTransaction','ROLLED BACK');
    RAISE EXCEPTION USING ERRCODE='P1100',MESSAGE='intentional fixture rollback';
  EXCEPTION WHEN SQLSTATE 'P1100' THEN NULL;
  END;
  RETURN report;
END;
$probe$;
SELECT pg_temp.p11_activity_probe() AS evidence;
