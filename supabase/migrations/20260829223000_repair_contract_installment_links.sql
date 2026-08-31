-- Contract editing previously regenerated every installment id. Receivables
-- retained the old id, so set_financial_record_payment could no longer find
-- the linked installment in contracts.installments. Repair unambiguous links
-- by matching the receivable to its installment's date and value.
DO $migration$
DECLARE
  charge record;
  matching_installments integer;
BEGIN
  FOR charge IN
    SELECT financial.id,
           financial.contract_id,
           financial.installment_id,
           financial.date,
           financial.amount,
           financial.status
    FROM public.financial_records AS financial
    JOIN public.contracts AS contract ON contract.id = financial.contract_id
    WHERE financial.type IN ('receita', 'revenue')
      AND financial.installment_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(contract.installments) = 'array'
            THEN contract.installments ELSE '[]'::jsonb END
        ) AS installment(item)
        WHERE installment.item ->> 'id' = financial.installment_id
      )
    ORDER BY financial.contract_id, financial.date, financial.id
  LOOP
    SELECT count(*) INTO matching_installments
    FROM public.contracts AS contract
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(contract.installments) = 'array'
        THEN contract.installments ELSE '[]'::jsonb END
    ) AS installment(item)
    WHERE contract.id = charge.contract_id
      AND installment.item ->> 'dueDate' = charge.date::text
      AND jsonb_typeof(installment.item -> 'value') = 'number'
      AND (installment.item ->> 'value')::numeric = charge.amount;

    -- Never guess when edited data has no match or more than one match.
    IF matching_installments = 1 THEN
      UPDATE public.contracts AS contract
      SET installments = (
            SELECT jsonb_agg(
              CASE
                WHEN installment.item ->> 'dueDate' = charge.date::text
                  AND jsonb_typeof(installment.item -> 'value') = 'number'
                  AND (installment.item ->> 'value')::numeric = charge.amount
                THEN jsonb_set(
                  jsonb_set(installment.item, '{id}', to_jsonb(charge.installment_id)),
                  '{status}',
                  to_jsonb(CASE WHEN charge.status = 'Pago' THEN 'paid' ELSE 'pending' END::text)
                )
                ELSE installment.item
              END
              ORDER BY installment.ordinality
            )
            FROM jsonb_array_elements(contract.installments)
              WITH ORDINALITY AS installment(item, ordinality)
          ),
          updated_at = now()
      WHERE contract.id = charge.contract_id;
    END IF;
  END LOOP;
END
$migration$;
