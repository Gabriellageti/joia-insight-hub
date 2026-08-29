BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS service text,
  ADD COLUMN IF NOT EXISTS probability smallint NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS expected_close_date date,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE public.leads SET stage = CASE lower(COALESCE(status, ''))
  WHEN 'new' THEN 'new_lead' WHEN 'novo' THEN 'new_lead' WHEN 'novo lead' THEN 'new_lead'
  WHEN 'contacted' THEN 'first_contact' WHEN 'contatado' THEN 'first_contact' WHEN 'primeiro contato' THEN 'first_contact'
  WHEN 'qualified' THEN 'qualification' WHEN 'qualificação' THEN 'qualification'
  WHEN 'meeting' THEN 'meeting' WHEN 'reunião' THEN 'meeting'
  WHEN 'proposal' THEN 'proposal' WHEN 'proposta' THEN 'proposal'
  WHEN 'negotiation' THEN 'negotiation' WHEN 'negociação' THEN 'negotiation'
  WHEN 'won' THEN 'won' WHEN 'ganho' THEN 'won'
  WHEN 'lost' THEN 'lost' WHEN 'perdido' THEN 'lost'
  ELSE 'new_lead' END;
UPDATE public.leads SET probability = CASE stage
  WHEN 'new_lead' THEN 10 WHEN 'first_contact' THEN 20 WHEN 'qualification' THEN 35
  WHEN 'meeting' THEN 50 WHEN 'proposal' THEN 65 WHEN 'negotiation' THEN 80
  WHEN 'won' THEN 100 WHEN 'lost' THEN 0 ELSE probability END
WHERE probability = 10;
UPDATE public.leads SET responsible_user_id = COALESCE(responsible_user_id, created_by, (SELECT auth.uid()))
WHERE responsible_user_id IS NULL;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_stage_check CHECK (stage IN (
  'new_lead','first_contact','qualification','meeting','proposal','negotiation','won','lost'
));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_probability_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_probability_check CHECK (probability BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS leads_pipeline_idx ON public.leads (workspace_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS leads_responsible_follow_up_idx ON public.leads (responsible_user_id, next_action_date)
  WHERE next_action_date IS NOT NULL AND stage NOT IN ('won','lost');

CREATE TABLE public.commercial_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('call','message','meeting','proposal','stage_change','note','follow_up','conversion')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text,
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commercial_activities_lead_timeline_idx ON public.commercial_activities (lead_id, happened_at DESC);

CREATE TABLE public.commercial_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  value numeric(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  scope text NOT NULL CHECK (char_length(scope) BETWEEN 1 AND 10000),
  proposal_date date NOT NULL DEFAULT current_date,
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','negotiation','accepted','rejected','expired')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until >= proposal_date)
);
CREATE INDEX commercial_proposals_lead_idx ON public.commercial_proposals (lead_id, proposal_date DESC);
CREATE INDEX commercial_proposals_open_idx ON public.commercial_proposals (workspace_id, status, valid_until)
  WHERE status IN ('draft','sent','negotiation');

CREATE TABLE public.commercial_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) DEFAULT private.current_workspace_id(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  responsible_user_id uuid NOT NULL,
  action text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 500),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commercial_follow_ups_owner_agenda_idx ON public.commercial_follow_ups (responsible_user_id, due_at)
  WHERE completed_at IS NULL;
CREATE INDEX commercial_follow_ups_lead_idx ON public.commercial_follow_ups (lead_id, due_at DESC);
CREATE UNIQUE INDEX commercial_follow_ups_one_open_idx ON public.commercial_follow_ups (lead_id)
  WHERE completed_at IS NULL;

ALTER TABLE public.commercial_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY commercial_activities_member_select ON public.commercial_activities FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);
CREATE POLICY commercial_activities_manager_insert ON public.commercial_activities FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 3
  AND EXISTS (SELECT 1 FROM public.leads lead WHERE lead.id = lead_id AND lead.workspace_id = workspace_id));

CREATE POLICY commercial_proposals_member_select ON public.commercial_proposals FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);
CREATE POLICY commercial_proposals_manager_insert ON public.commercial_proposals FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 3
  AND EXISTS (SELECT 1 FROM public.leads lead WHERE lead.id = lead_id AND lead.workspace_id = workspace_id));
CREATE POLICY commercial_proposals_manager_update ON public.commercial_proposals FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3
  AND EXISTS (SELECT 1 FROM public.leads lead WHERE lead.id = lead_id AND lead.workspace_id = workspace_id));
CREATE POLICY commercial_proposals_admin_delete ON public.commercial_proposals FOR DELETE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4);

CREATE POLICY commercial_follow_ups_scoped_select ON public.commercial_follow_ups FOR SELECT TO authenticated
USING (responsible_user_id = (SELECT auth.uid()) OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);
CREATE POLICY commercial_follow_ups_manager_insert ON public.commercial_follow_ups FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 3
  AND private.user_workspace_access_level(responsible_user_id, workspace_id) >= 1
  AND EXISTS (SELECT 1 FROM public.leads lead WHERE lead.id = lead_id AND lead.workspace_id = workspace_id));
CREATE POLICY commercial_follow_ups_scoped_update ON public.commercial_follow_ups FOR UPDATE TO authenticated
USING (responsible_user_id = (SELECT auth.uid()) OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)
WITH CHECK (responsible_user_id = (SELECT auth.uid()) OR COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);
CREATE POLICY commercial_follow_ups_admin_delete ON public.commercial_follow_ups FOR DELETE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4);

DO $$ DECLARE policy record; BEGIN
  FOR policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='leads'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.leads', policy.policyname); END LOOP;
END $$;
CREATE POLICY leads_member_select ON public.leads FOR SELECT TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);
CREATE POLICY leads_manager_insert ON public.leads FOR INSERT TO authenticated
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3 AND created_by = (SELECT auth.uid())
  AND (responsible_user_id IS NULL OR private.user_workspace_access_level(responsible_user_id, workspace_id) >= 1));
CREATE POLICY leads_manager_update ON public.leads FOR UPDATE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3)
WITH CHECK (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3
  AND (responsible_user_id IS NULL OR private.user_workspace_access_level(responsible_user_id, workspace_id) >= 1));
CREATE POLICY leads_admin_delete ON public.leads FOR DELETE TO authenticated
USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 4);

CREATE OR REPLACE FUNCTION private.prepare_commercial_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.won_at := CASE WHEN NEW.stage='won' THEN COALESCE(NEW.won_at,now()) ELSE NEW.won_at END;
    NEW.lost_at := CASE WHEN NEW.stage='lost' THEN COALESCE(NEW.lost_at,now()) ELSE NEW.lost_at END;
  END IF;
  NEW.status := NEW.stage;
  RETURN NEW;
END $$;
CREATE TRIGGER prepare_commercial_lead BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION private.prepare_commercial_lead();

CREATE OR REPLACE FUNCTION private.audit_commercial_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.commercial_activities(workspace_id,lead_id,activity_type,title,description,created_by,metadata)
    VALUES(NEW.workspace_id,NEW.id,'note','Oportunidade criada','Entrada no pipeline comercial',NEW.created_by,
      jsonb_build_object('stage',NEW.stage));
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.commercial_activities(workspace_id,lead_id,activity_type,title,description,created_by,metadata)
    VALUES(NEW.workspace_id,NEW.id,'stage_change','Etapa alterada',OLD.stage||' → '||NEW.stage,(SELECT auth.uid()),
      jsonb_build_object('from',OLD.stage,'to',NEW.stage));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_lead_audit AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION private.audit_commercial_lead();

CREATE OR REPLACE FUNCTION private.audit_commercial_proposal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.commercial_activities(workspace_id,lead_id,activity_type,title,description,created_by,metadata)
  VALUES(NEW.workspace_id,NEW.lead_id,'proposal',
    CASE WHEN TG_OP='INSERT' THEN 'Proposta registrada' ELSE 'Proposta atualizada' END,
    'Status: '||NEW.status,COALESCE((SELECT auth.uid()),NEW.created_by),
    jsonb_build_object('proposal_id',NEW.id,'status',NEW.status,'value',NEW.value));
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_proposal_audit AFTER INSERT OR UPDATE OF status ON public.commercial_proposals
FOR EACH ROW EXECUTE FUNCTION private.audit_commercial_proposal();

CREATE OR REPLACE FUNCTION private.protect_commercial_follow_up()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'commercial follow-up ownership is immutable' USING ERRCODE='42501';
  END IF;
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN NEW.completed_by := (SELECT auth.uid()); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER protect_commercial_follow_up BEFORE UPDATE ON public.commercial_follow_ups
FOR EACH ROW EXECUTE FUNCTION private.protect_commercial_follow_up();

CREATE OR REPLACE FUNCTION public.schedule_commercial_follow_up(p_lead_id uuid,p_action text,p_due_at timestamptz,p_responsible_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_lead public.leads%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id=p_lead_id;
  IF v_lead.id IS NULL OR COALESCE(private.workspace_access_level(v_lead.workspace_id),0)<3 THEN RAISE EXCEPTION 'lead not found or forbidden' USING ERRCODE='42501'; END IF;
  IF NULLIF(btrim(p_action),'') IS NULL OR p_due_at IS NULL THEN RAISE EXCEPTION 'follow-up action and due date are required' USING ERRCODE='22023'; END IF;
  IF private.user_workspace_access_level(p_responsible_user_id,v_lead.workspace_id)<1 THEN RAISE EXCEPTION 'responsible is outside workspace' USING ERRCODE='42501'; END IF;
  SELECT id INTO v_id FROM public.commercial_follow_ups WHERE lead_id=p_lead_id AND completed_at IS NULL FOR UPDATE;
  IF v_id IS NULL THEN
    INSERT INTO public.commercial_follow_ups(workspace_id,lead_id,responsible_user_id,action,due_at,created_by)
    VALUES(v_lead.workspace_id,p_lead_id,p_responsible_user_id,btrim(p_action),p_due_at,(SELECT auth.uid())) RETURNING id INTO v_id;
  ELSE
    UPDATE public.commercial_follow_ups SET responsible_user_id=p_responsible_user_id,action=btrim(p_action),due_at=p_due_at WHERE id=v_id;
  END IF;
  UPDATE public.leads SET next_action=btrim(p_action),next_action_date=p_due_at::date,responsible_user_id=p_responsible_user_id WHERE id=p_lead_id;
  INSERT INTO public.commercial_activities(workspace_id,lead_id,activity_type,title,description,created_by,metadata)
  VALUES(v_lead.workspace_id,p_lead_id,'follow_up','Próximo contato agendado',btrim(p_action),(SELECT auth.uid()),jsonb_build_object('due_at',p_due_at,'responsible_user_id',p_responsible_user_id));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.find_lead_client_duplicates(p_lead_id uuid)
RETURNS TABLE(id uuid,name text,trade_name text,contact_email text,contact_phone text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT c.id,c.name,c.trade_name,c.contact_email,c.contact_phone FROM public.clients c JOIN public.leads l ON l.id=p_lead_id AND l.workspace_id=c.workspace_id
  WHERE lower(regexp_replace(COALESCE(c.trade_name,c.name),'[^a-zA-Z0-9]','','g'))=lower(regexp_replace(COALESCE(l.company,''),'[^a-zA-Z0-9]','','g'))
    OR (NULLIF(l.email,'') IS NOT NULL AND lower(COALESCE(c.contact_email,''))=lower(l.email))
    OR (NULLIF(regexp_replace(COALESCE(l.phone,''),'\D','','g'),'') IS NOT NULL AND regexp_replace(COALESCE(c.contact_phone,''),'\D','','g')=regexp_replace(l.phone,'\D','','g'));
$$;

CREATE OR REPLACE FUNCTION public.convert_lead_to_client(p_lead_id uuid,p_existing_client_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_lead public.leads%ROWTYPE; v_client_id uuid; v_duplicate_count integer;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL OR COALESCE(private.workspace_access_level(v_lead.workspace_id),0)<3 THEN RAISE EXCEPTION 'lead not found or forbidden' USING ERRCODE='42501'; END IF;
  IF v_lead.stage<>'won' THEN RAISE EXCEPTION 'only won opportunities can be converted' USING ERRCODE='22023'; END IF;
  IF v_lead.converted_client_id IS NOT NULL THEN RETURN v_lead.converted_client_id; END IF;
  IF p_existing_client_id IS NOT NULL THEN
    SELECT id INTO v_client_id FROM public.clients WHERE id=p_existing_client_id AND workspace_id=v_lead.workspace_id;
    IF v_client_id IS NULL THEN RAISE EXCEPTION 'existing client is outside workspace' USING ERRCODE='42501'; END IF;
  ELSE
    SELECT count(*) INTO v_duplicate_count FROM public.find_lead_client_duplicates(p_lead_id);
    IF v_duplicate_count>0 THEN RAISE EXCEPTION 'possible duplicate client; review before conversion' USING ERRCODE='P0001'; END IF;
    INSERT INTO public.clients(workspace_id,name,trade_name,contact_name,contact_email,contact_phone,status)
    VALUES(v_lead.workspace_id,COALESCE(NULLIF(v_lead.company,''),v_lead.name),NULLIF(v_lead.company,''),v_lead.name,v_lead.email,v_lead.phone,'ativo') RETURNING id INTO v_client_id;
  END IF;
  UPDATE public.leads SET converted_client_id=v_client_id WHERE id=p_lead_id;
  INSERT INTO public.commercial_activities(workspace_id,lead_id,activity_type,title,description,created_by,metadata)
  VALUES(v_lead.workspace_id,p_lead_id,'conversion','Oportunidade convertida em cliente','Conversão confirmada pelo usuário',(SELECT auth.uid()),jsonb_build_object('client_id',v_client_id));
  RETURN v_client_id;
END $$;

GRANT SELECT,INSERT,UPDATE,DELETE ON public.leads TO authenticated;
GRANT SELECT,INSERT ON public.commercial_activities TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.commercial_proposals,public.commercial_follow_ups TO authenticated;
REVOKE ALL ON public.commercial_activities,public.commercial_proposals,public.commercial_follow_ups FROM anon;
REVOKE ALL ON FUNCTION public.schedule_commercial_follow_up(uuid,text,timestamptz,uuid),public.find_lead_client_duplicates(uuid),public.convert_lead_to_client(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.schedule_commercial_follow_up(uuid,text,timestamptz,uuid),public.find_lead_client_duplicates(uuid),public.convert_lead_to_client(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.prepare_commercial_lead(),private.audit_commercial_lead(),private.audit_commercial_proposal(),private.protect_commercial_follow_up() FROM PUBLIC,anon,authenticated;

COMMIT;
