
import { describe, expect, test } from "bun:test";

const migrationUrl = new URL("../../../supabase/migrations/20260714181740_enhance_task_workspace.sql", import.meta.url);
const sql = await Bun.file(migrationUrl).text();
const permissionBackfillUrl = new URL(
  "../../../supabase/migrations/20260715002015_backfill_task_project_permissions.sql",
  import.meta.url,
);
const permissionBackfillSql = await Bun.file(permissionBackfillUrl).text();
const legacyRoleBackfillUrl = new URL(
  "../../../supabase/migrations/20260715020620_backfill_legacy_internal_user_roles.sql",
  import.meta.url,
);
const legacyRoleBackfillSql = await Bun.file(legacyRoleBackfillUrl).text();
const directProjectInsertPolicyUrl = new URL(
  "../../../supabase/migrations/20260715034109_replace_project_insert_role_policy.sql",
  import.meta.url,
);
const directProjectInsertPolicySql = await Bun.file(directProjectInsertPolicyUrl).text();
const consultingPlanningUrl = new URL(
  "../../../supabase/migrations/20260715164107_add_consulting_day_planning.sql",
  import.meta.url,
);
const consultingPlanningSql = await Bun.file(consultingPlanningUrl).text();
const consultingRelationshipUrl = new URL(
  "../../../supabase/migrations/20260715165342_enforce_consulting_day_relationship.sql",
  import.meta.url,
);
const consultingRelationshipSql = await Bun.file(consultingRelationshipUrl).text();

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

  test("restores project creation only for confirmed legacy accounts with least privilege", () => {
    expect(legacyRoleBackfillSql).toContain("'analista'::public.app_role");
    expect(legacyRoleBackfillSql).toContain("auth_user.created_at < TIMESTAMPTZ '2026-07-14 18:17:40+00'");
    expect(legacyRoleBackfillSql).toContain("auth_user.email_confirmed_at IS NOT NULL");
    expect(legacyRoleBackfillSql).toContain("COALESCE(auth_user.is_anonymous, false) = false");
    expect(legacyRoleBackfillSql).toContain("NOT EXISTS");
    expect(legacyRoleBackfillSql).not.toContain("'admin_joia'::public.app_role");
    expect(legacyRoleBackfillSql).not.toContain("CREATE POLICY");
  });

  test("authorizes project inserts from the authenticated user's explicit role", () => {
    expect(directProjectInsertPolicySql).toContain("TO authenticated");
    expect(directProjectInsertPolicySql).toContain("(SELECT auth.uid()) IS NOT NULL");
    expect(directProjectInsertPolicySql).toContain("FROM public.user_roles AS role_entry");
    expect(directProjectInsertPolicySql).toContain("role_entry.user_id = (SELECT auth.uid())");
    expect(directProjectInsertPolicySql).toContain("'analista'::public.app_role");
    expect(directProjectInsertPolicySql).not.toContain("private.user_has_role");
    expect(directProjectInsertPolicySql).not.toContain("WITH CHECK (true)");
    expect(directProjectInsertPolicySql).not.toContain("TO anon");
  });

  test("scopes consulting plans to project membership and backfills without titles", () => {
    expect(consultingPlanningSql).toContain("ALTER TABLE public.consulting_day_plans ENABLE ROW LEVEL SECURITY");
    expect(consultingPlanningSql).toContain("private.user_project_access_level((SELECT auth.uid()), project_id) >= 1");
    expect(consultingPlanningSql).toContain("private.user_project_access_level((SELECT auth.uid()), project_id) >= 3");
    expect(consultingPlanningSql).toContain("task.source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'");
    expect(consultingPlanningSql).toContain("task.source_action_id ~ '(^|-)dia-[1-8](-|$)'");
    expect(consultingPlanningSql).toContain("task.consulting_day IS NULL");
    expect(consultingPlanningSql).not.toContain("task.title");
    expect(consultingPlanningSql).not.toContain("WITH CHECK (true)");
    expect(consultingRelationshipSql).toContain("FOREIGN KEY (project_id, consulting_day)");
    expect(consultingRelationshipSql).toContain("ON DELETE RESTRICT");
  });
});
