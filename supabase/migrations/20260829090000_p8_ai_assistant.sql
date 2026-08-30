BEGIN;

CREATE TABLE public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 2000),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scope) = 'object'),
  answer text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(citations) = 'array'),
  suggested_tasks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(suggested_tasks) = 'array'),
  model text,
  mode text NOT NULL DEFAULT 'ai' CHECK (mode IN ('ai', 'fallback')),
  input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX ai_interactions_user_created_idx ON public.ai_interactions(user_id, created_at DESC);
CREATE INDEX ai_interactions_workspace_created_idx ON public.ai_interactions(workspace_id, created_at DESC);
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_interactions_owner_select ON public.ai_interactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);
GRANT SELECT ON public.ai_interactions TO authenticated;
REVOKE ALL ON public.ai_interactions FROM anon;

CREATE OR REPLACE FUNCTION public.begin_ai_interaction(p_question text, p_scope jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_workspace uuid := private.current_workspace_id();
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_user IS NULL OR v_workspace IS NULL OR COALESCE(private.workspace_access_level(v_workspace), 0) < 2 THEN
    RAISE EXCEPTION 'Sem acesso ao assistente' USING ERRCODE = '42501';
  END IF;
  IF char_length(trim(COALESCE(p_question, ''))) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION 'Pergunta inválida' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_scope, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Escopo inválido' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.ai_interactions WHERE user_id = v_user AND created_at > now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'Limite temporário do assistente atingido' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.ai_interactions(id, workspace_id, user_id, question, scope)
  VALUES (v_id, v_workspace, v_user, trim(p_question), COALESCE(p_scope, '{}'::jsonb));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.complete_ai_interaction(
  p_interaction_id uuid,
  p_status text,
  p_answer text DEFAULT NULL,
  p_citations jsonb DEFAULT '[]'::jsonb,
  p_suggested_tasks jsonb DEFAULT '[]'::jsonb,
  p_model text DEFAULT NULL,
  p_mode text DEFAULT 'ai',
  p_input_tokens integer DEFAULT NULL,
  p_output_tokens integer DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_status NOT IN ('success', 'error') OR p_mode NOT IN ('ai', 'fallback') THEN
    RAISE EXCEPTION 'Estado inválido' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_citations, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(p_citations, '[]'::jsonb)) > 30
     OR jsonb_typeof(COALESCE(p_suggested_tasks, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(p_suggested_tasks, '[]'::jsonb)) > 5 THEN
    RAISE EXCEPTION 'Resultado inválido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.ai_interactions
  SET status = p_status,
      answer = left(p_answer, 50000),
      citations = COALESCE(p_citations, '[]'::jsonb),
      suggested_tasks = COALESCE(p_suggested_tasks, '[]'::jsonb),
      model = left(p_model, 100), mode = p_mode,
      input_tokens = p_input_tokens, output_tokens = p_output_tokens,
      error_message = left(p_error_message, 1000), completed_at = now()
  WHERE id = p_interaction_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Interação não encontrada' USING ERRCODE = '42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_ai_context(
  p_question text,
  p_client_id uuid DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL,
  p_report_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_workspace uuid := private.current_workspace_id();
  v_user uuid := auth.uid();
  v_client_id uuid := p_client_id;
  v_client jsonb;
  v_meeting jsonb;
  v_report jsonb;
  v_projects jsonb;
  v_tasks jsonb;
  v_meetings jsonb;
  v_decisions jsonb;
  v_next_steps jsonb;
  v_diagnostics jsonb;
  v_documents jsonb;
  v_team jsonb;
BEGIN
  IF v_user IS NULL OR v_workspace IS NULL OR COALESCE(private.workspace_access_level(v_workspace), 0) < 2 THEN
    RAISE EXCEPTION 'Sem acesso ao assistente' USING ERRCODE = '42501';
  END IF;

  IF p_meeting_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', m.id, 'title', m.title, 'date', m.date, 'status', m.status,
      'agenda', m.agenda, 'notes', COALESCE(m.notes, m.minutes), 'client_id', m.client_id, 'project_id', m.project_id,
      'source_id', 'meeting:' || m.id, 'source_label', 'Reunião: ' || m.title, 'source_url', '/reunioes/' || m.id), m.client_id
    INTO v_meeting, v_client_id FROM public.meetings m WHERE m.id = p_meeting_id AND m.workspace_id = v_workspace;
    IF v_meeting IS NULL THEN RAISE EXCEPTION 'Reunião não encontrada' USING ERRCODE = '42501'; END IF;
  END IF;

  IF p_report_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', r.id, 'title', r.title, 'status', r.status, 'period_start', r.period_start,
      'period_end', r.period_end, 'version', r.version_number, 'sections', r.sections,
      'source_id', 'report:' || r.id, 'source_label', 'Relatório: ' || r.title,
      'source_url', '/relatorios/consultoria/' || r.id), r.client_id
    INTO v_report, v_client_id FROM public.consulting_reports r WHERE r.id = p_report_id AND r.workspace_id = v_workspace;
    IF v_report IS NULL THEN RAISE EXCEPTION 'Relatório não encontrado' USING ERRCODE = '42501'; END IF;
  END IF;

  IF v_client_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', c.id, 'name', COALESCE(NULLIF(c.trade_name, ''), c.name), 'status', c.status,
      'segment', c.segment, 'updated_at', c.updated_at, 'source_id', 'client:' || c.id,
      'source_label', 'Cliente: ' || COALESCE(NULLIF(c.trade_name, ''), c.name), 'source_url', '/clientes/' || c.id)
    INTO v_client FROM public.clients c WHERE c.id = v_client_id AND c.workspace_id = v_workspace;
    IF v_client IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado' USING ERRCODE = '42501'; END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'name'), '[]'::jsonb) INTO v_projects FROM (
    SELECT jsonb_build_object('id', p.id, 'name', p.name, 'status', p.status, 'phase', p.phase, 'progress', p.progress,
      'objective', p.objective, 'end_date', p.end_date, 'client_id', p.client_id,
      'source_id', 'project:' || p.id, 'source_label', 'Projeto: ' || p.name, 'source_url', '/projetos/' || p.id) item
    FROM public.projects p WHERE p.workspace_id = v_workspace AND (v_client_id IS NULL OR p.client_id = v_client_id)
    ORDER BY p.updated_at DESC LIMIT 30
  ) q;

  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'due_date' NULLS LAST), '[]'::jsonb) INTO v_tasks FROM (
    SELECT jsonb_build_object('id', t.id, 'title', t.title, 'description', t.description, 'status', t.status,
      'priority', t.priority, 'due_date', t.due_date, 'completed_at', t.completed_at, 'responsible', t.responsible,
      'assigned_to', t.assigned_to, 'client_id', t.client_id, 'project_id', t.project_id,
      'blocked_reason', t.block_reason, 'source_id', 'task:' || t.id, 'source_label', 'Tarefa: ' || t.title,
      'source_url', '/plano-acao?taskId=' || t.id) item
    FROM public.tasks t WHERE t.workspace_id = v_workspace
      AND (v_client_id IS NULL OR t.client_id = v_client_id)
      AND (p_meeting_id IS NULL OR t.source_meeting_id = p_meeting_id)
    ORDER BY (t.status <> 'done' AND t.due_date < CURRENT_DATE) DESC,
      (t.assigned_to = v_user) DESC, (t.status = 'blocked') DESC, t.due_date NULLS LAST, t.updated_at DESC LIMIT 80
  ) q;

  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'date' DESC), '[]'::jsonb) INTO v_meetings FROM (
    SELECT jsonb_build_object('id', m.id, 'title', m.title, 'date', m.date, 'status', m.status, 'agenda', m.agenda,
      'notes', COALESCE(m.notes, m.minutes), 'client_id', m.client_id, 'project_id', m.project_id,
      'source_id', 'meeting:' || m.id, 'source_label', 'Reunião: ' || m.title, 'source_url', '/reunioes/' || m.id) item
    FROM public.meetings m WHERE m.workspace_id = v_workspace AND (v_client_id IS NULL OR m.client_id = v_client_id)
      AND (p_meeting_id IS NULL OR m.id = p_meeting_id)
    ORDER BY m.date DESC LIMIT 30
  ) q;

  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'created_at' DESC), '[]'::jsonb) INTO v_decisions FROM (
    SELECT jsonb_build_object('id', d.id, 'description', d.description, 'meeting_id', d.meeting_id,
      'created_at', d.created_at, 'source_id', 'meeting:' || m.id,
      'source_label', 'Decisão em: ' || m.title, 'source_url', '/reunioes/' || m.id) item
    FROM public.meeting_decisions d JOIN public.meetings m ON m.id = d.meeting_id
    WHERE m.workspace_id = v_workspace AND (v_client_id IS NULL OR m.client_id = v_client_id)
      AND (p_meeting_id IS NULL OR m.id = p_meeting_id)
    ORDER BY d.created_at DESC LIMIT 50
  ) q;

  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'due_date' NULLS LAST), '[]'::jsonb) INTO v_next_steps FROM (
    SELECT jsonb_build_object('id', n.id, 'description', n.description, 'due_date', n.due_date,
      'responsible', n.responsible_name, 'completed_at', n.completed_at, 'meeting_id', n.meeting_id,
      'source_id', 'meeting:' || m.id, 'source_label', 'Próximo passo em: ' || m.title,
      'source_url', '/reunioes/' || m.id) item
    FROM public.meeting_next_steps n JOIN public.meetings m ON m.id = n.meeting_id
    WHERE m.workspace_id = v_workspace AND (v_client_id IS NULL OR m.client_id = v_client_id)
      AND (p_meeting_id IS NULL OR m.id = p_meeting_id)
    ORDER BY n.due_date NULLS LAST LIMIT 50
  ) q;

  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'updated_at' DESC), '[]'::jsonb) INTO v_diagnostics FROM (
    SELECT jsonb_build_object('id', d.id, 'name', d.name, 'status', d.status, 'score', d.score,
      'findings', d.findings, 'recommendations', d.recommendations, 'updated_at', d.updated_at,
      'client_id', d.client_id, 'project_id', d.project_id, 'source_id', 'diagnostic:' || d.id,
      'source_label', 'Diagnóstico: ' || d.name, 'source_url', '/diagnosticos/' || d.id) item
    FROM public.diagnostics d WHERE d.workspace_id = v_workspace AND (v_client_id IS NULL OR d.client_id = v_client_id)
    ORDER BY d.updated_at DESC LIMIT 20
  ) q;

  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'created_at' DESC), '[]'::jsonb) INTO v_documents FROM (
    SELECT jsonb_build_object('id', d.id, 'name', d.display_name, 'category', d.category, 'created_at', d.created_at,
      'client_id', d.client_id, 'project_id', d.project_id, 'source_id', 'document:' || d.id,
      'source_label', 'Documento: ' || d.display_name, 'source_url', '/documentos?documentId=' || d.id) item
    FROM public.documents d WHERE d.workspace_id = v_workspace AND d.archived_at IS NULL AND d.is_current_version
      AND (v_client_id IS NULL OR d.client_id = v_client_id)
    ORDER BY d.created_at DESC LIMIT 30
  ) q;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name, 'department', p.department)), '[]'::jsonb)
  INTO v_team FROM public.profiles p WHERE p.id IN (
    SELECT wm.user_id FROM public.workspace_members wm WHERE wm.workspace_id = v_workspace
  );

  RETURN jsonb_build_object(
    'generated_at', now(), 'question', left(p_question, 2000), 'current_user_id', v_user,
    'scope', jsonb_build_object('client_id', v_client_id, 'meeting_id', p_meeting_id, 'report_id', p_report_id),
    'client', v_client, 'focused_meeting', v_meeting, 'focused_report', v_report,
    'projects', v_projects, 'tasks', v_tasks, 'meetings', v_meetings, 'decisions', v_decisions,
    'next_steps', v_next_steps, 'diagnostics', v_diagnostics, 'documents', v_documents, 'team', v_team
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_ai_context(text, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_ai_interaction(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ai_interaction(uuid, text, text, jsonb, jsonb, text, text, integer, integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_ai_context(text, uuid, uuid, uuid),
  public.begin_ai_interaction(text, jsonb),
  public.complete_ai_interaction(uuid, text, text, jsonb, jsonb, text, text, integer, integer, text)
  FROM PUBLIC, anon;

COMMIT;
