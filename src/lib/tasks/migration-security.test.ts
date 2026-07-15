import { describe, expect, test } from "bun:test";

const migrationUrl = new URL("../../../supabase/migrations/20260714181740_enhance_task_workspace.sql", import.meta.url);
const sql = await Bun.file(migrationUrl).text();
const permissionBackfillUrl = new URL(
  "../../../supabase/migrations/20260715002015_backfill_task_project_permissions.sql",
  import.meta.url,
);
const permissionBackfillSql = await Bun.file(permissionBackfillUrl).text();

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

  test("backfills legacy employee roles without making employees an authorization source", () => {
    expect(permissionBackfillSql).toContain("INSERT INTO public.user_roles");
    expect(permissionBackfillSql).toContain("WHEN 'admin joia' THEN 'admin_joia'::public.app_role");
    expect(permissionBackfillSql).toContain("INSERT INTO public.project_members");
    expect(permissionBackfillSql).not.toContain("cliente_proprietario");
    expect(permissionBackfillSql).not.toContain("CREATE TRIGGER");
  });
});
