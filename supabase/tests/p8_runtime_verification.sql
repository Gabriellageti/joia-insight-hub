BEGIN;
SET LOCAL request.jwt.claims='{"sub":"2320b1be-f999-4a1a-b1d4-79458041d13d","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $$
DECLARE interaction_id uuid; context jsonb;
BEGIN
  interaction_id := public.begin_ai_interaction('Resuma este cliente com segurança', jsonb_build_object('client_id','404daaf7-fb34-4f16-9397-4f4a47e2f2f4'));
  IF NOT EXISTS (SELECT 1 FROM public.ai_interactions WHERE id=interaction_id AND user_id=auth.uid() AND status='pending') THEN RAISE EXCEPTION 'Interação pendente não foi persistida'; END IF;
  context := public.get_ai_context('Resuma este cliente','404daaf7-fb34-4f16-9397-4f4a47e2f2f4',NULL,NULL);
  IF context->'client'->>'id' <> '404daaf7-fb34-4f16-9397-4f4a47e2f2f4' OR jsonb_typeof(context->'tasks') <> 'array' OR jsonb_typeof(context->'meetings') <> 'array' THEN RAISE EXCEPTION 'Contexto autorizado incompleto'; END IF;
  IF context::text LIKE '%storage_path%' OR context::text LIKE '%contact_email%' THEN RAISE EXCEPTION 'Contexto expôs campo não necessário'; END IF;
  PERFORM public.complete_ai_interaction(interaction_id,'success','Resposta rastreável','[{"id":"client:404daaf7-fb34-4f16-9397-4f4a47e2f2f4","label":"Cliente","url":"/clientes/404daaf7-fb34-4f16-9397-4f4a47e2f2f4"}]','[]','test/model','ai',10,5,NULL);
  IF NOT EXISTS (SELECT 1 FROM public.ai_interactions WHERE id=interaction_id AND status='success' AND input_tokens=10 AND completed_at IS NOT NULL) THEN RAISE EXCEPTION 'Conclusão não auditada'; END IF;
  BEGIN
    PERFORM public.complete_ai_interaction(interaction_id,'success','Mutação indevida','[]','[]','test/model','ai',1,1,NULL);
    RAISE EXCEPTION 'Interação concluída permitiu segunda conclusão';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.ai_interactions(workspace_id,user_id,question) VALUES(private.current_workspace_id(),auth.uid(),'Inserção direta indevida');
    RAISE EXCEPTION 'Tabela permitiu inserção direta';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'P8_OK interaction=%', interaction_id;
END $$;
RESET ROLE;
ROLLBACK;
