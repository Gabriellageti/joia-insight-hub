import { describe, expect, test } from "bun:test";
const sql = await Bun.file("supabase/migrations/20260829080000_p7_consulting_reports.sql").text();
describe("P7 consulting reports", () => {
  test("creates versioned drafts from existing operational sources", () => {
    expect(sql).toContain("CREATE TABLE public.consulting_reports");
    for (const source of ["public.meetings", "public.meeting_decisions", "public.meeting_next_steps", "public.tasks", "public.projects", "public.documents", "public.diagnostics"]) expect(sql).toContain(source);
    expect(sql).toContain("source_snapshot jsonb");
  });
  test("covers the required report structure", () => {
    for (const section of ["executive_summary", "activities", "meetings", "diagnostics", "decisions", "improvements", "completed_tasks", "pending_tasks", "risks", "next_steps", "considerations"]) expect(sql).toContain(`'${section}'`);
  });
  test("requires review before immutable finalization", () => {
    expect(sql).toContain("status text NOT NULL DEFAULT 'draft'");
    expect(sql).toContain("finalized reports require a new version");
    expect(sql).toContain("create_consulting_report_version");
    expect(sql).toContain("pg_advisory_xact_lock");
  });
  test("protects tenant data with RLS and least privilege", () => {
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("private.workspace_access_level(workspace_id),0)>=3");
    expect(sql).toContain("REVOKE ALL ON public.consulting_reports FROM anon");
  });
});
