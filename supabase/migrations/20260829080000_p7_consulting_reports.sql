BEGIN;

CREATE TABLE public.consulting_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE DEFAULT private.current_workspace_id(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_ids uuid[] NOT NULL DEFAULT '{}',
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text NOT NULL DEFAULT 'Relatório de Consultoria',
  version_group_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1 CHECK(version_number>0),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','finalized')),
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  finalized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(period_end>=period_start),
  UNIQUE(workspace_id,version_group_id,version_number)
);
CREATE INDEX consulting_reports_workspace_created_idx ON public.consulting_reports(workspace_id,created_at DESC);
CREATE INDEX consulting_reports_client_period_idx ON public.consulting_reports(client_id,period_end DESC);
CREATE INDEX consulting_reports_version_idx ON public.consulting_reports(version_group_id,version_number DESC);
ALTER TABLE public.consulting_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY consulting_reports_member_select ON public.consulting_reports FOR SELECT TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=2);
CREATE POLICY consulting_reports_manager_insert ON public.consulting_reports FOR INSERT TO authenticated WITH CHECK(COALESCE(private.workspace_access_level(workspace_id),0)>=3 AND created_by=(SELECT auth.uid()));
CREATE POLICY consulting_reports_manager_update ON public.consulting_reports FOR UPDATE TO authenticated USING(COALESCE(private.workspace_access_level(workspace_id),0)>=3) WITH CHECK(COALESCE(private.workspace_access_level(workspace_id),0)>=3);
GRANT SELECT,INSERT,UPDATE ON public.consulting_reports TO authenticated;
REVOKE ALL ON public.consulting_reports FROM anon;

CREATE OR REPLACE FUNCTION private.protect_consulting_report()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.workspace_id:=private.current_workspace_id(); NEW.created_by:=auth.uid(); NEW.updated_by:=auth.uid(); NEW.version_group_id:=COALESCE(NEW.version_group_id,NEW.id); RETURN NEW; END IF;
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.period_start IS DISTINCT FROM OLD.period_start OR NEW.period_end IS DISTINCT FROM OLD.period_end OR NEW.project_ids IS DISTINCT FROM OLD.project_ids OR NEW.version_group_id IS DISTINCT FROM OLD.version_group_id OR NEW.version_number IS DISTINCT FROM OLD.version_number OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'report source and version identity are immutable' USING ERRCODE='42501'; END IF;
  IF OLD.status='finalized' THEN RAISE EXCEPTION 'finalized reports require a new version' USING ERRCODE='42501'; END IF;
  NEW.updated_by:=auth.uid(); NEW.updated_at:=now();
  IF NEW.status='finalized' THEN NEW.finalized_by:=auth.uid(); NEW.finalized_at:=now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_consulting_report BEFORE INSERT OR UPDATE ON public.consulting_reports FOR EACH ROW EXECUTE FUNCTION private.protect_consulting_report();
REVOKE ALL ON FUNCTION private.protect_consulting_report() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.generate_consulting_report(p_client_id uuid,p_period_start date,p_period_end date,p_project_ids uuid[] DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_workspace uuid:=private.current_workspace_id(); v_id uuid:=gen_random_uuid(); v_client text; v_projects uuid[]; v_sections jsonb; v_snapshot jsonb;
BEGIN
  IF COALESCE(private.workspace_access_level(v_workspace),0)<3 THEN RAISE EXCEPTION 'Sem permissão para gerar relatórios'; END IF;
  SELECT COALESCE(NULLIF(trade_name,''),name) INTO v_client FROM public.clients WHERE id=p_client_id AND workspace_id=v_workspace;
  IF v_client IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  SELECT COALESCE(array_agg(id),'{}') INTO v_projects FROM public.projects WHERE client_id=p_client_id AND workspace_id=v_workspace AND (p_project_ids IS NULL OR id=ANY(p_project_ids));
  v_sections:=jsonb_build_object(
    'executive_summary',format('No período de %s a %s foram acompanhados %s projeto(s), %s tarefa(s) concluída(s) e %s reunião(ões).',to_char(p_period_start,'DD/MM/YYYY'),to_char(p_period_end,'DD/MM/YYYY'),cardinality(v_projects),(SELECT count(*) FROM public.tasks WHERE client_id=p_client_id AND status='done' AND COALESCE(completed_at,updated_at)::date BETWEEN p_period_start AND p_period_end),(SELECT count(*) FROM public.meetings WHERE client_id=p_client_id AND date::date BETWEEN p_period_start AND p_period_end)),
    'activities',(SELECT COALESCE(jsonb_agg(jsonb_build_object('date',COALESCE(t.completed_at,t.updated_at),'title',t.title,'project_id',t.project_id) ORDER BY COALESCE(t.completed_at,t.updated_at)),'[]'::jsonb) FROM public.tasks t WHERE t.client_id=p_client_id AND t.status='done' AND COALESCE(t.completed_at,t.updated_at)::date BETWEEN p_period_start AND p_period_end AND (cardinality(v_projects)=0 OR t.project_id=ANY(v_projects))),
    'meetings',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',m.id,'date',m.date,'title',m.title,'notes',COALESCE(m.notes,m.minutes,''),'status',m.status) ORDER BY m.date),'[]'::jsonb) FROM public.meetings m WHERE m.client_id=p_client_id AND m.date::date BETWEEN p_period_start AND p_period_end AND (cardinality(v_projects)=0 OR m.project_id=ANY(v_projects))),
    'diagnostics',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'findings',d.findings,'recommendations',d.recommendations,'score',d.score) ORDER BY d.created_at),'[]'::jsonb) FROM public.diagnostics d WHERE d.client_id=p_client_id AND d.created_at::date<=p_period_end AND (cardinality(v_projects)=0 OR d.project_id=ANY(v_projects))),
    'decisions',(SELECT COALESCE(jsonb_agg(jsonb_build_object('meeting_id',md.meeting_id,'description',md.description,'date',m.date) ORDER BY m.date),'[]'::jsonb) FROM public.meeting_decisions md JOIN public.meetings m ON m.id=md.meeting_id WHERE m.client_id=p_client_id AND m.date::date BETWEEN p_period_start AND p_period_end AND (cardinality(v_projects)=0 OR m.project_id=ANY(v_projects))),
    'improvements',(SELECT COALESCE(jsonb_agg(jsonb_build_object('title',t.title,'completed_at',t.completed_at,'evidence',t.evidence_url)),'[]'::jsonb) FROM public.tasks t WHERE t.client_id=p_client_id AND t.status='done' AND COALESCE(t.completed_at,t.updated_at)::date BETWEEN p_period_start AND p_period_end),
    'completed_tasks',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'completed_at',t.completed_at,'responsible',t.responsible)),'[]'::jsonb) FROM public.tasks t WHERE t.client_id=p_client_id AND t.status='done' AND COALESCE(t.completed_at,t.updated_at)::date BETWEEN p_period_start AND p_period_end),
    'pending_tasks',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'due_date',t.due_date,'status',t.status,'responsible',t.responsible)),'[]'::jsonb) FROM public.tasks t WHERE t.client_id=p_client_id AND t.status<>'done' AND (cardinality(v_projects)=0 OR t.project_id=ANY(v_projects))),
    'risks',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'due_date',t.due_date,'status',t.status,'reason',t.block_reason)),'[]'::jsonb) FROM public.tasks t WHERE t.client_id=p_client_id AND t.status<>'done' AND (t.status='blocked' OR t.due_date<CURRENT_DATE)),
    'next_steps',(SELECT COALESCE(jsonb_agg(jsonb_build_object('description',n.description,'due_date',n.due_date,'responsible',n.responsible_name,'completed_at',n.completed_at) ORDER BY n.due_date),'[]'::jsonb) FROM public.meeting_next_steps n JOIN public.meetings m ON m.id=n.meeting_id WHERE m.client_id=p_client_id AND n.completed_at IS NULL),
    'documents',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',d.id,'name',d.display_name,'category',d.category,'created_at',d.created_at)),'[]'::jsonb) FROM public.documents d WHERE d.client_id=p_client_id AND d.archived_at IS NULL AND d.is_current_version),
    'projects',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'phase',p.phase,'progress',p.progress,'status',p.status)),'[]'::jsonb) FROM public.projects p WHERE p.id=ANY(v_projects)),
    'considerations','Conteúdo gerado como rascunho a partir dos registros do JoIA Ops. Revise todas as seções antes de finalizar.'
  );
  v_snapshot:=jsonb_build_object('generated_at',now(),'client_id',p_client_id,'project_ids',v_projects,'period_start',p_period_start,'period_end',p_period_end);
  INSERT INTO public.consulting_reports(id,workspace_id,client_id,project_ids,period_start,period_end,title,version_group_id,sections,source_snapshot,created_by) VALUES(v_id,v_workspace,p_client_id,v_projects,p_period_start,p_period_end,'Relatório de Consultoria - '||v_client,v_id,v_sections,v_snapshot,auth.uid());
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_consulting_report_version(p_report_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE source public.consulting_reports%ROWTYPE; next_id uuid:=gen_random_uuid(); next_version integer;
BEGIN
  SELECT * INTO source FROM public.consulting_reports WHERE id=p_report_id;
  IF NOT FOUND OR COALESCE(private.workspace_access_level(source.workspace_id),0)<3 THEN RAISE EXCEPTION 'Relatório não encontrado ou sem permissão'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(source.version_group_id::text));
  SELECT COALESCE(max(version_number),0)+1 INTO next_version FROM public.consulting_reports WHERE version_group_id=source.version_group_id;
  INSERT INTO public.consulting_reports(id,workspace_id,client_id,project_ids,period_start,period_end,title,version_group_id,version_number,status,sections,source_snapshot,created_by)
  VALUES(next_id,source.workspace_id,source.client_id,source.project_ids,source.period_start,source.period_end,source.title,source.version_group_id,next_version,'draft',source.sections,source.source_snapshot,auth.uid());
  RETURN next_id;
END $$;
GRANT EXECUTE ON FUNCTION public.generate_consulting_report(uuid,date,date,uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_consulting_report_version(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.generate_consulting_report(uuid,date,date,uuid[]),public.create_consulting_report_version(uuid) FROM PUBLIC,anon;

COMMIT;
