import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20260829110000_p10_automation_engine.sql", "utf8");

describe("P10 automation engine migration", () => {
  test("centralizes rules, events and execution logs", () => {
    expect(sql).toContain("CREATE TABLE public.automation_rules");
    expect(sql).toContain("CREATE TABLE public.automation_events");
    expect(sql).toContain("CREATE TABLE public.automation_runs");
    expect(sql).toContain("duration_ms");
  });

  test("ships every initial rule over existing operational sources", () => {
    for (const key of ["urgent_task_overdue", "inactive_project_attention", "meeting_finalized_history", "won_opportunity_client", "client_created_project", "template_project_structure", "overdue_next_step_task", "blocked_task_escalation"]) {
      expect(sql).toContain(key);
    }
    expect(sql).toContain("public.operational_project_health");
    expect(sql).toContain("source_next_step_id");
    expect(sql).toContain("project_template_instantiations");
  });

  test("prevents loops and duplicate effects", () => {
    expect(sql).toContain("depth BETWEEN 0 AND 5");
    expect(sql).toContain("UNIQUE (workspace_id, idempotency_key)");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("ON CONFLICT(user_id,dedupe_key)");
  });

  test("keeps configuration manager-scoped and execution server-authored", () => {
    expect(sql).toContain("automation_rules_manager_update");
    expect(sql).toContain("manager access required");
    expect(sql).toContain("REVOKE ALL ON FUNCTION private.execute_automation_event");
    expect(sql).toContain("REVOKE ALL ON public.automation_rules,public.automation_events,public.automation_runs,public.automation_connectors FROM anon");
  });

  test("prepares external providers without connecting them", () => {
    expect(sql).toContain("CREATE TABLE public.automation_connectors");
    for (const provider of ["google_calendar", "google_drive", "gmail", "whatsapp", "slack", "external_api"]) expect(sql).toContain(provider);
    expect(sql).toContain("DEFAULT 'planned'");
  });
});
