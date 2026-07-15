import { describe, expect, test } from "bun:test";

const migrationUrl = new URL("../../../supabase/migrations/20260714181740_enhance_task_workspace.sql", import.meta.url);
const sql = await Bun.file(migrationUrl).text();

describe("task workspace migration security", () => {
  test("uses explicit project membership instead of authenticated-wide project access", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.project_members");
    expect(sql).toContain("private.user_project_access_level((SELECT auth.uid()), project_id) >= 1");
    expect(sql).not.toContain('CREATE POLICY "Authenticated users can view projects"');
  });

  test("keeps personal tasks private and freezes task authorship", () => {
    expect(sql).toContain("task_type = 'personal' AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))");
    expect(sql).toContain("NEW.created_by IS DISTINCT FROM OLD.created_by");
    expect(sql).toContain("created_by is immutable");
  });

  test("protects completion metadata and all comment operations", () => {
    expect(sql).toContain("NEW.completed_at := now()");
    expect(sql).toContain('CREATE POLICY "Users can delete their own permitted comments"');
    expect(sql).toContain("SET search_path = ''");
  });
});
