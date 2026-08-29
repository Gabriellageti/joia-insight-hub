-- Cadastra os ciclos 4 e 5 da consultoria da Agua 2 O e suas cobranças.
-- Os IDs fixos tornam a migração idempotente e mantêm cada conta a receber
-- ligada à parcela exibida no contrato.
DO $migration$
DECLARE
  target_client public.clients%ROWTYPE;
  matching_clients integer;
  cycle record;
  installment jsonb;
  installment_number integer;
  contract_installments jsonb;
BEGIN
  SELECT count(*)
    INTO matching_clients
  FROM public.clients
  WHERE upper(regexp_replace(trim(COALESCE(razao_social, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA'
     OR upper(regexp_replace(trim(COALESCE(nome_fantasia, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA';

  IF matching_clients <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one client named AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA, found %',
      matching_clients;
  END IF;

  SELECT * INTO target_client
  FROM public.clients
  WHERE upper(regexp_replace(trim(COALESCE(razao_social, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA'
     OR upper(regexp_replace(trim(COALESCE(nome_fantasia, '')), '\s+', ' ', 'g'))
          = 'AGUA 2 O DISTRIBUIDORA DE BEBIDAS LTDA';

  FOR cycle IN
    SELECT *
    FROM (VALUES
      (
        'a4202600-0000-4000-8000-000000000004'::uuid,
        4,
        '2026-06-05'::date,
        '2026-08-21'::date,
        ARRAY[
          '2026-06-05','2026-06-12','2026-06-19','2026-06-26',
          '2026-07-03','2026-07-10','2026-07-17','2026-07-24',
          '2026-07-31','2026-08-07','2026-08-14','2026-08-21'
        ]::date[]
      ),
      (
        'a5202600-0000-4000-8000-000000000005'::uuid,
        5,
        '2026-09-04'::date,
        '2026-12-18'::date,
        ARRAY[
          '2026-09-04','2026-09-11','2026-09-18','2026-09-25',
          '2026-10-02','2026-10-09','2026-10-16','2026-10-23',
          '2026-10-30','2026-11-06','2026-11-13','2026-11-20',
          '2026-11-27','2026-12-04','2026-12-11','2026-12-18'
        ]::date[]
      )
    ) AS cycles(contract_id, cycle_number, start_date, end_date, due_dates)
  LOOP
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', format('agua-2-o-ciclo-%s-parcela-%s', cycle.cycle_number, due.ordinality),
        'value', 747.50,
        'dueDate', due.due_date,
        'status', 'pending'
      ) ORDER BY due.ordinality
    )
    INTO contract_installments
    FROM unnest(cycle.due_dates) WITH ORDINALITY AS due(due_date, ordinality);

    INSERT INTO public.contracts (
      id, client_id, project_id, title, value, start_date, end_date,
      status, billing_type, installments, workspace_id
    ) VALUES (
      cycle.contract_id,
      target_client.id,
      NULL,
      format('Consultoria Mensal - Ciclo %s', cycle.cycle_number),
      array_length(cycle.due_dates, 1) * 747.50,
      cycle.start_date,
      cycle.end_date,
      'ativo',
      'semanal',
      contract_installments,
      target_client.workspace_id
    )
    ON CONFLICT (id) DO UPDATE SET
      client_id = EXCLUDED.client_id,
      title = EXCLUDED.title,
      value = EXCLUDED.value,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      status = EXCLUDED.status,
      billing_type = EXCLUDED.billing_type,
      installments = CASE
        WHEN jsonb_array_length(COALESCE(contracts.installments, '[]'::jsonb)) = 0
          THEN EXCLUDED.installments
        ELSE contracts.installments
      END,
      workspace_id = EXCLUDED.workspace_id,
      updated_at = now();

    installment_number := 0;
    FOR installment IN SELECT * FROM jsonb_array_elements(contract_installments)
    LOOP
      installment_number := installment_number + 1;

      INSERT INTO public.financial_records (
        id, client_id, project_id, type, category, description, amount,
        date, status, is_internal, contract_id, installment_id, workspace_id
      ) VALUES (
        -- One deterministic UUID for each cycle/installment pair.
        format(
          'f%s202600-0000-4000-8000-%s',
          cycle.cycle_number,
          lpad(installment_number::text, 12, '0')
        )::uuid,
        target_client.id,
        NULL,
        'receita',
        'Recorrente',
        format(
          'Semanalidade %s/%s - Consultoria Mensal - Ciclo %s',
          installment_number,
          array_length(cycle.due_dates, 1),
          cycle.cycle_number
        ),
        747.50,
        (installment ->> 'dueDate')::date,
        'Pendente',
        false,
        cycle.contract_id,
        installment ->> 'id',
        target_client.workspace_id
      )
      ON CONFLICT (id) DO UPDATE SET
        client_id = EXCLUDED.client_id,
        description = EXCLUDED.description,
        amount = EXCLUDED.amount,
        date = EXCLUDED.date,
        contract_id = EXCLUDED.contract_id,
        installment_id = EXCLUDED.installment_id,
        workspace_id = EXCLUDED.workspace_id,
        updated_at = now();
    END LOOP;
  END LOOP;
END
$migration$;
