-- P11: only the trusted server runtime may complete an AI audit record.
BEGIN;

DROP FUNCTION IF EXISTS public.complete_ai_interaction(
  uuid, text, text, jsonb, jsonb, text, text, integer, integer, text
);

CREATE FUNCTION public.complete_ai_interaction(
  p_interaction_id uuid,
  p_user_id uuid,
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
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR p_status NOT IN ('success', 'error') OR p_mode NOT IN ('ai', 'fallback') THEN
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
      model = left(p_model, 100),
      mode = p_mode,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      error_message = left(p_error_message, 1000),
      completed_at = now()
  WHERE id = p_interaction_id AND user_id = p_user_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interação não encontrada' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_ai_interaction(
  uuid, uuid, text, text, jsonb, jsonb, text, text, integer, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ai_interaction(
  uuid, uuid, text, text, jsonb, jsonb, text, text, integer, integer, text
) TO service_role;

COMMIT;
