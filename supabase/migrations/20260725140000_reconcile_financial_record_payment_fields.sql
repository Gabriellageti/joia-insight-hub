-- Keep a one-time, transactionally consistent copy before changing financial_records.
-- The dedicated schema keeps the backup out of the API-exposed public schema.
CREATE SCHEMA IF NOT EXISTS migration_backups;

CREATE TABLE IF NOT EXISTS migration_backups.financial_records_before_payment_fields_20260725
AS TABLE public.financial_records WITH DATA;

COMMENT ON TABLE migration_backups.financial_records_before_payment_fields_20260725 IS
  'Snapshot of public.financial_records taken before reconciling payment and contract fields on 2026-07-25';

-- Emit the requested pre-migration audit without assuming that a fresh database
-- already has the drifted production columns. No historical payment date is inferred.
DO $audit$
DECLARE
  has_paid_at boolean;
  has_contract_id boolean;
  has_installment_id boolean;
  paid_with_date bigint;
  paid_without_date bigint;
  linked_to_contract_or_installment bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.financial_records'::regclass
      AND attname = 'paid_at' AND attnum > 0 AND NOT attisdropped
  ) INTO has_paid_at;

  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.financial_records'::regclass
      AND attname = 'contract_id' AND attnum > 0 AND NOT attisdropped
  ) INTO has_contract_id;

  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.financial_records'::regclass
      AND attname = 'installment_id' AND attnum > 0 AND NOT attisdropped
  ) INTO has_installment_id;

  IF has_paid_at THEN
    SELECT
      count(*) FILTER (WHERE status = 'Pago' AND paid_at IS NOT NULL),
      count(*) FILTER (WHERE status = 'Pago' AND paid_at IS NULL)
    INTO paid_with_date, paid_without_date
    FROM public.financial_records;
  ELSE
    SELECT 0, count(*) FILTER (WHERE status = 'Pago')
    INTO paid_with_date, paid_without_date
    FROM public.financial_records;
  END IF;

  IF has_contract_id AND has_installment_id THEN
    EXECUTE 'SELECT count(*) FROM public.financial_records WHERE contract_id IS NOT NULL OR installment_id IS NOT NULL'
      INTO linked_to_contract_or_installment;
  ELSIF has_contract_id THEN
    EXECUTE 'SELECT count(*) FROM public.financial_records WHERE contract_id IS NOT NULL'
      INTO linked_to_contract_or_installment;
  ELSIF has_installment_id THEN
    EXECUTE 'SELECT count(*) FROM public.financial_records WHERE installment_id IS NOT NULL'
      INTO linked_to_contract_or_installment;
  ELSE
    linked_to_contract_or_installment := 0;
  END IF;

  RAISE NOTICE 'financial_records pre-migration audit: paid_with_paid_at=%, paid_without_paid_at=%, linked_to_contract_or_installment=%',
    paid_with_date, paid_without_date, linked_to_contract_or_installment;
END
$audit$;

-- Production currently exposes these as nullable columns with no defaults,
-- additional constraints, indexes, or foreign keys. Add only a missing column;
-- never rewrite existing data or replace an existing definition.
ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS paid_at date,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_notes text,
  ADD COLUMN IF NOT EXISTS contract_id uuid,
  ADD COLUMN IF NOT EXISTS installment_id text;
