BEGIN;
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
    SELECT m.workspace_id,actor,CASE WHEN m.date<now() THEN 'meeting_unfinished' ELSE 'meeting_upcoming' END,CASE WHEN m.date<now() THEN 'Reunião pendente de finalização' ELSE 'Reunião próxima' END,m.title,m.client_id,m.project_id,m.id,(CASE WHEN m.date<now() THEN 'meeting-unfinished:' ELSE 'meeting-upcoming:' END)||m.id::text,CASE WHEN m.date<now() THEN 'important' ELSE 'attention' END,'/reunioes/'||m.id::text,NULL
    FROM public.meetings m WHERE m.workspace_id=workspace AND m.status NOT IN ('Realizada','Cancelada') AND m.date BETWEEN now()-interval '1 day' AND now()+interval '24 hours' AND (m.responsible_user_id=actor OR m.created_by=actor OR (m.project_id IS NOT NULL AND private.user_project_access_level(actor,m.project_id)>=1))
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
COMMIT;
