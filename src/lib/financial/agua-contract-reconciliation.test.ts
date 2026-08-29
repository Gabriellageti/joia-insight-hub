import { describe, expect, test } from "bun:test";

const migrationUrl = new URL(
  "../../../supabase/migrations/20260829210000_reconcile_agua_2_o_legacy_cycles_and_recurring_permissions.sql",
  import.meta.url,
);
const sql = await Bun.file(migrationUrl).text();

describe("Agua 2 O contract reconciliation", () => {
  test("uses the deployed client schema and weekly contract type", () => {
    expect(sql).toContain("COALESCE(name, '')");
    expect(sql).toContain("COALESCE(trade_name, '')");
    expect(sql).not.toMatch(/razao_social|nome_fantasia/);
    expect(sql).toContain("billing_type = 'semanal'");
  });

  test("links historical charges without replacing their payment details", () => {
    expect(sql).toContain("contract_id = target_contract.id");
    expect(sql).toContain("installment_id = target_installment_id");
    expect(sql).toContain("CASE WHEN charge.status = 'Pago' THEN 'paid' ELSE 'pending' END");
    expect(sql).not.toMatch(/SET[\s\S]{0,100}status\s*=\s*'Pendente'/);
  });

  test("grants recurring-rule reads to authenticated finance users", () => {
    expect(sql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_recurring_rules TO authenticated");
    expect(sql).toContain("financial_recurring_rules_finance_select");
    expect(sql).toContain("'financeiro_joia'");
  });
});
