BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Live navigation FKs are optional; historical IDs live in immutable snapshots.
-- No audit row is deleted or rewritten by this migration.
ALTER TABLE public.activity_logs
  ALTER COLUMN workspace_id DROP NOT NULL,
  DROP CONSTRAINT activity_logs_workspace_id_fkey,
  ADD CONSTRAINT activity_logs_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id) ON DELETE SET NULL,
  DROP CONSTRAINT activity_logs_client_id_fkey,
  ADD CONSTRAINT activity_logs_client_id_fkey FOREIGN KEY (client_id)
    REFERENCES public.clients(id) ON DELETE SET NULL,
  DROP CONSTRAINT activity_logs_project_id_fkey,
  ADD CONSTRAINT activity_logs_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES public.projects(id) ON DELETE SET NULL,
  DROP CONSTRAINT activity_logs_meeting_id_fkey,
  ADD CONSTRAINT activity_logs_meeting_id_fkey FOREIGN KEY (meeting_id)
    REFERENCES public.meetings(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION private.preserve_activity_history_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $history$
DECLARE source_row jsonb; original_refs jsonb; workspace_slug text;
BEGIN
  source_row := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  original_refs := jsonb_strip_nulls(jsonb_build_object(
    'workspace_id', source_row->'workspace_id', 'actor_id', source_row->'actor_id',
    'client_id', source_row->'client_id', 'project_id', source_row->'project_id',
    'meeting_id', source_row->'meeting_id', 'task_id', source_row->'task_id',
    'entity_id', source_row->'entity_id'
  )) || COALESCE(source_row->'metadata'->'references', '{}'::jsonb);
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb)
    || jsonb_build_object('references', original_refs);
  SELECT slug INTO workspace_slug FROM public.workspaces
    WHERE id = NULLIF(original_refs->>'workspace_id', '')::uuid;
  IF workspace_slug LIKE 'p11-e2e-%' THEN
    NEW.metadata := NEW.metadata || jsonb_build_object('environment', 'e2e', 'test_run_id', workspace_slug);
  END IF;
  -- AFTER DELETE and cascade events can reference a parent already removed.
  -- Preserve the original reference above; only the live FK becomes null.
  IF TG_OP = 'INSERT' THEN
    IF NEW.workspace_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id=NEW.workspace_id) THEN NEW.workspace_id := NULL; END IF;
    IF NEW.client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id=NEW.client_id) THEN NEW.client_id := NULL; END IF;
    IF NEW.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id=NEW.project_id) THEN NEW.project_id := NULL; END IF;
    IF NEW.meeting_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.meetings WHERE id=NEW.meeting_id) THEN NEW.meeting_id := NULL; END IF;
    IF NEW.task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tasks WHERE id=NEW.task_id) THEN NEW.task_id := NULL; END IF;
    IF NEW.actor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id=NEW.actor_id) THEN NEW.actor_id := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$history$;
REVOKE ALL ON FUNCTION private.preserve_activity_history_context() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER preserve_activity_history_context BEFORE INSERT OR UPDATE ON public.activity_logs
FOR EACH ROW EXECUTE FUNCTION private.preserve_activity_history_context();

CREATE OR REPLACE FUNCTION private.log_core_operational_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $core$
DECLARE payload jsonb; entity_id uuid; client_id uuid; project_id uuid; task_id uuid;
BEGIN
  payload := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_TABLE_NAME = 'tasks' AND NULLIF(payload->>'source_meeting_id', '') IS NOT NULL AND TG_OP <> 'DELETE' THEN RETURN NEW; END IF;
  entity_id := (payload->>'id')::uuid;
  client_id := CASE WHEN TG_TABLE_NAME = 'clients' THEN entity_id ELSE NULLIF(payload->>'client_id', '')::uuid END;
  project_id := CASE WHEN TG_TABLE_NAME = 'projects' THEN entity_id ELSE NULLIF(payload->>'project_id', '')::uuid END;
  task_id := CASE WHEN TG_TABLE_NAME = 'tasks' THEN entity_id ELSE NULL END;
  INSERT INTO public.activity_logs(workspace_id,actor_id,action_type,entity_type,entity_id,client_id,project_id,meeting_id,task_id,title,description,metadata)
  VALUES ((payload->>'workspace_id')::uuid,auth.uid(),TG_TABLE_NAME || '_' || lower(TG_OP),
    CASE TG_TABLE_NAME WHEN 'tasks' THEN 'task' WHEN 'projects' THEN 'project' WHEN 'clients' THEN 'client' WHEN 'meetings' THEN 'meeting' END,
    entity_id,client_id,project_id,CASE WHEN TG_TABLE_NAME='meetings' THEN entity_id ELSE NULL END,task_id,
    COALESCE(payload->>'title',payload->>'name','Registro operacional'),
    CASE TG_OP WHEN 'INSERT' THEN 'Registro criado' WHEN 'DELETE' THEN 'Registro removido' ELSE 'Registro atualizado' END,
    jsonb_strip_nulls(jsonb_build_object('status',payload->>'status','priority',payload->>'priority',
      'entity_snapshot',jsonb_build_object('id',entity_id,'title',COALESCE(payload->>'title',payload->>'name'),
        'workspace_id',payload->'workspace_id','client_id',client_id,'project_id',project_id,
        'status',payload->'status','priority',payload->'priority','due_date',payload->'due_date'))));
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$core$;
REVOKE ALL ON FUNCTION private.log_core_operational_activity() FROM PUBLIC, anon, authenticated;

-- Capture a parent snapshot before its children cascade. Other meeting events
-- keep their existing specialized trigger; no duplicate create/update events.
CREATE TRIGGER log_meeting_delete_history BEFORE DELETE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION private.log_core_operational_activity();

CREATE OR REPLACE FUNCTION private.log_meeting_child_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $child$
DECLARE parent public.meetings%ROWTYPE; payload jsonb; historical public.activity_logs%ROWTYPE;
  item_description text; action_name text; row_meeting_id uuid;
BEGIN
  payload := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  row_meeting_id := (payload->>'meeting_id')::uuid;
  SELECT * INTO parent FROM public.meetings WHERE id=row_meeting_id;
  IF NOT FOUND THEN
    -- Parent deletion was snapshotted by the BEFORE DELETE trigger above.
    SELECT * INTO historical FROM public.activity_logs
      WHERE entity_type='meeting' AND entity_id=row_meeting_id AND action_type='meetings_delete'
      ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Meeting audit parent snapshot missing'; END IF;
    parent.id := row_meeting_id;
    parent.workspace_id := (historical.metadata->'references'->>'workspace_id')::uuid;
    parent.client_id := (historical.metadata->'references'->>'client_id')::uuid;
    parent.project_id := (historical.metadata->'references'->>'project_id')::uuid;
    parent.title := historical.title;
  END IF;
  item_description := COALESCE(payload->>'description', payload->>'title');
  IF TG_TABLE_NAME='meeting_decisions' THEN
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'decision_created' WHEN 'DELETE' THEN 'decision_deleted' ELSE 'decision_updated' END;
  ELSIF TG_TABLE_NAME='meeting_next_steps' THEN
    action_name := CASE WHEN TG_OP='INSERT' THEN 'next_step_created' WHEN TG_OP='DELETE' THEN 'next_step_deleted'
      WHEN NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN 'next_step_completion_changed' ELSE 'next_step_updated' END;
  ELSE
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'agenda_item_created' WHEN 'DELETE' THEN 'agenda_item_deleted' ELSE 'agenda_item_updated' END;
  END IF;
  INSERT INTO public.activity_logs(workspace_id,actor_id,action_type,entity_type,entity_id,client_id,project_id,meeting_id,title,description,metadata)
  VALUES(parent.workspace_id,auth.uid(),action_name,TG_TABLE_NAME,(payload->>'id')::uuid,parent.client_id,parent.project_id,row_meeting_id,
    parent.title,item_description,jsonb_build_object('entity_snapshot',jsonb_build_object('id',payload->'id','meeting_id',row_meeting_id,'description',item_description)));
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$child$;
REVOKE ALL ON FUNCTION private.log_meeting_child_activity() FROM PUBLIC, anon, authenticated;

-- Existing workspace policy remains unchanged: detached historical events are
-- server-only. Browser writes/expunge remain forbidden; no retention purge.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.activity_logs FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
