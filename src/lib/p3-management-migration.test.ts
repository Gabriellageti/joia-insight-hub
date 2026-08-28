import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260828224627_p3_management_health_operations.sql"), "utf8");

describe("P3 management migration", () => {
  test("keeps health explainable and RLS-aware", () => {
    expect(migration).toContain("operational_project_health");
    expect(migration).toContain("WITH (security_invoker = true)");
    expect(migration).toContain("risk_reasons");
    expect(migration).toContain("WHEN score.value >= 8 THEN 'critical'");
    expect(migration).toContain("SECURITY INVOKER");
  });
  test("requires a reason for blocked tasks", () => {
    expect(migration).toContain("block_reason is required when a task is blocked");
    expect(migration).toContain("NEW.blocked_at := COALESCE");
    expect(migration).toContain("tasks_blocked_duration_idx");
  });
  test("uses least privilege for new APIs", () => {
    expect(migration).toContain("ALTER TABLE public.entity_favorites ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_operations_dashboard");
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_operations_dashboard");
  });
  test("adds the requested operational indexes", () => {
    expect(migration).toContain("projects_workspace_status_due_idx");
    expect(migration).toContain("deliverables_workspace_due_idx");
    expect(migration).toContain("activity_logs_actor_created_idx");
    expect(migration).toContain("activity_logs_entity_created_idx");
  });
});
