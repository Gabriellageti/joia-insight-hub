import { describe, expect, test } from "bun:test";
const financial = await Bun.file(new URL("../../supabase/migrations/20260830164626_p11_restore_financial_recurring_server_boundary.sql", import.meta.url)).text();
const activity = await Bun.file(new URL("../../supabase/migrations/20260830164910_p11_preserve_activity_history_on_delete.sql", import.meta.url)).text();

describe("P11 closure containment", () => {
  test("removes the unscoped policy and client table/column grants", () => {
    expect(financial).toContain("DROP POLICY IF EXISTS financial_recurring_rules_finance_select");
    expect(financial).toContain("FROM PUBLIC, anon, authenticated");
    expect(financial).toContain("has_any_column_privilege");
    expect(financial).toContain("'service_role'");
    expect(financial).not.toMatch(/(?:INSERT INTO|UPDATE|DELETE FROM) public\.financial_recurring_rules/);
    expect(financial).not.toMatch(/GRANT.*TO authenticated/);
  });
  test("preserves audit rows, nullable live references, and original snapshot IDs", () => {
    expect(activity).toContain("ALTER COLUMN workspace_id DROP NOT NULL");
    expect(activity.match(/ON DELETE SET NULL/g)).toHaveLength(4);
    expect(activity).toContain("'entity_snapshot'");
    expect(activity).toContain("'references'");
    expect(activity).toContain("'test_run_id'");
    expect(activity).not.toMatch(/DELETE FROM public\.activity_logs|DISABLE TRIGGER|session_replication_role/);
  });
  test("handles meeting cascade deletion and denies audit mutations", () => {
    expect(activity).toContain("log_meeting_delete_history BEFORE DELETE");
    expect(activity).toContain("Meeting audit parent snapshot missing");
    expect(activity).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.activity_logs");
    expect(activity).not.toContain("CREATE POLICY");
    expect(activity).toContain("SET search_path = ''");
  });
});
