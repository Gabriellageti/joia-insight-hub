-- P6 — Evolui a central interna existente; não cria uma segunda fonte.
BEGIN;

ALTER TABLE public.internal_notifications
  DROP CONSTRAINT IF EXISTS internal_notifications_notification_type_check;
ALTER TABLE public.internal_notifications
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_channels jsonb NOT NULL DEFAULT '["in_app"]'::jsonb,
  ADD CONSTRAINT internal_notifications_type_check CHECK (notification_type IN ('task_assigned','due_soon','overdue','comment','mention','status_changed','blocked','meeting_upcoming','meeting_unfinished','project_risk','client_attention')),
  ADD CONSTRAINT internal_notifications_priority_check CHECK (priority IN ('info','attention','important','urgent'));

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS in_app_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS task_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS project_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS meeting_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mention_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS channel_config jsonb NOT NULL DEFAULT '{"email":"future","whatsapp":"future","push":"future"}'::jsonb;

CREATE INDEX internal_notifications_user_active_idx ON public.internal_notifications(user_id,created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX internal_notifications_user_priority_idx ON public.internal_notifications(user_id,priority,created_at DESC) WHERE resolved_at IS NULL AND read_at IS NULL;
CREATE INDEX meetings_responsible_date_status_idx ON public.meetings(responsible_user_id,date,status) WHERE date IS NOT NULL;

CREATE OR REPLACE FUNCTION private.notification_enabled(target_user uuid, event_type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT COALESCE((SELECT p.in_app_notifications AND CASE
    WHEN event_type='mention' THEN p.mention_notifications
    WHEN event_type LIKE 'task_%' OR event_type IN ('due_soon','overdue','comment','status_changed','blocked') THEN p.task_notifications
    WHEN event_type LIKE 'meeting_%' THEN p.meeting_notifications
    WHEN event_type='project_risk' THEN p.project_notifications
    WHEN event_type='client_attention' THEN p.client_notifications
    ELSE true END
  FROM public.notification_preferences p WHERE p.user_id=target_user),true)
$$;
REVOKE ALL ON FUNCTION private.notification_enabled(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.protect_internal_notification_write()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.notification_type IS DISTINCT FROM OLD.notification_type OR NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body OR NEW.task_id IS DISTINCT FROM OLD.task_id OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.meeting_id IS DISTINCT FROM OLD.meeting_id OR NEW.priority IS DISTINCT FROM OLD.priority OR NEW.action_url IS DISTINCT FROM OLD.action_url OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at OR NEW.delivery_channels IS DISTINCT FROM OLD.delivery_channels OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'only notification read state can be changed' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.notify_task_operational_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor_id uuid:=auth.uid(); event_priority text;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP='INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) AND private.notification_enabled(NEW.assigned_to,'task_assigned') THEN
    event_priority:=CASE NEW.priority WHEN 'urgent' THEN 'urgent' WHEN 'high' THEN 'important' ELSE 'info' END;
    INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,task_id,client_id,project_id,dedupe_key,priority,action_url)
    VALUES(NEW.workspace_id,NEW.assigned_to,'task_assigned','Você recebeu uma tarefa',NEW.title,NEW.id,NEW.client_id,NEW.project_id,'assigned:'||NEW.id::text||':'||NEW.assigned_to::text,event_priority,'/plano-acao?taskId='||NEW.id::text)
    ON CONFLICT(user_id,dedupe_key) DO UPDATE SET title=excluded.title,body=excluded.body,priority=excluded.priority,action_url=excluded.action_url,resolved_at=NULL,read_at=CASE WHEN internal_notifications.resolved_at IS NOT NULL THEN NULL ELSE internal_notifications.read_at END,created_at=CASE WHEN internal_notifications.resolved_at IS NOT NULL THEN now() ELSE internal_notifications.created_at END;
  END IF;
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_to IS NOT NULL THEN
    IF NEW.status='blocked' AND private.notification_enabled(NEW.assigned_to,'blocked') THEN
      INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,task_id,client_id,project_id,dedupe_key,priority,action_url)
      VALUES(NEW.workspace_id,NEW.assigned_to,'blocked','Tarefa bloqueada',COALESCE(NEW.block_reason,NEW.title),NEW.id,NEW.client_id,NEW.project_id,'blocked:'||NEW.id::text,'important','/plano-acao?taskId='||NEW.id::text)
      ON CONFLICT(user_id,dedupe_key) DO UPDATE SET body=excluded.body,priority=excluded.priority,resolved_at=NULL,read_at=CASE WHEN internal_notifications.resolved_at IS NOT NULL THEN NULL ELSE internal_notifications.read_at END;
    ELSIF actor_id IS DISTINCT FROM NEW.assigned_to AND private.notification_enabled(NEW.assigned_to,'status_changed') THEN
      INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,task_id,client_id,project_id,dedupe_key,priority,action_url)
      VALUES(NEW.workspace_id,NEW.assigned_to,'status_changed','Status da tarefa atualizado',NEW.title,NEW.id,NEW.client_id,NEW.project_id,'status:'||NEW.id::text||':'||NEW.status,'info','/plano-acao?taskId='||NEW.id::text) ON CONFLICT(user_id,dedupe_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient_id uuid; task_row public.tasks%ROWTYPE; mentioned record;
BEGIN
  SELECT * INTO task_row FROM public.tasks WHERE id=NEW.task_id;
  recipient_id:=COALESCE(task_row.assigned_to,task_row.created_by);
  IF recipient_id IS NOT NULL AND recipient_id IS DISTINCT FROM NEW.user_id AND private.notification_enabled(recipient_id,'comment') THEN
    INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,task_id,client_id,project_id,dedupe_key,priority,action_url)
    VALUES(task_row.workspace_id,recipient_id,'comment','Novo comentário em tarefa',task_row.title,task_row.id,task_row.client_id,task_row.project_id,'comment:'||NEW.id::text,'info','/plano-acao?taskId='||task_row.id::text) ON CONFLICT(user_id,dedupe_key) DO NOTHING;
  END IF;
  FOR mentioned IN SELECT DISTINCT p.id,p.full_name FROM public.workspace_members wm JOIN public.profiles p ON p.id=wm.user_id WHERE wm.workspace_id=task_row.workspace_id AND p.id IS DISTINCT FROM NEW.user_id AND position('@'||lower(p.full_name) in lower(NEW.content))>0 LOOP
    IF private.notification_enabled(mentioned.id,'mention') THEN
      INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,task_id,client_id,project_id,dedupe_key,priority,action_url)
      VALUES(task_row.workspace_id,mentioned.id,'mention','Você foi mencionado',NEW.user_name||' mencionou você em '||task_row.title,task_row.id,task_row.client_id,task_row.project_id,'mention:'||NEW.id::text||':'||mentioned.id::text,'important','/plano-acao?taskId='||task_row.id::text) ON CONFLICT(user_id,dedupe_key) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_my_notifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); workspace uuid:=private.current_workspace_id(); affected integer:=0; count_now integer;
BEGIN
  IF actor IS NULL OR workspace IS NULL THEN RAISE EXCEPTION 'authentication and workspace membership required' USING ERRCODE='42501'; END IF;
  UPDATE public.internal_notifications SET resolved_at=now() WHERE user_id=actor AND resolved_at IS NULL AND notification_type IN ('due_soon','overdue','meeting_upcoming','meeting_unfinished','project_risk','client_attention');

  IF private.notification_enabled(actor,'due_soon') THEN
    INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,task_id,client_id,project_id,dedupe_key,priority,action_url,resolved_at)
    SELECT t.workspace_id,actor,CASE WHEN t.due_date<CURRENT_DATE THEN 'overdue' ELSE 'due_soon' END,CASE WHEN t.due_date<CURRENT_DATE THEN 'Tarefa atrasada' ELSE 'Prazo próximo' END,t.title,t.id,t.client_id,t.project_id,(CASE WHEN t.due_date<CURRENT_DATE THEN 'overdue:' ELSE 'due:' END)||t.id::text,CASE WHEN t.due_date<CURRENT_DATE AND t.priority='urgent' THEN 'urgent' WHEN t.due_date<CURRENT_DATE THEN 'important' ELSE 'attention' END,'/plano-acao?taskId='||t.id::text,NULL
    FROM public.tasks t WHERE t.assigned_to=actor AND t.status<>'done' AND t.due_date IS NOT NULL AND t.due_date<=CURRENT_DATE+3
    ON CONFLICT(user_id,dedupe_key) DO UPDATE SET title=excluded.title,body=excluded.body,priority=excluded.priority,action_url=excluded.action_url,resolved_at=NULL,read_at=CASE WHEN internal_notifications.resolved_at IS NOT NULL THEN NULL ELSE internal_notifications.read_at END;
    GET DIAGNOSTICS count_now=ROW_COUNT; affected:=affected+count_now;
  END IF;

  IF private.notification_enabled(actor,'meeting_upcoming') THEN
    INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,client_id,project_id,meeting_id,dedupe_key,priority,action_url,resolved_at)
    SELECT m.workspace_id,actor,CASE WHEN m.date<now() AND m.status NOT IN ('completed','Concluída') THEN 'meeting_unfinished' ELSE 'meeting_upcoming' END,CASE WHEN m.date<now() THEN 'Reunião pendente de finalização' ELSE 'Reunião próxima' END,m.title,m.client_id,m.project_id,m.id,(CASE WHEN m.date<now() THEN 'meeting-unfinished:' ELSE 'meeting-upcoming:' END)||m.id::text,CASE WHEN m.date<now() THEN 'important' ELSE 'attention' END,'/reunioes/'||m.id::text,NULL
    FROM public.meetings m WHERE m.workspace_id=workspace AND m.status NOT IN ('completed','Concluída','cancelled','Cancelada') AND m.date BETWEEN now()-interval '1 day' AND now()+interval '24 hours' AND (m.responsible_user_id=actor OR m.created_by=actor OR (m.project_id IS NOT NULL AND private.user_project_access_level(actor,m.project_id)>=1))
    ON CONFLICT(user_id,dedupe_key) DO UPDATE SET title=excluded.title,body=excluded.body,priority=excluded.priority,action_url=excluded.action_url,resolved_at=NULL,read_at=CASE WHEN internal_notifications.resolved_at IS NOT NULL THEN NULL ELSE internal_notifications.read_at END;
    GET DIAGNOSTICS count_now=ROW_COUNT; affected:=affected+count_now;
  END IF;

  IF private.notification_enabled(actor,'project_risk') THEN
    INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,client_id,project_id,dedupe_key,priority,action_url,resolved_at)
    SELECT h.workspace_id,actor,'project_risk','Projeto em risco',h.project_name,h.client_id,h.project_id,'project-risk:'||h.project_id::text,CASE WHEN h.health='critical' THEN 'urgent' ELSE 'important' END,'/projetos/'||h.project_id::text,NULL FROM public.operational_project_health h WHERE h.workspace_id=workspace AND h.health IN ('attention','critical') AND (COALESCE(private.workspace_access_level(workspace),0)>=3 OR private.user_project_access_level(actor,h.project_id)>=1)
    ON CONFLICT(user_id,dedupe_key) DO UPDATE SET body=excluded.body,priority=excluded.priority,resolved_at=NULL,read_at=CASE WHEN internal_notifications.resolved_at IS NOT NULL THEN NULL ELSE internal_notifications.read_at END;
    GET DIAGNOSTICS count_now=ROW_COUNT; affected:=affected+count_now;
  END IF;

  IF private.notification_enabled(actor,'client_attention') AND COALESCE(private.workspace_access_level(workspace),0)>=3 THEN
    INSERT INTO public.internal_notifications(workspace_id,user_id,notification_type,title,body,client_id,dedupe_key,priority,action_url,resolved_at)
    SELECT h.workspace_id,actor,'client_attention','Cliente precisa de atenção',h.client_name,h.client_id,'client-attention:'||h.client_id::text,CASE WHEN h.health='critical' THEN 'urgent' ELSE 'important' END,'/clientes/'||h.client_id::text,NULL FROM public.operational_client_health h WHERE h.workspace_id=workspace AND h.health IN ('attention','critical')
    ON CONFLICT(user_id,dedupe_key) DO UPDATE SET body=excluded.body,priority=excluded.priority,resolved_at=NULL,read_at=CASE WHEN internal_notifications.resolved_at IS NOT NULL THEN NULL ELSE internal_notifications.read_at END;
    GET DIAGNOSTICS count_now=ROW_COUNT; affected:=affected+count_now;
  END IF;
  RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_my_task_notifications() RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT public.refresh_my_notifications() $$;
GRANT EXECUTE ON FUNCTION public.refresh_my_notifications() TO authenticated;
REVOKE ALL ON FUNCTION public.refresh_my_notifications() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.notify_task_operational_change(),private.notify_task_comment(),private.protect_internal_notification_write() FROM PUBLIC,anon,authenticated;

COMMIT;
