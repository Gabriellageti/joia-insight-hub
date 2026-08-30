BEGIN;

CREATE TABLE public.commercial_pipeline_stages (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE DEFAULT private.current_workspace_id(),
  key text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{1,49}$'),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 100),
  default_probability smallint NOT NULL CHECK (default_probability BETWEEN 0 AND 100),
  is_terminal boolean NOT NULL DEFAULT false,
  terminal_result text CHECK (terminal_result IS NULL OR terminal_result IN ('won','lost')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,key),
  UNIQUE (workspace_id,position),
  CHECK ((is_terminal AND terminal_result IS NOT NULL) OR (NOT is_terminal AND terminal_result IS NULL))
);

INSERT INTO public.commercial_pipeline_stages(workspace_id,key,label,position,default_probability,is_terminal,terminal_result)
SELECT workspace.id, stage.key, stage.label, stage.position, stage.probability, stage.terminal, stage.result
FROM public.workspaces workspace CROSS JOIN (VALUES
  ('new_lead','Novo Lead',1,10,false,NULL::text),
  ('first_contact','Primeiro Contato',2,20,false,NULL::text),
  ('qualification','Qualificação',3,35,false,NULL::text),
  ('meeting','Reunião',4,50,false,NULL::text),
  ('proposal','Proposta',5,65,false,NULL::text),
  ('negotiation','Negociação',6,80,false,NULL::text),
  ('won','Ganho',7,100,true,'won'),
  ('lost','Perdido',8,0,true,'lost')
) AS stage(key,label,position,probability,terminal,result)
ON CONFLICT (workspace_id,key) DO NOTHING;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_workspace_stage_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_workspace_stage_fkey
  FOREIGN KEY (workspace_id,stage) REFERENCES public.commercial_pipeline_stages(workspace_id,key);

ALTER TABLE public.commercial_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY commercial_pipeline_stages_member_select ON public.commercial_pipeline_stages FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id),0)>=2);
CREATE POLICY commercial_pipeline_stages_manager_insert ON public.commercial_pipeline_stages FOR INSERT TO authenticated
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id),0)>=3);
CREATE POLICY commercial_pipeline_stages_manager_update ON public.commercial_pipeline_stages FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id),0)>=3)
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id),0)>=3);
CREATE POLICY commercial_pipeline_stages_admin_delete ON public.commercial_pipeline_stages FOR DELETE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id),0)>=4);

GRANT SELECT,INSERT,UPDATE,DELETE ON public.commercial_pipeline_stages TO authenticated;
REVOKE ALL ON public.commercial_pipeline_stages FROM anon;

COMMIT;
