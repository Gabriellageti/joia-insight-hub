BEGIN;

CREATE OR REPLACE FUNCTION private.execute_automation_event(p_event_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  ev public.automation_events%ROWTYPE; rule public.automation_rules%ROWTYPE;
  run_id uuid; target_user uuid; affected integer := 0; run_started timestamptz;
  idempotency text; entity_title text; client_id uuid; project_id uuid; template_name text;
BEGIN
  SELECT * INTO ev FROM public.automation_events WHERE id=p_event_id FOR UPDATE;
  IF ev.id IS NULL OR ev.status <> 'pending' THEN RETURN 0; END IF;
  IF ev.depth > 5 THEN
    UPDATE public.automation_events SET status='ignored',error_message='loop depth exceeded',processed_at=now() WHERE id=ev.id;
    RETURN 0;
  END IF;
  UPDATE public.automation_events SET status='processing' WHERE id=ev.id;

  FOR rule IN SELECT * FROM public.automation_rules WHERE workspace_id=ev.workspace_id AND event_type=ev.event_type AND enabled ORDER BY rule_key LOOP
    idempotency := rule.rule_key || ':' || COALESCE(ev.entity_id::text,ev.id::text) || ':' || COALESCE(ev.payload->>'version',ev.created_at::date::text);
    run_started := clock_timestamp();
    INSERT INTO public.automation_runs(workspace_id,rule_id,event_id,entity_type,entity_id,idempotency_key,status)
    VALUES(ev.workspace_id,rule.id,ev.id,ev.entity_type,ev.entity_id,idempotency,'running')
    ON CONFLICT(workspace_id,idempotency_key) DO NOTHING RETURNING id INTO run_id;
    IF run_id IS NULL THEN CONTINUE; END IF;
    BEGIN
      IF rule.rule_key='meeting_finalized_history' THEN
        SELECT m.title,m.client_id,m.project_id INTO entity_title,client_id,project_id FROM public.meetings m WHERE m.id=ev.entity_id;
        INSERT INTO public.activity_logs(workspace_id,actor_id,action_type,entity_type,entity_id,client_id,project_id,meeting_id,title,description,metadata)
        VALUES(ev.workspace_id,NULL,'automation_meeting_finalized','meeting',ev.entity_id,client_id,project_id,ev.entity_id,COALESCE(entity_title,'Reunião'),'Finalização confirmada pelo motor de automações',jsonb_build_object('correlation_id',ev.correlation_id));
        affected := 1;
      ELSIF rule.rule_key='won_opportunity_client' THEN
        SELECT COALESCE(responsible_user_id,created_by),COALESCE(company,name) INTO target_user,entity_title FROM public.leads WHERE id=ev.entity_id;
        IF target_user IS NULL THEN SELECT user_id INTO target_user FROM public.workspace_members WHERE workspace_id=ev.workspace_id AND role::text IN ('owner','admin','manager') ORDER BY is_default DESC,created_at LIMIT 1; END IF;
        affected := private.automation_notify(ev.workspace_id,target_user,'automation_suggestion','Oportunidade ganha: confirme o cliente',COALESCE(entity_title,'Oportunidade comercial'),'automation:won-client:'||ev.entity_id,'important','/comercial');
      ELSIF rule.rule_key='client_created_project' THEN
        SELECT name INTO entity_title FROM public.clients WHERE id=ev.entity_id;
        FOR target_user IN SELECT user_id FROM public.workspace_members WHERE workspace_id=ev.workspace_id AND role::text IN ('owner','admin','manager') LOOP
          affected := affected + private.automation_notify(ev.workspace_id,target_user,'automation_suggestion','Novo cliente: inicie o projeto',COALESCE(entity_title,'Cliente criado'),'automation:client-project:'||ev.entity_id,'attention','/projetos',NULL,ev.entity_id);
        END LOOP;
      ELSIF rule.rule_key='template_project_structure' THEN
        SELECT p.name,p.client_id,i.template_snapshot->>'name' INTO entity_title,client_id,template_name
        FROM public.project_template_instantiations i JOIN public.projects p ON p.id=i.project_id WHERE i.id=ev.entity_id;
        project_id := (ev.payload->>'project_id')::uuid;
        INSERT INTO public.activity_logs(workspace_id,actor_id,action_type,entity_type,entity_id,client_id,project_id,title,description,metadata)
        VALUES(ev.workspace_id,NULL,'automation_template_structure','project',project_id,client_id,project_id,COALESCE(entity_title,'Projeto'),'Estrutura gerada automaticamente pelo modelo '||COALESCE(template_name,'selecionado'),jsonb_build_object('instantiation_id',ev.entity_id,'correlation_id',ev.correlation_id));
        affected := 1;
      END IF;
      UPDATE public.automation_runs SET status='success',result=jsonb_build_object('affected',affected),finished_at=clock_timestamp(),duration_ms=GREATEST(0,round(extract(epoch FROM (clock_timestamp()-run_started))*1000)::integer) WHERE id=run_id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.automation_runs SET status='error',error_message=SQLERRM,finished_at=clock_timestamp(),duration_ms=GREATEST(0,round(extract(epoch FROM (clock_timestamp()-run_started))*1000)::integer) WHERE id=run_id;
    END;
    run_id := NULL; affected := 0;
  END LOOP;
  UPDATE public.automation_events SET status='completed',processed_at=now() WHERE id=ev.id;
  RETURN 1;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.automation_events SET status='failed',error_message=SQLERRM,processed_at=now() WHERE id=p_event_id;
  RETURN 0;
END $$;

COMMIT;
