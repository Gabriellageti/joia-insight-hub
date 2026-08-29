-- Reconcilia os tres ciclos historicos da Agua 2 O com as contas a receber
-- importadas e libera a tabela de recorrencias para os perfis financeiros.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_recurring_rules TO authenticated;

DROP POLICY IF EXISTS financial_recurring_rules_finance_select ON public.financial_recurring_rules;
CREATE POLICY financial_recurring_rules_finance_select
  ON public.financial_recurring_rules
  FOR SELECT TO authenticated
  USING (
    private.user_has_role((SELECT auth.uid()), 'admin_joia')
    OR private.user_has_role((SELECT auth.uid()), 'financeiro_joia')
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members member
      WHERE member.user_id = (SELECT auth.uid())
        AND member.role IN ('owner', 'admin', 'manager')
    )
  );

DO $migration$
DECLARE
  target_client public.clients%ROWTYPE;
  matching_clients integer;
  cycle record;
  target_contract public.contracts%ROWTYPE;
  matching_contracts integer;
  contract_installments jsonb;
  installment_number integer;
  target_installment_id text;
  due_date date;
  charge public.financial_records%ROWTYPE;
  matching_charges integer;
BEGIN
  SELECT count(*) INTO matching_clients
  FROM public.clients
  WHERE upper(regexp_replace(trim(COALESCE(name, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA'
     OR upper(regexp_replace(trim(COALESCE(trade_name, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA';

  IF matching_clients <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Agua 2 O client, found %', matching_clients;
  END IF;

  SELECT * INTO target_client
  FROM public.clients
  WHERE upper(regexp_replace(trim(COALESCE(name, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA'
     OR upper(regexp_replace(trim(COALESCE(trade_name, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA';

  FOR cycle IN
    SELECT * FROM (VALUES
      (1, 375.00::numeric, 4500.00::numeric, '2025-08-01'::date, '2025-08-10'::date,
        ARRAY['2025-08-05','2025-08-12','2025-08-19','2025-08-26','2025-09-02','2025-09-09',
              '2025-09-16','2025-09-23','2025-09-30','2025-10-07','2025-10-14','2025-10-21']::date[]),
      (2, 747.50::numeric, 8970.00::numeric, '2025-12-01'::date, '2025-12-20'::date,
        ARRAY['2025-12-12','2025-12-19','2025-12-26','2026-01-02','2026-01-09','2026-01-16',
              '2026-01-23','2026-01-30','2026-02-06','2026-02-13','2026-02-20','2026-02-27']::date[]),
      (3, 747.50::numeric, 8970.00::numeric, '2026-03-01'::date, '2026-04-15'::date,
        ARRAY['2026-03-10','2026-03-17','2026-03-24','2026-04-01','2026-04-08','2026-04-15',
              '2026-04-22','2026-04-29','2026-05-05','2026-05-12','2026-05-19','2026-05-29']::date[])
    ) AS cycles(cycle_number, installment_value, contract_value, legacy_start_min, legacy_start_max, due_dates)
  LOOP
    SELECT count(*) INTO matching_contracts
    FROM public.contracts
    WHERE client_id = target_client.id
      AND value = cycle.contract_value
      AND start_date BETWEEN cycle.legacy_start_min AND cycle.legacy_start_max;

    IF matching_contracts <> 1 THEN
      RAISE EXCEPTION 'Expected one legacy contract for cycle %, found %', cycle.cycle_number, matching_contracts;
    END IF;

    SELECT * INTO target_contract
    FROM public.contracts
    WHERE client_id = target_client.id
      AND value = cycle.contract_value
      AND start_date BETWEEN cycle.legacy_start_min AND cycle.legacy_start_max;

    contract_installments := '[]'::jsonb;
    installment_number := 0;

    FOREACH due_date IN ARRAY cycle.due_dates
    LOOP
      installment_number := installment_number + 1;
      target_installment_id := format('agua-2-o-ciclo-%s-parcela-%s', cycle.cycle_number, installment_number);

      SELECT count(*) INTO matching_charges
      FROM public.financial_records
      WHERE client_id = target_client.id
        AND type = 'receita'
        AND amount = cycle.installment_value
        AND date = due_date
        AND description ~* format('Ciclo\s*%s', cycle.cycle_number);

      IF matching_charges > 1 THEN
        RAISE EXCEPTION 'Found % charges for cycle %, installment %', matching_charges, cycle.cycle_number, installment_number;
      END IF;

      IF matching_charges = 0 THEN
        INSERT INTO public.financial_records (
          client_id, project_id, type, category, description, amount, date,
          status, is_internal, contract_id, installment_id, workspace_id
        ) VALUES (
          target_client.id, NULL, 'receita', 'Recorrente',
          format('Semanalidade %s/12 - Consultoria Mensal - Ciclo %s', installment_number, cycle.cycle_number),
          cycle.installment_value, due_date, 'Pendente', false,
          target_contract.id, target_installment_id, target_client.workspace_id
        ) RETURNING * INTO charge;
      ELSE
        SELECT * INTO charge
        FROM public.financial_records
        WHERE client_id = target_client.id
          AND type = 'receita'
          AND amount = cycle.installment_value
          AND date = due_date
          AND description ~* format('Ciclo\s*%s', cycle.cycle_number);

        UPDATE public.financial_records
        SET contract_id = target_contract.id,
            installment_id = target_installment_id,
            workspace_id = target_client.workspace_id,
            updated_at = now()
        WHERE id = charge.id;
      END IF;

      contract_installments := contract_installments || jsonb_build_array(jsonb_build_object(
        'id', target_installment_id,
        'value', cycle.installment_value,
        'dueDate', due_date,
        'status', CASE WHEN charge.status = 'Pago' THEN 'paid' ELSE 'pending' END
      ));
    END LOOP;

    UPDATE public.contracts
    SET title = format('Consultoria Mensal - Ciclo %s', cycle.cycle_number),
        value = cycle.contract_value,
        start_date = cycle.due_dates[1],
        end_date = cycle.due_dates[array_length(cycle.due_dates, 1)],
        status = 'ativo',
        billing_type = 'semanal',
        installments = contract_installments,
        workspace_id = target_client.workspace_id,
        updated_at = now()
    WHERE id = target_contract.id;
  END LOOP;
END
$migration$;
