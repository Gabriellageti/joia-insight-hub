-- Report legacy charges before anybody links them. This table is deliberately a
-- review queue: this migration never guesses or writes contract/installment ids.
CREATE TABLE public.legacy_financial_reconciliation_report AS
WITH candidates AS (
  SELECT
    financial.id AS financial_record_id,
    contract.id AS contract_id,
    installment.item ->> 'id' AS installment_id
  FROM public.financial_records AS financial
  JOIN public.contracts AS contract
    ON contract.client_id = financial.client_id
   AND contract.project_id IS NOT DISTINCT FROM financial.project_id
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(contract.installments) = 'array' THEN contract.installments ELSE '[]'::jsonb END
  ) AS installment(item)
  WHERE financial.type = 'receita'
    AND financial.contract_id IS NULL
    AND financial.installment_id IS NULL
    AND CASE
      WHEN jsonb_typeof(installment.item -> 'value') = 'number'
        THEN (installment.item ->> 'value')::numeric = financial.amount
      ELSE false
    END
    AND installment.item ->> 'dueDate' = financial.date::text
), summarized AS (
  SELECT
    financial_record_id,
    count(*)::integer AS candidate_count,
    jsonb_agg(jsonb_build_object(
      'contract_id', contract_id,
      'installment_id', installment_id
    )) AS candidates
  FROM candidates
  GROUP BY financial_record_id
)
SELECT
  gen_random_uuid() AS id,
  financial.id AS financial_record_id,
  COALESCE(summarized.candidate_count, 0) AS candidate_count,
  COALESCE(summarized.candidates, '[]'::jsonb) AS candidates,
  CASE
    WHEN summarized.candidate_count = 1 THEN 'unique_match_requires_review'
    WHEN summarized.candidate_count > 1 THEN 'ambiguous_manual_review'
    ELSE 'unmatched_manual_review'
  END::text AS review_status,
  now() AS generated_at
FROM public.financial_records AS financial
LEFT JOIN summarized ON summarized.financial_record_id = financial.id
WHERE financial.type = 'receita'
  AND financial.contract_id IS NULL
  AND financial.installment_id IS NULL;

ALTER TABLE public.legacy_financial_reconciliation_report
  ADD PRIMARY KEY (id),
  ADD CONSTRAINT legacy_financial_reconciliation_report_record_key UNIQUE (financial_record_id);

ALTER TABLE public.legacy_financial_reconciliation_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can review legacy financial reconciliation"
  ON public.legacy_financial_reconciliation_report
  FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.legacy_financial_reconciliation_report IS
  'Manual review queue generated before reconciliation. Only rows with candidate_count = 1 may be linked, after review; ambiguous and unmatched rows must remain unlinked.';

-- A single database call changes both the charge and its JSON installment. A
-- failure in either update rolls the complete function call back.
CREATE OR REPLACE FUNCTION public.set_financial_record_payment(
  p_financial_record_id uuid,
  p_paid boolean,
  p_paid_at date DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_payment_notes text DEFAULT NULL
)
RETURNS SETOF public.financial_records
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  charge public.financial_records%ROWTYPE;
  contract_installments jsonb;
  matching_installments integer;
BEGIN
  SELECT * INTO charge
  FROM public.financial_records
  WHERE id = p_financial_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial record % does not exist', p_financial_record_id;
  END IF;

  IF charge.type <> 'receita' THEN
    RAISE EXCEPTION 'Only revenue records can have receivable payments changed';
  END IF;

  IF (charge.contract_id IS NULL) <> (charge.installment_id IS NULL) THEN
    RAISE EXCEPTION 'Financial record % has an incomplete contract/installment link', charge.id;
  END IF;

  IF charge.contract_id IS NOT NULL THEN
    SELECT installments INTO contract_installments
    FROM public.contracts
    WHERE id = charge.contract_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked contract % does not exist', charge.contract_id;
    END IF;

    SELECT count(*) INTO matching_installments
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(contract_installments) = 'array' THEN contract_installments ELSE '[]'::jsonb END
    ) AS installment(item)
    WHERE installment.item ->> 'id' = charge.installment_id;

    IF matching_installments <> 1 THEN
      RAISE EXCEPTION 'Installment % must occur exactly once in contract %', charge.installment_id, charge.contract_id;
    END IF;

    UPDATE public.contracts
    SET installments = (
      SELECT jsonb_agg(
        CASE WHEN installment.item ->> 'id' = charge.installment_id
          THEN jsonb_set(installment.item, '{status}', to_jsonb(CASE WHEN p_paid THEN 'paid' ELSE 'pending' END::text))
          ELSE installment.item
        END ORDER BY installment.ordinality
      )
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(contract_installments) = 'array' THEN contract_installments ELSE '[]'::jsonb END
      )
        WITH ORDINALITY AS installment(item, ordinality)
    )
    WHERE id = charge.contract_id;
  END IF;

  RETURN QUERY
  UPDATE public.financial_records
  SET
    status = CASE WHEN p_paid THEN 'Pago' ELSE 'Pendente' END,
    paid_at = CASE WHEN p_paid THEN p_paid_at ELSE NULL END,
    payment_method = CASE WHEN p_paid THEN NULLIF(p_payment_method, '') ELSE NULL END,
    payment_notes = CASE WHEN p_paid THEN NULLIF(p_payment_notes, '') ELSE NULL END,
    updated_at = now()
  WHERE id = p_financial_record_id
  RETURNING *;
END
$function$;

GRANT EXECUTE ON FUNCTION public.set_financial_record_payment(uuid, boolean, date, text, text) TO authenticated;
