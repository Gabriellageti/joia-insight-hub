CREATE TABLE IF NOT EXISTS public.financial_recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
  start_date date NOT NULL,
  end_date date,
  day_of_month smallint NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_recurring_rules_admin_all" ON public.financial_recurring_rules FOR ALL TO authenticated
USING (private.user_has_role((SELECT auth.uid()), 'admin_joia'))
WITH CHECK (private.user_has_role((SELECT auth.uid()), 'admin_joia'));

ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS recurrence_rule_id uuid REFERENCES public.financial_recurring_rules(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS financial_records_recurrence_occurrence_unique
ON public.financial_records (recurrence_rule_id, date)
WHERE recurrence_rule_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_financial_recurring_expense(
  p_description text, p_category text, p_project_id uuid, p_amount numeric,
  p_frequency text, p_start_date date, p_end_date date DEFAULT NULL,
  p_day_of_month smallint DEFAULT NULL
) RETURNS public.financial_recurring_rules
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rule public.financial_recurring_rules;
  target_month date;
  occurrence_date date;
  month_offset integer;
  interval_months integer;
BEGIN
  IF NOT private.user_has_role(auth.uid(), 'admin_joia') THEN RAISE EXCEPTION 'Permissão negada'; END IF;
  interval_months := CASE p_frequency WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 3 WHEN 'annual' THEN 12 ELSE 0 END;
  IF interval_months = 0 THEN RAISE EXCEPTION 'Frequência inválida'; END IF;
  INSERT INTO public.financial_recurring_rules (description, category, project_id, amount, frequency, start_date, end_date, day_of_month)
  VALUES (p_description, p_category, p_project_id, p_amount, p_frequency, p_start_date, p_end_date, COALESCE(p_day_of_month, extract(day FROM p_start_date)::smallint))
  RETURNING * INTO rule;

  FOR month_offset IN 0..11 LOOP
    target_month := (date_trunc('month', p_start_date)::date + make_interval(months => month_offset));
    IF month_offset % interval_months <> 0 THEN CONTINUE; END IF;
    occurrence_date := make_date(extract(year FROM target_month)::integer, extract(month FROM target_month)::integer,
      LEAST(rule.day_of_month, extract(day FROM (date_trunc('month', target_month) + interval '1 month - 1 day'))::integer));
    IF occurrence_date < p_start_date OR (p_end_date IS NOT NULL AND occurrence_date > p_end_date) THEN CONTINUE; END IF;
    INSERT INTO public.financial_records (type, description, category, project_id, amount, date, status, is_internal, recurrence_rule_id)
    VALUES ('despesa', rule.description, rule.category, rule.project_id, rule.amount, occurrence_date, 'Pendente', true, rule.id)
    ON CONFLICT (recurrence_rule_id, date) WHERE recurrence_rule_id IS NOT NULL DO NOTHING;
  END LOOP;
  RETURN rule;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_financial_recurring_expense_active(p_rule_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT private.user_has_role(auth.uid(), 'admin_joia') THEN RAISE EXCEPTION 'Permissão negada'; END IF;
  UPDATE public.financial_recurring_rules SET active = p_active WHERE id = p_rule_id;
  IF NOT p_active THEN
    DELETE FROM public.financial_records
    WHERE recurrence_rule_id = p_rule_id AND date >= current_date AND status IS DISTINCT FROM 'Pago';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_financial_recurring_expense(text, text, uuid, numeric, text, date, date, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_financial_recurring_expense_active(uuid, boolean) TO authenticated;
