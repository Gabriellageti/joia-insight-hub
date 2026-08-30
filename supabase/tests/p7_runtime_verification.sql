BEGIN;
SET LOCAL request.jwt.claims='{"sub":"2320b1be-f999-4a1a-b1d4-79458041d13d","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $$
DECLARE report_id uuid; version_id uuid; group_id uuid;
BEGIN
  report_id:=public.generate_consulting_report('404daaf7-fb34-4f16-9397-4f4a47e2f2f4',current_date-30,current_date,NULL);
  IF NOT EXISTS(SELECT 1 FROM public.consulting_reports WHERE id=report_id AND status='draft' AND version_number=1 AND sections ?& ARRAY['executive_summary','meetings','decisions','completed_tasks','pending_tasks','risks','next_steps','considerations']) THEN RAISE EXCEPTION 'Rascunho incompleto'; END IF;
  UPDATE public.consulting_reports SET sections=jsonb_set(sections,'{considerations}','"Revisado por consultor"'::jsonb),status='finalized' WHERE id=report_id;
  IF NOT EXISTS(SELECT 1 FROM public.consulting_reports WHERE id=report_id AND finalized_at IS NOT NULL AND finalized_by=auth.uid()) THEN RAISE EXCEPTION 'Finalização não registrada'; END IF;
  BEGIN UPDATE public.consulting_reports SET title='alteração indevida' WHERE id=report_id; RAISE EXCEPTION 'Relatório final permitiu edição'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SELECT version_group_id INTO group_id FROM public.consulting_reports WHERE id=report_id;
  version_id:=public.create_consulting_report_version(report_id);
  IF NOT EXISTS(SELECT 1 FROM public.consulting_reports WHERE id=version_id AND version_group_id=group_id AND version_number=2 AND status='draft') THEN RAISE EXCEPTION 'Nova versão não criada'; END IF;
  RAISE NOTICE 'P7_OK report=%,version=%',report_id,version_id;
END $$;
RESET ROLE;
ROLLBACK;
