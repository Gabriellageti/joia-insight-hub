BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Approved P11 containment. This legacy catalogue has no explicit tenant model.
-- Do not restore browser access until a separate tenant-scoped design is tested.
DROP POLICY IF EXISTS financial_recurring_rules_finance_select
  ON public.financial_recurring_rules;
ALTER TABLE public.financial_recurring_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.financial_recurring_rules
  FROM PUBLIC, anon, authenticated;

-- Table REVOKE does not remove independently granted column privileges.
DO $containment$
DECLARE columns_sql text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
    INTO columns_sql
  FROM pg_attribute
  WHERE attrelid = 'public.financial_recurring_rules'::regclass
    AND attnum > 0 AND NOT attisdropped;
  EXECUTE format(
    'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.financial_recurring_rules FROM PUBLIC, anon, authenticated',
    columns_sql
  );
  IF has_table_privilege('authenticated', 'public.financial_recurring_rules', 'SELECT')
     OR has_any_column_privilege('authenticated', 'public.financial_recurring_rules', 'SELECT')
     OR has_table_privilege('anon', 'public.financial_recurring_rules', 'SELECT') THEN
    RAISE EXCEPTION 'P11 containment failed: inherited client privilege remains';
  END IF;
  -- Preserve the existing trusted server permission, do not broaden it.
  IF NOT has_table_privilege('service_role', 'public.financial_recurring_rules', 'SELECT') THEN
    RAISE EXCEPTION 'P11 containment failed: existing trusted server read unavailable';
  END IF;
END;
$containment$;

NOTIFY pgrst, 'reload schema';
COMMIT;
