BEGIN;

CREATE OR REPLACE FUNCTION public.save_project_template(
  p_id uuid,
  p_name text,
  p_description text,
  p_project_type text,
  p_default_phase text,
  p_is_internal_process boolean,
  p_status text,
  p_stages jsonb,
  p_tasks jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE
  v_id uuid := COALESCE(p_id, gen_random_uuid());
  v_workspace uuid := private.current_workspace_id();
  v_stage jsonb;
  v_task jsonb;
  v_stage_id uuid;
  v_task_id uuid;
  v_item jsonb;
BEGIN
  IF COALESCE(private.workspace_access_level(v_workspace),0) < 3 THEN RAISE EXCEPTION 'Sem permissão para gerenciar modelos'; END IF;
  IF btrim(COALESCE(p_name,''))='' THEN RAISE EXCEPTION 'Nome do modelo é obrigatório'; END IF;
  IF p_status NOT IN ('draft','published','archived') THEN RAISE EXCEPTION 'Status inválido'; END IF;

  INSERT INTO public.project_templates(id,workspace_id,name,description,project_type,default_phase,is_internal_process,status,created_by)
  VALUES(v_id,v_workspace,btrim(p_name),COALESCE(p_description,''),COALESCE(p_project_type,'consulting'),COALESCE(p_default_phase,'Diagnóstico'),COALESCE(p_is_internal_process,false),p_status,(SELECT auth.uid()))
  ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,project_type=excluded.project_type,default_phase=excluded.default_phase,is_internal_process=excluded.is_internal_process,status=excluded.status,updated_at=now()
  WHERE project_templates.workspace_id=v_workspace;

  DELETE FROM public.task_templates WHERE project_template_id=v_id;
  DELETE FROM public.project_template_stages WHERE template_id=v_id;

  FOR v_stage IN SELECT value FROM jsonb_array_elements(COALESCE(p_stages,'[]'::jsonb)) LOOP
    v_stage_id := gen_random_uuid();
    INSERT INTO public.project_template_stages(id,template_id,title,description,position)
    VALUES(v_stage_id,v_id,btrim(v_stage->>'title'),COALESCE(v_stage->>'description',''),COALESCE((v_stage->>'position')::integer,0));

    FOR v_task IN SELECT value FROM jsonb_array_elements(COALESCE(p_tasks,'[]'::jsonb)) WHERE COALESCE((value->>'stagePosition')::integer,0)=COALESCE((v_stage->>'position')::integer,0) LOOP
      v_task_id := gen_random_uuid();
      INSERT INTO public.task_templates(id,workspace_id,project_template_id,stage_id,title,description,task_category,default_assignee_id,default_priority,start_offset_days,due_offset_days,initial_status,evidence_required,position,created_by)
      VALUES(v_task_id,v_workspace,v_id,v_stage_id,btrim(v_task->>'title'),COALESCE(v_task->>'description',''),COALESCE(v_task->>'taskCategory','processo'),NULLIF(v_task->>'defaultAssigneeId','')::uuid,COALESCE(v_task->>'priority','medium'),COALESCE((v_task->>'startOffsetDays')::integer,0),COALESCE((v_task->>'dueOffsetDays')::integer,0),COALESCE(v_task->>'initialStatus','not_started'),COALESCE((v_task->>'evidenceRequired')::boolean,false),COALESCE((v_task->>'position')::integer,0),(SELECT auth.uid()));
      FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_task->'checklist','[]'::jsonb)) LOOP
        INSERT INTO public.task_template_checklist_items(task_template_id,text,position)
        VALUES(v_task_id,btrim(v_item->>'text'),COALESCE((v_item->>'position')::integer,0));
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.save_project_template(uuid,text,text,text,text,boolean,text,jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.save_project_template(uuid,text,text,text,text,boolean,text,jsonb,jsonb) FROM anon;

COMMIT;
