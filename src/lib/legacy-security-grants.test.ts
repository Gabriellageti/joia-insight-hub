import { describe, expect, test } from "bun:test";

const migrationUrl = new URL("../../supabase/migrations/20260828210515_close_legacy_security_grants.sql", import.meta.url);
const sql = await Bun.file(migrationUrl).text();

describe("legacy security grants", () => {
  test("removes anonymous finance discovery and the public role RPC", () => {
    expect(sql).toContain("public.financial_recurring_rules");
    expect(sql).toContain("public.legacy_financial_reconciliation_report");
    expect(sql).toContain("FROM anon");
    expect(sql).toContain("public.has_role(uuid, public.app_role)");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
  });
});
