BEGIN;

CREATE OR REPLACE FUNCTION public.save_task_template(
  p_title text,
  p_description text,
  p_priority text,
  p_start_offset_days integer,
  p_due_offset_days integer,
  p_initial_status text,
  p_default_assignee_id uuid,
  p_checklist jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_workspace uuid:=private.current_workspace_id(); v_id uuid:=gen_random_uuid(); v_item jsonb;
BEGIN
  IF COALESCE(private.workspace_access_level(v_workspace),0)<3 THEN RAISE EXCEPTION 'Sem permissão para gerenciar modelos'; END IF;
  INSERT INTO public.task_templates(id,workspace_id,title,description,default_priority,start_offset_days,due_offset_days,initial_status,default_assignee_id,created_by)
  VALUES(v_id,v_workspace,btrim(p_title),COALESCE(p_description,''),p_priority,p_start_offset_days,p_due_offset_days,p_initial_status,p_default_assignee_id,(SELECT auth.uid()));
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_checklist,'[]'::jsonb)) LOOP
    INSERT INTO public.task_template_checklist_items(task_template_id,text,position) VALUES(v_id,btrim(v_item->>'text'),COALESCE((v_item->>'position')::integer,0));
  END LOOP;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.save_task_template(text,text,text,integer,integer,text,uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.save_task_template(text,text,text,integer,integer,text,uuid,jsonb) FROM anon;

DO $$
DECLARE v_template uuid; v_workspace uuid; v_stage uuid; v_task uuid; entry record;
BEGIN
  FOR v_template,v_workspace IN SELECT id,workspace_id FROM public.project_templates WHERE name='Consultoria Empresarial' LOOP
    DELETE FROM public.task_templates WHERE project_template_id=v_template;
    DELETE FROM public.project_template_stages WHERE template_id=v_template;
    FOR entry IN SELECT * FROM (VALUES
      (0,'Diagnóstico','Entendimento do cenário e dos objetivos.',0,3),
      (1,'Levantamento de Processos','Mapeamento do processo atual.',3,7),
      (2,'Análises','Consolidação de causas e oportunidades.',7,10),
      (3,'Plano de Ação','Priorização e definição de responsáveis.',10,15),
      (4,'Acompanhamento','Revisão da execução e bloqueios.',15,30),
      (5,'Relatório','Consolidação de resultados e recomendações.',30,45),
      (6,'Encerramento','Validação final e próximos passos.',45,60)
    ) s(position,title,description,start_day,due_day) LOOP
      v_stage:=gen_random_uuid();
      INSERT INTO public.project_template_stages(id,template_id,title,description,position) VALUES(v_stage,v_template,entry.title,entry.description,entry.position);
      v_task:=gen_random_uuid();
      INSERT INTO public.task_templates(id,workspace_id,project_template_id,stage_id,title,description,default_priority,start_offset_days,due_offset_days,position,created_by)
      VALUES(v_task,v_workspace,v_template,v_stage,entry.title,entry.description,CASE WHEN entry.position IN (0,3,6) THEN 'high' ELSE 'medium' END,entry.start_day,entry.due_day,entry.position,NULL);
      INSERT INTO public.task_template_checklist_items(task_template_id,text,position) VALUES(v_task,'Confirmar responsável',0),(v_task,'Registrar evidências',1);
    END LOOP;
  END LOOP;
END $$;

COMMIT;
