BEGIN;

CREATE OR REPLACE FUNCTION private.capture_automation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_row jsonb := to_jsonb(NEW);
  old_row jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  workspace_id uuid := (new_row ->> 'workspace_id')::uuid;
  entity_id uuid := (new_row ->> 'id')::uuid;
BEGIN
  IF TG_TABLE_NAME = 'meetings' THEN
    IF new_row ->> 'status' = 'Realizada'
       AND (TG_OP = 'INSERT' OR old_row ->> 'status' IS DISTINCT FROM new_row ->> 'status') THEN
      PERFORM private.emit_automation_event(
        workspace_id, 'meeting.finalized', 'meeting', entity_id,
        jsonb_build_object(
          'version', extract(epoch FROM NULLIF(new_row ->> 'ended_at', '')::timestamptz)::bigint
        )
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'leads' THEN
    IF new_row ->> 'stage' = 'won'
       AND (TG_OP = 'INSERT' OR old_row ->> 'stage' IS DISTINCT FROM new_row ->> 'stage') THEN
      PERFORM private.emit_automation_event(
        workspace_id, 'commercial.opportunity_won', 'lead', entity_id,
        jsonb_build_object(
          'version', extract(epoch FROM NULLIF(new_row ->> 'won_at', '')::timestamptz)::bigint
        )
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'clients' AND TG_OP = 'INSERT' THEN
    PERFORM private.emit_automation_event(
      workspace_id, 'client.created', 'client', entity_id,
      jsonb_build_object(
        'version', extract(epoch FROM NULLIF(new_row ->> 'created_at', '')::timestamptz)::bigint
      )
    );
  ELSIF TG_TABLE_NAME = 'project_template_instantiations' AND TG_OP = 'INSERT' THEN
    PERFORM private.emit_automation_event(
      workspace_id, 'project.template_applied', 'project_template_instantiation', entity_id,
      jsonb_build_object(
        'project_id', (new_row ->> 'project_id')::uuid,
        'template_id', (new_row ->> 'template_id')::uuid,
        'version', extract(epoch FROM NULLIF(new_row ->> 'created_at', '')::timestamptz)::bigint
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.capture_automation_event()
  FROM PUBLIC, anon, authenticated;

COMMIT;
