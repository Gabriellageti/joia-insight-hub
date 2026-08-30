-- P5 — Modelos de projetos, tarefas e processos internos
BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_task_template_id uuid;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS source_template_id uuid,
  ADD COLUMN IF NOT EXISTS template_snapshot jsonb;

CREATE TABLE public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  project_type text NOT NULL DEFAULT 'consulting',
  default_phase text NOT NULL DEFAULT 'Diagnóstico',
  default_objective text NOT NULL DEFAULT '',
  default_scope text NOT NULL DEFAULT '',
  is_internal_process boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE public.project_template_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (template_id, position)
);

CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_template_id uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.project_template_stages(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  task_category text NOT NULL DEFAULT 'processo',
  default_assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  default_priority text NOT NULL DEFAULT 'medium' CHECK (default_priority IN ('low','medium','high','urgent')),
  start_offset_days integer NOT NULL DEFAULT 0,
  due_offset_days integer NOT NULL DEFAULT 0,
  initial_status text NOT NULL DEFAULT 'not_started' CHECK (initial_status IN ('not_started','in_progress','waiting','blocked','done')),
  evidence_required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_offset_days >= start_offset_days)
);

CREATE TABLE public.task_template_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (btrim(text) <> ''),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (task_template_id, position)
);

CREATE TABLE public.project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_template_stage_id uuid REFERENCES public.project_template_stages(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (project_id, position)
);

CREATE TABLE public.project_template_documents (
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (template_id, document_id)
);

CREATE TABLE public.project_document_links (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, document_id)
);

CREATE TABLE public.project_template_instantiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.project_templates(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

ALTER TABLE public.projects
  ADD CONSTRAINT projects_source_template_id_fkey FOREIGN KEY (source_template_id) REFERENCES public.project_templates(id) ON DELETE SET NULL;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_source_task_template_id_fkey FOREIGN KEY (source_task_template_id) REFERENCES public.task_templates(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX tasks_project_source_template_unique ON public.tasks(project_id, source_task_template_id) WHERE source_task_template_id IS NOT NULL;
CREATE INDEX project_templates_workspace_status_idx ON public.project_templates(workspace_id, status, updated_at DESC);
CREATE INDEX project_template_stages_template_idx ON public.project_template_stages(template_id, position);
CREATE INDEX task_templates_project_template_idx ON public.task_templates(project_template_id, position);
CREATE INDEX task_templates_workspace_idx ON public.task_templates(workspace_id, updated_at DESC);
CREATE INDEX task_template_items_task_idx ON public.task_template_checklist_items(task_template_id, position);
CREATE INDEX project_stages_project_idx ON public.project_stages(project_id, position);
CREATE INDEX project_document_links_workspace_project_idx ON public.project_document_links(workspace_id, project_id);
CREATE INDEX project_document_links_document_idx ON public.project_document_links(document_id);
CREATE INDEX project_template_instantiations_workspace_idx ON public.project_template_instantiations(workspace_id, created_at DESC);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_instantiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_templates_read ON public.project_templates FOR SELECT TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id),0) >= 2);
CREATE POLICY project_templates_write ON public.project_templates FOR ALL TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id),0) >= 3) WITH CHECK (COALESCE(private.workspace_access_level(workspace_id),0) >= 3);
CREATE POLICY project_template_stages_read ON public.project_template_stages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.project_templates t WHERE t.id=template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=2));
CREATE POLICY project_template_stages_write ON public.project_template_stages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.project_templates t WHERE t.id=template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=3)) WITH CHECK (EXISTS (SELECT 1 FROM public.project_templates t WHERE t.id=template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=3));
CREATE POLICY task_templates_read ON public.task_templates FOR SELECT TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id),0)>=2);
CREATE POLICY task_templates_write ON public.task_templates FOR ALL TO authenticated USING (COALESCE(private.workspace_access_level(workspace_id),0)>=3) WITH CHECK (COALESCE(private.workspace_access_level(workspace_id),0)>=3);
CREATE POLICY task_template_items_read ON public.task_template_checklist_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.task_templates t WHERE t.id=task_template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=2));
CREATE POLICY task_template_items_write ON public.task_template_checklist_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.task_templates t WHERE t.id=task_template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=3)) WITH CHECK (EXISTS (SELECT 1 FROM public.task_templates t WHERE t.id=task_template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=3));
CREATE POLICY project_stages_read ON public.project_stages FOR SELECT TO authenticated USING (private.user_project_access_level((SELECT auth.uid()),project_id)>=1);
CREATE POLICY project_stages_write ON public.project_stages FOR ALL TO authenticated USING (private.user_project_access_level((SELECT auth.uid()),project_id)>=2) WITH CHECK (private.user_project_access_level((SELECT auth.uid()),project_id)>=2);
CREATE POLICY project_template_documents_read ON public.project_template_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.project_templates t WHERE t.id=template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=2));
CREATE POLICY project_template_documents_write ON public.project_template_documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.project_templates t WHERE t.id=template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=3)) WITH CHECK (EXISTS (SELECT 1 FROM public.project_templates t WHERE t.id=template_id AND COALESCE(private.workspace_access_level(t.workspace_id),0)>=3));
CREATE POLICY project_document_links_read ON public.project_document_links FOR SELECT TO authenticated USING (private.user_project_access_level((SELECT auth.uid()),project_id)>=1);
CREATE POLICY project_document_links_write ON public.project_document_links FOR ALL TO authenticated USING (private.user_project_access_level((SELECT auth.uid()),project_id)>=2) WITH CHECK (private.user_project_access_level((SELECT auth.uid()),project_id)>=2);
CREATE POLICY project_template_instantiations_read ON public.project_template_instantiations FOR SELECT TO authenticated USING (private.user_project_access_level((SELECT auth.uid()),project_id)>=1);
CREATE POLICY project_template_instantiations_insert ON public.project_template_instantiations FOR INSERT TO authenticated WITH CHECK (private.user_project_access_level((SELECT auth.uid()),project_id)>=2 AND created_by=(SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_templates, public.project_template_stages, public.task_templates, public.task_template_checklist_items, public.project_stages, public.project_template_documents, public.project_document_links TO authenticated;
GRANT SELECT, INSERT ON public.project_template_instantiations TO authenticated;
REVOKE ALL ON public.project_templates, public.project_template_stages, public.task_templates, public.task_template_checklist_items, public.project_stages, public.project_template_documents, public.project_document_links, public.project_template_instantiations FROM anon;

CREATE OR REPLACE FUNCTION public.apply_project_template(p_template_id uuid, p_project_id uuid, p_start_date date DEFAULT current_date, p_fallback_assignee uuid DEFAULT auth.uid())
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_template public.project_templates%ROWTYPE; v_project public.projects%ROWTYPE; v_count integer;
BEGIN
  SELECT * INTO v_template FROM public.project_templates WHERE id=p_template_id AND status='published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo publicado não encontrado'; END IF;
  SELECT * INTO v_project FROM public.projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND OR v_project.workspace_id<>v_template.workspace_id THEN RAISE EXCEPTION 'Projeto incompatível com o modelo'; END IF;
  IF private.user_project_access_level((SELECT auth.uid()),p_project_id)<2 THEN RAISE EXCEPTION 'Sem permissão para aplicar o modelo'; END IF;

  INSERT INTO public.project_stages(workspace_id,project_id,source_template_stage_id,title,description,position)
  SELECT v_project.workspace_id,p_project_id,s.id,s.title,s.description,s.position FROM public.project_template_stages s WHERE s.template_id=p_template_id
  ON CONFLICT(project_id,position) DO NOTHING;

  INSERT INTO public.tasks(title,description,project_id,client_id,type,responsible,priority,due_date,status,evidence_required,task_type,assigned_to,created_by,start_date,workspace_id,checklist,source_task_template_id)
  SELECT tt.title,tt.description,p_project_id,v_project.client_id,tt.task_category,COALESCE(pr.full_name, au.email, 'Responsável'),tt.default_priority,
    COALESCE(p_start_date,current_date)+tt.due_offset_days,tt.initial_status,tt.evidence_required,'project',COALESCE(tt.default_assignee_id,p_fallback_assignee,(SELECT auth.uid())),(SELECT auth.uid()),
    COALESCE(p_start_date,current_date)+tt.start_offset_days,v_project.workspace_id,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ci.id::text,'text',ci.text,'completed',false) ORDER BY ci.position) FROM public.task_template_checklist_items ci WHERE ci.task_template_id=tt.id),'[]'::jsonb),tt.id
  FROM public.task_templates tt
  LEFT JOIN auth.users au ON au.id=COALESCE(tt.default_assignee_id,p_fallback_assignee,(SELECT auth.uid()))
  LEFT JOIN public.profiles pr ON pr.id=au.id
  WHERE tt.project_template_id=p_template_id
    AND private.user_project_access_level(COALESCE(tt.default_assignee_id,p_fallback_assignee,(SELECT auth.uid())),p_project_id)>=1
  ON CONFLICT(project_id,source_task_template_id) WHERE source_task_template_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_count=ROW_COUNT;

  INSERT INTO public.project_document_links(project_id,document_id,workspace_id)
  SELECT p_project_id,d.document_id,v_project.workspace_id FROM public.project_template_documents d WHERE d.template_id=p_template_id ON CONFLICT DO NOTHING;

  UPDATE public.projects SET source_template_id=p_template_id, template_snapshot=jsonb_build_object('id',v_template.id,'name',v_template.name,'versioned_at',now()), updated_at=now() WHERE id=p_project_id;
  INSERT INTO public.project_template_instantiations(workspace_id,template_id,project_id,template_snapshot,created_by)
  VALUES(v_project.workspace_id,p_template_id,p_project_id,jsonb_build_object('id',v_template.id,'name',v_template.name,'applied_at',now()),(SELECT auth.uid())) ON CONFLICT(project_id) DO NOTHING;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.apply_project_template(uuid,uuid,date,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.apply_project_template(uuid,uuid,date,uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.duplicate_project(p_source_project_id uuid,p_name text,p_client_id uuid,p_start_date date,p_copy_tasks boolean DEFAULT true,p_copy_stages boolean DEFAULT true,p_copy_documents boolean DEFAULT true,p_copy_assignees boolean DEFAULT true,p_copy_settings boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE src public.projects%ROWTYPE; target_id uuid:=gen_random_uuid(); delta integer;
BEGIN
  SELECT * INTO src FROM public.projects WHERE id=p_source_project_id;
  IF NOT FOUND OR private.user_project_access_level((SELECT auth.uid()),p_source_project_id)<2 THEN RAISE EXCEPTION 'Projeto de origem não encontrado ou sem permissão'; END IF;
  delta:=COALESCE(p_start_date,src.start_date,current_date)-COALESCE(src.start_date,current_date);
  INSERT INTO public.projects(id,name,client_id,objective,scope,phase,status,responsible,progress,start_date,end_date,money_hypothesis,project_type,workspace_id,source_template_id,template_snapshot)
  VALUES(target_id,btrim(p_name),COALESCE(p_client_id,src.client_id),CASE WHEN p_copy_settings THEN src.objective ELSE '' END,CASE WHEN p_copy_settings THEN src.scope ELSE '' END,CASE WHEN p_copy_settings THEN src.phase ELSE 'Diagnóstico' END,'Em andamento',src.responsible,0,COALESCE(p_start_date,current_date),CASE WHEN p_copy_settings AND src.end_date IS NOT NULL THEN src.end_date+delta ELSE NULL END,0,CASE WHEN p_copy_settings THEN src.project_type ELSE 'consulting' END,src.workspace_id,CASE WHEN p_copy_settings THEN src.source_template_id ELSE NULL END,CASE WHEN p_copy_settings THEN src.template_snapshot ELSE NULL END);
  IF p_copy_assignees THEN INSERT INTO public.project_members(project_id,user_id,access_level,created_by) SELECT target_id,user_id,access_level,(SELECT auth.uid()) FROM public.project_members WHERE project_id=p_source_project_id AND user_id<>(SELECT auth.uid()) ON CONFLICT DO NOTHING; END IF;
  IF p_copy_stages THEN INSERT INTO public.project_stages(workspace_id,project_id,source_template_stage_id,title,description,position) SELECT src.workspace_id,target_id,source_template_stage_id,title,description,position FROM public.project_stages WHERE project_id=p_source_project_id; END IF;
  IF p_copy_tasks THEN INSERT INTO public.tasks(title,description,project_id,client_id,type,responsible,priority,due_date,status,what,why,where_location,who,when_date,how,how_much,evidence_required,task_type,assigned_to,created_by,start_date,workspace_id,checklist)
    SELECT title,description,target_id,COALESCE(p_client_id,src.client_id),type,responsible,priority,CASE WHEN due_date IS NULL THEN NULL ELSE due_date+delta END,'not_started',what,why,where_location,who,when_date,how,how_much,evidence_required,'project',CASE WHEN p_copy_assignees THEN assigned_to ELSE (SELECT auth.uid()) END,(SELECT auth.uid()),CASE WHEN start_date IS NULL THEN NULL ELSE start_date+delta END,src.workspace_id,checklist FROM public.tasks WHERE project_id=p_source_project_id AND (NOT p_copy_assignees OR private.user_project_access_level(assigned_to,target_id)>=1); END IF;
  IF p_copy_documents THEN
    INSERT INTO public.project_document_links(project_id,document_id,workspace_id) SELECT target_id,id,src.workspace_id FROM public.documents WHERE project_id=p_source_project_id ON CONFLICT DO NOTHING;
    INSERT INTO public.project_document_links(project_id,document_id,workspace_id) SELECT target_id,document_id,src.workspace_id FROM public.project_document_links WHERE project_id=p_source_project_id ON CONFLICT DO NOTHING;
  END IF;
  RETURN target_id;
END $$;

GRANT EXECUTE ON FUNCTION public.duplicate_project(uuid,text,uuid,date,boolean,boolean,boolean,boolean,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.duplicate_project(uuid,text,uuid,date,boolean,boolean,boolean,boolean,boolean) FROM anon;

-- Default published template requested by P5, one independent copy per workspace.
WITH inserted AS (
  INSERT INTO public.project_templates(workspace_id,name,description,project_type,default_phase,default_objective,default_scope,status,created_by)
  SELECT id,'Consultoria Empresarial','Estrutura padrão de diagnóstico, plano e acompanhamento.','consulting','Diagnóstico','Mapear oportunidades e executar melhorias prioritárias.','Diagnóstico, plano de ação, execução e acompanhamento.','published',NULL FROM public.workspaces
  ON CONFLICT(workspace_id,name) DO UPDATE SET status='published' RETURNING id,workspace_id
), stages AS (
  INSERT INTO public.project_template_stages(template_id,title,description,position)
  SELECT id,title,description,position FROM inserted CROSS JOIN (VALUES ('Diagnóstico','Levantamento e entendimento do cenário.',0),('Plano de Ação','Priorização e desenho das ações.',1),('Implementação','Execução e acompanhamento.',2)) s(title,description,position) RETURNING id,template_id,title,position
), tasks_seed AS (
  INSERT INTO public.task_templates(workspace_id,project_template_id,stage_id,title,description,default_priority,start_offset_days,due_offset_days,position)
  SELECT i.workspace_id,i.id,s.id,v.title,v.description,v.priority,v.start_day,v.due_day,v.position FROM inserted i JOIN stages s ON s.template_id=i.id JOIN (VALUES
    ('Diagnóstico',0,'Reunião de abertura','Alinhar objetivos, escopo e responsáveis.','high',0,0,0),
    ('Diagnóstico',0,'Coletar dados do negócio','Reunir dados operacionais e financeiros essenciais.','high',0,3,1),
    ('Plano de Ação',1,'Validar diagnóstico','Confirmar achados e prioridades com o cliente.','high',3,7,2),
    ('Implementação',2,'Revisar plano e próximos passos','Consolidar avanços, bloqueios e decisões.','medium',7,15,3)
  ) v(stage_title,stage_position,title,description,priority,start_day,due_day,position) ON s.position=v.stage_position RETURNING id,title
)
INSERT INTO public.task_template_checklist_items(task_template_id,text,position)
SELECT id,item,position FROM tasks_seed CROSS JOIN LATERAL (VALUES ('Confirmar responsável',0),('Registrar evidências',1)) c(item,position);

COMMIT;
