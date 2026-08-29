import { describe, expect, test } from "bun:test";

const migrationUrl = new URL("../../../supabase/migrations/20260828203909_complete_task_operations.sql", import.meta.url);
const sql = await Bun.file(migrationUrl).text();

describe("complete task operations migration", () => {
  test("keeps one task table and the five operational statuses", () => {
    expect(sql).not.toMatch(/CREATE TABLE\s+public\.tasks/i);
    expect(sql).toContain("status IN ('not_started', 'in_progress', 'waiting', 'blocked', 'done')");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS observations text");
  });

  test("supports personal, client and project scopes", () => {
    expect(sql).toContain("task_type IN ('personal', 'client', 'project')");
    expect(sql).toContain("task_type = 'client' AND project_id IS NULL AND client_id IS NOT NULL");
    expect(sql).toContain("task_type = 'project' AND project_id IS NOT NULL");
  });

  test("enforces authorization for every write operation", () => {
    expect(sql).toContain("CREATE POLICY tasks_scoped_select");
    expect(sql).toContain("CREATE POLICY tasks_scoped_insert");
    expect(sql).toContain("CREATE POLICY tasks_scoped_update");
    expect(sql).toContain("CREATE POLICY tasks_scoped_delete");
    expect(sql).toContain("private.user_project_access_level((SELECT auth.uid()), project_id) >= 2");
    expect(sql).toContain("private.workspace_access_level(workspace_id), 0) >= 3");
    expect(sql).not.toMatch(/(USING|WITH CHECK)\s*\(true\)/i);
  });
});
