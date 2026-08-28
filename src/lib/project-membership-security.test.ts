import { describe, expect, test } from "bun:test";

const migrationUrl = new URL("../../supabase/migrations/20260828210719_close_project_membership_bypass.sql", import.meta.url);
const sql = await Bun.file(migrationUrl).text();

describe("project membership authorization", () => {
  test("removes the global admin bypass and scopes every mutation", () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can manage project memberships"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can create projects"');
    expect(sql).toContain("project_members_manager_insert");
    expect(sql).toContain("project_members_manager_update");
    expect(sql).toContain("project_members_manager_delete");
    expect(sql).toContain("private.workspace_access_level(project.workspace_id), 0) >= 3");
    expect(sql).toContain("private.user_project_access_level((SELECT auth.uid()), project.id) >= 3");
    expect(sql).not.toMatch(/WITH CHECK\s*\(true\)/i);
  });

  test("prevents membership reassignment", () => {
    expect(sql).toContain("NEW.project_id IS DISTINCT FROM OLD.project_id");
    expect(sql).toContain("NEW.user_id IS DISTINCT FROM OLD.user_id");
  });
});
