BEGIN;
SET LOCAL request.jwt.claims='{"sub":"2320b1be-f999-4a1a-b1d4-79458041d13d","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_lead_id uuid;
  v_proposal_id uuid;
  v_follow_up_id uuid;
  client_id uuid := '404daaf7-fb34-4f16-9397-4f4a47e2f2f4';
  client_name text;
  converted_id uuid;
BEGIN
  SELECT COALESCE(trade_name,name) INTO client_name FROM public.clients WHERE id=client_id;
  INSERT INTO public.leads(workspace_id,name,company,email,source,service,value,probability,stage,responsible_user_id,created_by)
  VALUES(private.current_workspace_id(),'Contato P9',client_name,'p9-runtime@example.invalid','Teste','Consultoria',12500,80,'negotiation',auth.uid(),auth.uid())
  RETURNING id INTO v_lead_id;

  IF NOT EXISTS(SELECT 1 FROM public.commercial_activities activity WHERE activity.lead_id=v_lead_id AND activity.activity_type='note') THEN
    RAISE EXCEPTION 'Criação não gerou histórico comercial';
  END IF;

  UPDATE public.leads SET stage='won',probability=100 WHERE id=v_lead_id;
  IF NOT EXISTS(SELECT 1 FROM public.commercial_activities activity WHERE activity.lead_id=v_lead_id AND activity.activity_type='stage_change') THEN
    RAISE EXCEPTION 'Mudança de etapa não foi auditada';
  END IF;

  INSERT INTO public.commercial_proposals(workspace_id,lead_id,value,scope,status,created_by)
  VALUES(private.current_workspace_id(),v_lead_id,12500,'Escopo de validação P9','accepted',auth.uid()) RETURNING id INTO v_proposal_id;
  IF NOT EXISTS(SELECT 1 FROM public.commercial_activities activity WHERE activity.lead_id=v_lead_id AND activity.metadata->>'proposal_id'=v_proposal_id::text) THEN
    RAISE EXCEPTION 'Proposta não entrou no histórico';
  END IF;

  v_follow_up_id:=public.schedule_commercial_follow_up(v_lead_id,'Confirmar kickoff',now()+interval '1 day',auth.uid());
  PERFORM public.schedule_commercial_follow_up(v_lead_id,'Confirmar kickoff atualizado',now()+interval '2 days',auth.uid());
  IF (SELECT count(*) FROM public.commercial_follow_ups follow_up WHERE follow_up.lead_id=v_lead_id AND follow_up.completed_at IS NULL)<>1 THEN
    RAISE EXCEPTION 'Follow-up não foi idempotente';
  END IF;
  UPDATE public.commercial_follow_ups SET completed_at=now() WHERE id=v_follow_up_id;
  IF NOT EXISTS(SELECT 1 FROM public.commercial_follow_ups follow_up WHERE follow_up.id=v_follow_up_id AND follow_up.completed_by=auth.uid()) THEN
    RAISE EXCEPTION 'Conclusão do follow-up não foi auditada';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.find_lead_client_duplicates(v_lead_id) duplicate WHERE duplicate.id=client_id) THEN
    RAISE EXCEPTION 'Cliente duplicado não foi detectado';
  END IF;
  converted_id:=public.convert_lead_to_client(v_lead_id,client_id);
  IF converted_id<>client_id OR NOT EXISTS(SELECT 1 FROM public.leads lead WHERE lead.id=v_lead_id AND lead.converted_client_id=client_id) THEN
    RAISE EXCEPTION 'Conversão explícita não vinculou o cliente';
  END IF;
  RAISE NOTICE 'P9_OK lead=%,proposal=%,follow_up=%,client=%',v_lead_id,v_proposal_id,v_follow_up_id,converted_id;
END $$;
RESET ROLE;
ROLLBACK;
