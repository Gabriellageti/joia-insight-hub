BEGIN;
SET LOCAL request.jwt.claims = '{"sub":"2320b1be-f999-4a1a-b1d4-79458041d13d","role":"authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_template uuid;
  v_project uuid := gen_random_uuid();
  v_duplicate uuid;
  v_standalone uuid;
  v_count integer;
BEGIN
  SELECT id INTO v_template FROM public.project_templates
  WHERE workspace_id='00000000-0000-0000-0000-000000000001' AND name='Consultoria Empresarial' AND status='published';
  IF v_template IS NULL THEN RAISE EXCEPTION 'Modelo padrão não encontrado'; END IF;

  INSERT INTO public.projects(id,name,client_id,start_date,workspace_id)
  VALUES(v_project,'P5 validação transacional','404daaf7-fb34-4f16-9397-4f4a47e2f2f4','2026-09-01','00000000-0000-0000-0000-000000000001');

  v_count := public.apply_project_template(v_template,v_project,'2026-09-01','2320b1be-f999-4a1a-b1d4-79458041d13d');
  IF v_count <> 7 THEN RAISE EXCEPTION 'Esperadas 7 tarefas; geradas %',v_count; END IF;
  IF (SELECT count(*) FROM public.project_stages WHERE project_id=v_project) <> 7 THEN RAISE EXCEPTION 'Etapas não geradas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE project_id=v_project AND due_date='2026-09-16' AND jsonb_array_length(checklist)=2) THEN RAISE EXCEPTION 'Prazo +15 ou checklist incorreto'; END IF;
  IF public.apply_project_template(v_template,v_project,'2026-09-01','2320b1be-f999-4a1a-b1d4-79458041d13d') <> 0 THEN RAISE EXCEPTION 'Aplicação não é idempotente'; END IF;

  v_duplicate := public.duplicate_project(v_project,'P5 cópia transacional','404daaf7-fb34-4f16-9397-4f4a47e2f2f4','2026-10-01',true,true,true,true,true);
  IF (SELECT count(*) FROM public.tasks WHERE project_id=v_duplicate) <> 7 THEN RAISE EXCEPTION 'Tarefas não duplicadas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE project_id=v_duplicate AND due_date='2026-10-16') THEN RAISE EXCEPTION 'Datas relativas não deslocadas'; END IF;
  IF (SELECT count(*) FROM public.project_stages WHERE project_id=v_duplicate) <> 7 THEN RAISE EXCEPTION 'Etapas não duplicadas'; END IF;
  v_standalone := public.save_task_template('Auditoria Financeira','Modelo menor reutilizável','high',0,7,'not_started',NULL,'[{"text":"Solicitar documentos","position":0},{"text":"Revisar movimentações","position":1}]'::jsonb);
  IF NOT EXISTS (SELECT 1 FROM public.task_templates t WHERE t.id=v_standalone AND t.project_template_id IS NULL) THEN RAISE EXCEPTION 'Modelo independente não criado'; END IF;
  IF (SELECT count(*) FROM public.task_template_checklist_items WHERE task_template_id=v_standalone)<>2 THEN RAISE EXCEPTION 'Checklist independente incorreto'; END IF;
  RAISE NOTICE 'P5_OK template=%, project=%, duplicate=%, tasks=%',v_template,v_project,v_duplicate,v_count;
END $$;

RESET ROLE;
ROLLBACK;
