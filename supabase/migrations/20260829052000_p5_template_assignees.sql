BEGIN;

CREATE OR REPLACE FUNCTION public.apply_project_template(p_template_id uuid, p_project_id uuid, p_start_date date DEFAULT current_date, p_fallback_assignee uuid DEFAULT auth.uid())
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_template public.project_templates%ROWTYPE; v_project public.projects%ROWTYPE; v_count integer;
BEGIN
  SELECT * INTO v_template FROM public.project_templates WHERE id=p_template_id AND status='published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo publicado não encontrado'; END IF;
  SELECT * INTO v_project FROM public.projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND OR v_project.workspace_id<>v_template.workspace_id THEN RAISE EXCEPTION 'Projeto incompatível com o modelo'; END IF;
  IF private.user_project_access_level((SELECT auth.uid()),p_project_id)<2 THEN RAISE EXCEPTION 'Sem permissão para aplicar o modelo'; END IF;

  INSERT INTO public.project_members(project_id,user_id,access_level,created_by)
  SELECT p_project_id,assignee,'editor',(SELECT auth.uid()) FROM (
    SELECT p_fallback_assignee assignee
    UNION SELECT default_assignee_id FROM public.task_templates WHERE project_template_id=p_template_id
  ) candidates
  WHERE assignee IS NOT NULL AND private.can_assign_workspace_task(assignee,v_project.workspace_id)
  ON CONFLICT(project_id,user_id) DO NOTHING;

  INSERT INTO public.project_stages(workspace_id,project_id,source_template_stage_id,title,description,position)
  SELECT v_project.workspace_id,p_project_id,s.id,s.title,s.description,s.position FROM public.project_template_stages s WHERE s.template_id=p_template_id
  ON CONFLICT(project_id,position) DO NOTHING;
  INSERT INTO public.tasks(title,description,project_id,client_id,type,responsible,priority,due_date,status,evidence_required,task_type,assigned_to,created_by,start_date,workspace_id,checklist,source_task_template_id)
  SELECT tt.title,tt.description,p_project_id,v_project.client_id,tt.task_category,COALESCE(pr.full_name,au.email,'Responsável'),tt.default_priority,COALESCE(p_start_date,current_date)+tt.due_offset_days,tt.initial_status,tt.evidence_required,'project',COALESCE(tt.default_assignee_id,p_fallback_assignee,(SELECT auth.uid())),(SELECT auth.uid()),COALESCE(p_start_date,current_date)+tt.start_offset_days,v_project.workspace_id,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ci.id::text,'text',ci.text,'completed',false) ORDER BY ci.position) FROM public.task_template_checklist_items ci WHERE ci.task_template_id=tt.id),'[]'::jsonb),tt.id
  FROM public.task_templates tt LEFT JOIN auth.users au ON au.id=COALESCE(tt.default_assignee_id,p_fallback_assignee,(SELECT auth.uid())) LEFT JOIN public.profiles pr ON pr.id=au.id
  WHERE tt.project_template_id=p_template_id AND private.user_project_access_level(COALESCE(tt.default_assignee_id,p_fallback_assignee,(SELECT auth.uid())),p_project_id)>=1
  ON CONFLICT(project_id,source_task_template_id) WHERE source_task_template_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  INSERT INTO public.project_document_links(project_id,document_id,workspace_id) SELECT p_project_id,d.document_id,v_project.workspace_id FROM public.project_template_documents d WHERE d.template_id=p_template_id ON CONFLICT DO NOTHING;
  UPDATE public.projects SET source_template_id=p_template_id,template_snapshot=jsonb_build_object('id',v_template.id,'name',v_template.name,'versioned_at',now()),updated_at=now() WHERE id=p_project_id;
  INSERT INTO public.project_template_instantiations(workspace_id,template_id,project_id,template_snapshot,created_by) VALUES(v_project.workspace_id,p_template_id,p_project_id,jsonb_build_object('id',v_template.id,'name',v_template.name,'applied_at',now()),(SELECT auth.uid())) ON CONFLICT(project_id) DO NOTHING;
  RETURN v_count;
END $$;

COMMIT;
