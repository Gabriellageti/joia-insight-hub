BEGIN;

-- P10 — Event-driven automation engine. Operational entities remain the source
-- of truth; this layer only orchestrates actions, suggestions and audit logs.
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_key text NOT NULL CHECK (rule_key ~ '^[a-z][a-z0-9_]{2,79}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 160),
  description text NOT NULL,
  event_type text NOT NULL,
  action_type text NOT NULL,
  condition_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (workspace_id, rule_key)
);

CREATE TABLE public.automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  causation_id uuid,
  depth smallint NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 5),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','ignored')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.automation_events(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','success','skipped','error')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  UNIQUE (workspace_id, idempotency_key)
);

CREATE TABLE public.automation_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_calendar','google_drive','gmail','whatsapp','slack','external_api')),
  label text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','disabled','connected','error')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (workspace_id, provider)
);

CREATE INDEX automation_rules_workspace_enabled_idx ON public.automation_rules(workspace_id, enabled, event_type);
CREATE INDEX automation_events_pending_idx ON public.automation_events(status, created_at) WHERE status='pending';
CREATE INDEX automation_events_workspace_created_idx ON public.automation_events(workspace_id, created_at DESC);
CREATE INDEX automation_runs_workspace_started_idx ON public.automation_runs(workspace_id, started_at DESC);
CREATE INDEX automation_runs_rule_started_idx ON public.automation_runs(rule_id, started_at DESC);

INSERT INTO public.automation_rules(workspace_id,rule_key,name,description,event_type,action_type,condition_config)
SELECT w.id, seed.rule_key, seed.name, seed.description, seed.event_type, seed.action_type, seed.condition_config
FROM public.workspaces w CROSS JOIN (VALUES
  ('urgent_task_overdue','Tarefa urgente atrasada','Quando uma tarefa urgente ultrapassa o prazo, alerta o responsável.','schedule.tick','notify_assignee','{"priority":"urgent"}'::jsonb),
  ('inactive_project_attention','Projeto sem atividade','Quando um projeto fica sem atividade além do limite operacional, sinaliza atenção à gestão.','schedule.tick','notify_managers','{"setting":"project_stale_days"}'::jsonb),
  ('meeting_finalized_history','Reunião finalizada','Quando uma reunião é finalizada, confirma o registro no histórico operacional.','meeting.finalized','append_history','{}'::jsonb),
  ('won_opportunity_client','Oportunidade ganha','Quando uma oportunidade é ganha, sugere criar ou vincular o cliente.','commercial.opportunity_won','suggest_client','{}'::jsonb),
  ('client_created_project','Cliente criado','Quando um cliente é criado, sugere iniciar um projeto.','client.created','suggest_project','{}'::jsonb),
  ('template_project_structure','Projeto criado por modelo','Quando um modelo é aplicado, registra e confirma a estrutura gerada automaticamente.','project.template_applied','confirm_structure','{}'::jsonb),
  ('overdue_next_step_task','Próximo passo atrasado','Quando um próximo passo vence, cria uma tarefa vinculada sem duplicar registros.','schedule.tick','create_pending_task','{}'::jsonb),
  ('blocked_task_escalation','Bloqueio prolongado','Quando uma tarefa permanece bloqueada além do limite, alerta a gestão.','schedule.tick','notify_managers','{"setting":"blocked_stale_days"}'::jsonb)
) seed(rule_key,name,description,event_type,action_type,condition_config)
ON CONFLICT (workspace_id,rule_key) DO NOTHING;

INSERT INTO public.automation_connectors(workspace_id,provider,label)
SELECT w.id, c.provider, c.label FROM public.workspaces w CROSS JOIN (VALUES
  ('google_calendar','Google Calendar'),('google_drive','Google Drive'),('gmail','Gmail'),
  ('whatsapp','WhatsApp'),('slack','Slack'),('external_api','API externa')
) c(provider,label)
ON CONFLICT (workspace_id,provider) DO NOTHING;

ALTER TABLE public.internal_notifications DROP CONSTRAINT IF EXISTS internal_notifications_type_check;
ALTER TABLE public.internal_notifications ADD CONSTRAINT internal_notifications_type_check CHECK (notification_type IN (
  'task_assigned','due_soon','overdue','comment','mention','status_changed','blocked','meeting_upcoming',
  'meeting_unfinished','project_risk','client_attention','automation_alert','automation_suggestion','automation_pending'
));

CREATE OR REPLACE FUNCTION private.automation_notify(
  p_workspace_id uuid, p_user_id uuid, p_type text, p_title text, p_body text,
  p_dedupe_key text, p_priority text, p_action_url text DEFAULT NULL,
  p_task_id uuid DEFAULT NULL, p_client_id uuid DEFAULT NULL, p_project_id uuid DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.internal_notifications(
    workspace_id,user_id,notification_type,title,body,dedupe_key,priority,action_url,
    task_id,client_id,project_id,meeting_id,resolved_at
  ) VALUES (
    p_workspace_id,p_user_id,p_type,p_title,p_body,p_dedupe_key,p_priority,p_action_url,
    p_task_id,p_client_id,p_project_id,p_meeting_id,NULL
  ) ON CONFLICT(user_id,dedupe_key) DO UPDATE SET
    title=excluded.title,body=excluded.body,priority=excluded.priority,action_url=excluded.action_url,
    resolved_at=NULL,read_at=CASE WHEN public.internal_notifications.resolved_at IS NOT NULL THEN NULL ELSE public.internal_notifications.read_at END;
  GET DIAGNOSTICS affected=ROW_COUNT;
  RETURN affected;
END $$;

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

CREATE OR REPLACE FUNCTION private.emit_automation_event(
  p_workspace_id uuid,p_event_type text,p_entity_type text,p_entity_id uuid,p_payload jsonb DEFAULT '{}'::jsonb,
  p_correlation_id uuid DEFAULT NULL,p_causation_id uuid DEFAULT NULL,p_depth smallint DEFAULT 0
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE event_id uuid;
BEGIN
  IF p_workspace_id IS NULL OR p_depth > 5 THEN RETURN NULL; END IF;
  INSERT INTO public.automation_events(workspace_id,event_type,entity_type,entity_id,payload,correlation_id,causation_id,depth)
  VALUES(p_workspace_id,p_event_type,p_entity_type,p_entity_id,COALESCE(p_payload,'{}'::jsonb),COALESCE(p_correlation_id,gen_random_uuid()),p_causation_id,p_depth)
  RETURNING id INTO event_id;
  PERFORM private.execute_automation_event(event_id);
  RETURN event_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION private.capture_automation_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_TABLE_NAME='meetings' AND NEW.status='Realizada' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM private.emit_automation_event(NEW.workspace_id,'meeting.finalized','meeting',NEW.id,jsonb_build_object('version',extract(epoch FROM NEW.ended_at)::bigint));
  ELSIF TG_TABLE_NAME='leads' AND NEW.stage='won' AND (TG_OP='INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    PERFORM private.emit_automation_event(NEW.workspace_id,'commercial.opportunity_won','lead',NEW.id,jsonb_build_object('version',extract(epoch FROM NEW.won_at)::bigint));
  ELSIF TG_TABLE_NAME='clients' AND TG_OP='INSERT' THEN
    PERFORM private.emit_automation_event(NEW.workspace_id,'client.created','client',NEW.id,jsonb_build_object('version',extract(epoch FROM NEW.created_at)::bigint));
  ELSIF TG_TABLE_NAME='project_template_instantiations' AND TG_OP='INSERT' THEN
    PERFORM private.emit_automation_event(NEW.workspace_id,'project.template_applied','project_template_instantiation',NEW.id,jsonb_build_object('project_id',NEW.project_id,'template_id',NEW.template_id,'version',extract(epoch FROM NEW.created_at)::bigint));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER automation_meeting_event AFTER INSERT OR UPDATE OF status ON public.meetings FOR EACH ROW EXECUTE FUNCTION private.capture_automation_event();
CREATE TRIGGER automation_lead_event AFTER INSERT OR UPDATE OF stage ON public.leads FOR EACH ROW EXECUTE FUNCTION private.capture_automation_event();
CREATE TRIGGER automation_client_event AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION private.capture_automation_event();
CREATE TRIGGER automation_template_event AFTER INSERT ON public.project_template_instantiations FOR EACH ROW EXECUTE FUNCTION private.capture_automation_event();

CREATE OR REPLACE FUNCTION public.run_scheduled_automations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); workspace uuid := private.current_workspace_id(); rule public.automation_rules%ROWTYPE;
  item record; run_id uuid; idempotency text; started timestamptz; affected integer; total integer:=0; skipped integer:=0;
BEGIN
  IF actor IS NULL OR workspace IS NULL OR COALESCE(private.workspace_access_level(workspace),0)<2 THEN RAISE EXCEPTION 'workspace access denied' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(workspace::text),hashtext('scheduled_automations'));
  FOR rule IN SELECT * FROM public.automation_rules WHERE workspace_id=workspace AND event_type='schedule.tick' AND enabled ORDER BY rule_key LOOP
    IF rule.rule_key='urgent_task_overdue' THEN
      FOR item IN SELECT t.id,t.title,t.assigned_to,t.client_id,t.project_id FROM public.tasks t WHERE t.workspace_id=workspace AND t.status<>'done' AND t.priority='urgent' AND t.due_date<current_date LOOP
        idempotency:=rule.rule_key||':'||item.id||':'||current_date; started:=clock_timestamp(); run_id:=NULL;
        INSERT INTO public.automation_runs(workspace_id,rule_id,entity_type,entity_id,idempotency_key,status) VALUES(workspace,rule.id,'task',item.id,idempotency,'running') ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped:=skipped+1; CONTINUE; END IF;
        affected:=private.automation_notify(workspace,item.assigned_to,'automation_alert','Tarefa urgente atrasada',item.title,'automation:urgent-overdue:'||item.id,'urgent','/minhas-tarefas',item.id,item.client_id,item.project_id);
        UPDATE public.automation_runs SET status='success',result=jsonb_build_object('affected',affected),finished_at=clock_timestamp(),duration_ms=GREATEST(0,round(extract(epoch FROM (clock_timestamp()-started))*1000)::integer) WHERE id=run_id; total:=total+1;
      END LOOP;
    ELSIF rule.rule_key='inactive_project_attention' THEN
      FOR item IN SELECT h.project_id id,h.project_name title,h.client_id FROM public.operational_project_health h JOIN public.workspace_operational_settings s ON s.workspace_id=h.workspace_id WHERE h.workspace_id=workspace AND h.health<>'completed' AND h.last_activity_at<now()-make_interval(days=>s.project_stale_days) LOOP
        idempotency:=rule.rule_key||':'||item.id||':'||current_date; started:=clock_timestamp(); run_id:=NULL;
        INSERT INTO public.automation_runs(workspace_id,rule_id,entity_type,entity_id,idempotency_key,status) VALUES(workspace,rule.id,'project',item.id,idempotency,'running') ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped:=skipped+1; CONTINUE; END IF; affected:=0;
        FOR actor IN SELECT user_id FROM public.workspace_members WHERE workspace_id=workspace AND role::text IN ('owner','admin','manager') LOOP affected:=affected+private.automation_notify(workspace,actor,'automation_alert','Projeto sem atividade recente',item.title,'automation:project-stale:'||item.id,'important','/projetos/'||item.id,NULL,item.client_id,item.id); END LOOP;
        UPDATE public.automation_runs SET status='success',result=jsonb_build_object('affected',affected,'health','attention'),finished_at=clock_timestamp(),duration_ms=GREATEST(0,round(extract(epoch FROM (clock_timestamp()-started))*1000)::integer) WHERE id=run_id; total:=total+1;
      END LOOP;
    ELSIF rule.rule_key='overdue_next_step_task' THEN
      FOR item IN SELECT ns.id,ns.description title,ns.responsible_user_id,ns.due_date,m.id meeting_id,m.project_id,m.client_id FROM public.meeting_next_steps ns JOIN public.meetings m ON m.id=ns.meeting_id WHERE m.workspace_id=workspace AND ns.completed_at IS NULL AND ns.due_date<current_date AND NOT EXISTS(SELECT 1 FROM public.tasks t WHERE t.source_next_step_id=ns.id) LOOP
        idempotency:=rule.rule_key||':'||item.id; started:=clock_timestamp(); run_id:=NULL;
        INSERT INTO public.automation_runs(workspace_id,rule_id,entity_type,entity_id,idempotency_key,status) VALUES(workspace,rule.id,'meeting_next_step',item.id,idempotency,'running') ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped:=skipped+1; CONTINUE; END IF;
        INSERT INTO public.tasks(workspace_id,title,description,project_id,client_id,type,responsible,priority,due_date,status,task_type,assigned_to,created_by,source_meeting_id,source_next_step_id)
        VALUES(workspace,item.title,'Próximo passo atrasado convertido automaticamente em pendência.',item.project_id,item.client_id,'Tarefa','Responsável','high',item.due_date,'not_started',CASE WHEN item.project_id IS NOT NULL THEN 'project' WHEN item.client_id IS NOT NULL THEN 'client' ELSE 'personal' END,COALESCE(item.responsible_user_id,auth.uid()),auth.uid(),item.meeting_id,item.id);
        UPDATE public.automation_runs SET status='success',result='{"created_task":true}'::jsonb,finished_at=clock_timestamp(),duration_ms=GREATEST(0,round(extract(epoch FROM (clock_timestamp()-started))*1000)::integer) WHERE id=run_id; total:=total+1;
      END LOOP;
    ELSIF rule.rule_key='blocked_task_escalation' THEN
      FOR item IN SELECT t.id,t.title,t.client_id,t.project_id FROM public.tasks t JOIN public.workspace_operational_settings s ON s.workspace_id=t.workspace_id WHERE t.workspace_id=workspace AND t.status='blocked' AND t.blocked_at<now()-make_interval(days=>s.blocked_stale_days) LOOP
        idempotency:=rule.rule_key||':'||item.id||':'||current_date; started:=clock_timestamp(); run_id:=NULL;
        INSERT INTO public.automation_runs(workspace_id,rule_id,entity_type,entity_id,idempotency_key,status) VALUES(workspace,rule.id,'task',item.id,idempotency,'running') ON CONFLICT DO NOTHING RETURNING id INTO run_id;
        IF run_id IS NULL THEN skipped:=skipped+1; CONTINUE; END IF; affected:=0;
        FOR actor IN SELECT user_id FROM public.workspace_members WHERE workspace_id=workspace AND role::text IN ('owner','admin','manager') LOOP affected:=affected+private.automation_notify(workspace,actor,'automation_alert','Bloqueio prolongado',item.title,'automation:blocked-stale:'||item.id,'urgent','/plano-acao',item.id,item.client_id,item.project_id); END LOOP;
        UPDATE public.automation_runs SET status='success',result=jsonb_build_object('affected',affected),finished_at=clock_timestamp(),duration_ms=GREATEST(0,round(extract(epoch FROM (clock_timestamp()-started))*1000)::integer) WHERE id=run_id; total:=total+1;
      END LOOP;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('executed',total,'deduplicated',skipped,'ran_at',now());
END $$;

CREATE OR REPLACE FUNCTION private.protect_automation_configuration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF COALESCE(private.workspace_access_level(COALESCE(NEW.workspace_id,OLD.workspace_id)),0)<3 THEN RAISE EXCEPTION 'manager access required' USING ERRCODE='42501'; END IF;
  IF TG_TABLE_NAME='automation_rules' THEN
    IF TG_OP='UPDATE' AND (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.rule_key IS DISTINCT FROM OLD.rule_key OR NEW.event_type IS DISTINCT FROM OLD.event_type OR NEW.action_type IS DISTINCT FROM OLD.action_type OR NEW.is_system IS DISTINCT FROM OLD.is_system) THEN RAISE EXCEPTION 'system rule identity is immutable' USING ERRCODE='42501'; END IF;
    NEW.updated_at:=now(); NEW.updated_by:=auth.uid();
  ELSE NEW.updated_at:=now(); NEW.updated_by:=auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_automation_rules BEFORE INSERT OR UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION private.protect_automation_configuration();
CREATE TRIGGER protect_automation_connectors BEFORE INSERT OR UPDATE ON public.automation_connectors FOR EACH ROW EXECUTE FUNCTION private.protect_automation_configuration();

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_rules_member_select ON public.automation_rules FOR SELECT TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=2);
CREATE POLICY automation_rules_manager_update ON public.automation_rules FOR UPDATE TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=3) WITH CHECK(COALESCE(private.workspace_access_level(workspace_id),0)>=3);
CREATE POLICY automation_events_manager_select ON public.automation_events FOR SELECT TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=3);
CREATE POLICY automation_runs_manager_select ON public.automation_runs FOR SELECT TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=3);
CREATE POLICY automation_connectors_member_select ON public.automation_connectors FOR SELECT TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=2);
CREATE POLICY automation_connectors_manager_update ON public.automation_connectors FOR UPDATE TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=3) WITH CHECK(COALESCE(private.workspace_access_level(workspace_id),0)>=3);

GRANT SELECT ON public.automation_rules,public.automation_connectors TO authenticated;
GRANT UPDATE(enabled,condition_config,action_config) ON public.automation_rules TO authenticated;
GRANT UPDATE(status,config) ON public.automation_connectors TO authenticated;
GRANT SELECT ON public.automation_events,public.automation_runs TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_automations() TO authenticated;
REVOKE ALL ON public.automation_rules,public.automation_events,public.automation_runs,public.automation_connectors FROM anon;
REVOKE ALL ON FUNCTION public.run_scheduled_automations() FROM anon;
REVOKE ALL ON FUNCTION private.automation_notify(uuid,uuid,text,text,text,text,text,text,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.execute_automation_event(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.emit_automation_event(uuid,text,text,uuid,jsonb,uuid,uuid,smallint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.capture_automation_event() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.protect_automation_configuration() FROM PUBLIC,anon,authenticated;

COMMIT;
