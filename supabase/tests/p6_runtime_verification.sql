BEGIN;
SET LOCAL request.jwt.claims='{"sub":"2320b1be-f999-4a1a-b1d4-79458041d13d","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  actor constant uuid:='2320b1be-f999-4a1a-b1d4-79458041d13d';
  mentioned constant uuid:='9e0a217a-dc5d-4458-b2fe-ace82d103975';
  workspace constant uuid:='00000000-0000-0000-0000-000000000001';
  client constant uuid:='404daaf7-fb34-4f16-9397-4f4a47e2f2f4';
  project uuid:=gen_random_uuid(); task uuid:=gen_random_uuid(); meeting uuid:=gen_random_uuid(); notification uuid;
BEGIN
  INSERT INTO public.notification_preferences(user_id,in_app_notifications,task_notifications,project_notifications,meeting_notifications,client_notifications,mention_notifications)
  VALUES(actor,true,true,true,true,true,true) ON CONFLICT(user_id) DO UPDATE SET in_app_notifications=true,task_notifications=true,project_notifications=true,meeting_notifications=true,client_notifications=true,mention_notifications=true;
  INSERT INTO public.projects(id,name,client_id,start_date,workspace_id) VALUES(project,'P6 validação transacional',client,current_date,workspace);
  INSERT INTO public.project_members(project_id,user_id,access_level,created_by) VALUES(project,mentioned,'editor',actor) ON CONFLICT DO NOTHING;
  INSERT INTO public.tasks(id,title,project_id,client_id,priority,due_date,status,task_type,assigned_to,created_by,workspace_id)
  VALUES(task,'Tarefa urgente P6',project,client,'urgent',current_date-1,'not_started','project',mentioned,actor,workspace);
  INSERT INTO public.task_comments(task_id,user_id,user_name,content) VALUES(task,actor,'Gabriel Lage Pires Matias','@Gustavo Santos verifique este item');
  PERFORM set_config('request.jwt.claims','{"sub":"9e0a217a-dc5d-4458-b2fe-ace82d103975","role":"authenticated"}',true);
  IF NOT EXISTS(SELECT 1 FROM public.internal_notifications WHERE user_id=mentioned AND task_id=task AND notification_type='task_assigned' AND priority='urgent' AND action_url LIKE '/plano-acao%') THEN RAISE EXCEPTION 'Atribuição acionável não gerada'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.internal_notifications WHERE user_id=mentioned AND task_id=task AND notification_type='mention' AND priority='important') THEN RAISE EXCEPTION 'Menção não gerada'; END IF;
  SELECT id INTO notification FROM public.internal_notifications WHERE user_id=mentioned AND task_id=task AND notification_type='task_assigned';
  UPDATE public.internal_notifications SET read_at=now() WHERE id=notification;
  PERFORM set_config('request.jwt.claims','{"sub":"2320b1be-f999-4a1a-b1d4-79458041d13d","role":"authenticated"}',true);
  INSERT INTO public.meetings(id,title,project_id,client_id,date,status,workspace_id,responsible_user_id,created_by) VALUES(meeting,'Reunião P6 próxima',project,client,now()+interval '1 hour','Agendada',workspace,actor,actor);
  PERFORM public.refresh_my_notifications();
  IF NOT EXISTS(SELECT 1 FROM public.internal_notifications WHERE user_id=actor AND meeting_id=meeting AND notification_type='meeting_upcoming' AND resolved_at IS NULL) THEN RAISE EXCEPTION 'Reunião próxima não gerada'; END IF;
  IF EXISTS(SELECT 1 FROM public.operational_project_health WHERE project_id=project AND health IN ('attention','critical')) AND NOT EXISTS(SELECT 1 FROM public.internal_notifications WHERE user_id=actor AND project_id=project AND notification_type='project_risk' AND resolved_at IS NULL) THEN RAISE EXCEPTION 'Risco de projeto não gerado'; END IF;
  IF EXISTS(SELECT 1 FROM public.operational_client_health WHERE client_id=client AND health IN ('attention','critical')) AND NOT EXISTS(SELECT 1 FROM public.internal_notifications WHERE user_id=actor AND client_id=client AND notification_type='client_attention' AND resolved_at IS NULL) THEN RAISE EXCEPTION 'Atenção de cliente não gerada'; END IF;
  UPDATE public.tasks SET title='Tarefa urgente P6 revisada' WHERE id=task;
  PERFORM set_config('request.jwt.claims','{"sub":"9e0a217a-dc5d-4458-b2fe-ace82d103975","role":"authenticated"}',true);
  IF (SELECT read_at FROM public.internal_notifications WHERE id=notification) IS NULL THEN RAISE EXCEPTION 'Atualização reabriu alerta já lido'; END IF;
  BEGIN
    UPDATE public.internal_notifications SET title='violação' WHERE id=notification;
    RAISE EXCEPTION 'Proteção de conteúdo não aplicada';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'P6_OK project=%,task=%,meeting=%',project,task,meeting;
END $$;

RESET ROLE;
ROLLBACK;
