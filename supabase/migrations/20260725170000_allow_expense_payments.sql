-- Contas a pagar use the same payment fields as receivables. Keep contract
-- installment synchronization exclusive to revenue records, while allowing an
-- expense to be marked as paid (or reopened) by the same atomic RPC.
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
  financial_record public.financial_records%ROWTYPE;
  contract_installments jsonb;
  matching_installments integer;
  is_revenue boolean;
BEGIN
  SELECT * INTO financial_record
  FROM public.financial_records
  WHERE id = p_financial_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial record % does not exist', p_financial_record_id;
  END IF;

  is_revenue := financial_record.type IN ('receita', 'revenue');

  IF NOT is_revenue AND financial_record.type NOT IN ('despesa', 'expense') THEN
    RAISE EXCEPTION 'Financial record % has unsupported type %', financial_record.id, financial_record.type;
  END IF;

  -- Only receivables may be linked to contract installments. Expense payments
  -- are updated directly and never change contract data.
  IF is_revenue AND (financial_record.contract_id IS NULL) <> (financial_record.installment_id IS NULL) THEN
    RAISE EXCEPTION 'Financial record % has an incomplete contract/installment link', financial_record.id;
  END IF;

  IF is_revenue AND financial_record.contract_id IS NOT NULL THEN
    SELECT installments INTO contract_installments
    FROM public.contracts
    WHERE id = financial_record.contract_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked contract % does not exist', financial_record.contract_id;
    END IF;

    SELECT count(*) INTO matching_installments
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(contract_installments) = 'array' THEN contract_installments ELSE '[]'::jsonb END
    ) AS installment(item)
    WHERE installment.item ->> 'id' = financial_record.installment_id;

    IF matching_installments <> 1 THEN
      RAISE EXCEPTION 'Installment % must occur exactly once in contract %', financial_record.installment_id, financial_record.contract_id;
    END IF;

    UPDATE public.contracts
    SET installments = (
      SELECT jsonb_agg(
        CASE WHEN installment.item ->> 'id' = financial_record.installment_id
          THEN jsonb_set(installment.item, '{status}', to_jsonb(CASE WHEN p_paid THEN 'paid' ELSE 'pending' END::text))
          ELSE installment.item
        END ORDER BY installment.ordinality
      )
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(contract_installments) = 'array' THEN contract_installments ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS installment(item, ordinality)
    )
    WHERE id = financial_record.contract_id;
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
