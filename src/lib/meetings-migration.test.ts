import { describe, expect, test } from "bun:test";

const migration = await Bun.file(new URL("../../supabase/migrations/20260828215558_p2_operational_meetings.sql", import.meta.url)).text();
const permissionFix = await Bun.file(new URL("../../supabase/migrations/20260828221404_p2_meeting_task_assignment_permission.sql", import.meta.url)).text();

describe("P2 operational meetings migration", () => {
  test("evolves meetings without creating a parallel meeting source", () => {
    expect(migration).toContain("ALTER TABLE public.meetings");
    expect(migration).not.toMatch(/CREATE TABLE public\.meetings\s*\(/);
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS source_meeting_id uuid REFERENCES public.meetings(id)");
    expect(migration).not.toContain("CREATE TABLE public.meeting_tasks");
  });

  test("creates structured agenda, decisions, next steps and participants", () => {
    for (const table of ["meeting_agenda_items", "meeting_decisions", "meeting_next_steps", "meeting_participants"]) {
      expect(migration).toContain(`CREATE TABLE public.${table}`);
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(migration).toContain("CREATE UNIQUE INDEX tasks_source_decision_unique_idx");
    expect(migration).toContain("CREATE UNIQUE INDEX tasks_source_next_step_unique_idx");
  });

  test("keeps activity immutable to browser clients and grants least privilege", () => {
    expect(migration).toContain("ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("GRANT SELECT ON public.activity_logs TO authenticated");
    expect(migration).not.toMatch(/GRANT (INSERT|UPDATE|DELETE).*activity_logs TO authenticated/);
    expect(migration).not.toMatch(/(USING|WITH CHECK)\s*\(true\)/i);
  });

  test("protects tenant scope and task origin in database triggers", () => {
    expect(migration).toContain("private.prepare_meeting_write()");
    expect(migration).toContain("meeting project and client do not match");
    expect(migration).toContain("task meeting origin is immutable");
    expect(migration).toContain("REVOKE ALL ON FUNCTION private.protect_task_meeting_origin() FROM PUBLIC, anon, authenticated");
  });

  test("allows assignment checks without exposing arbitrary access levels", () => {
    expect(permissionFix).toContain("private.can_assign_workspace_task");
    expect(permissionFix).toContain("private.workspace_access_level(_workspace_id), 0) >= 1");
    expect(permissionFix).toContain("GRANT EXECUTE ON FUNCTION private.can_assign_workspace_task(uuid, uuid) TO authenticated");
    expect(permissionFix).not.toContain("GRANT EXECUTE ON FUNCTION private.user_workspace_access_level");
  });
});
