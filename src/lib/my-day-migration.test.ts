import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../supabase/migrations/20260828212603_p1_my_day_operational_routine.sql", import.meta.url), "utf8");
const grantsMigration = readFileSync(new URL("../../supabase/migrations/20260828214544_p1_my_day_least_privilege_grants.sql", import.meta.url), "utf8");

describe("P1 Meu Dia migration", () => {
  test("creates one daily check-in and focus records without copying tasks", () => {
    expect(migration).toContain("CONSTRAINT daily_checkins_user_date_key UNIQUE (user_id, checkin_date)");
    expect(migration).toContain("task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE");
    expect(migration).not.toContain("CREATE TABLE public.my_day_tasks");
  });

  test("keeps personal operational data behind ownership RLS", () => {
    for (const table of ["daily_checkins", "daily_focus_tasks", "internal_notifications"]) {
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(migration).toContain("USING ((SELECT auth.uid()) = user_id)");
    expect(migration).toContain("only assigned tasks can be added to daily focus");
    expect(migration).toContain("only notification read state can be changed");
  });

  test("adds the personal queue and attention indexes", () => {
    expect(migration).toContain("tasks_assignee_operational_idx");
    expect(migration).toContain("tasks_client_attention_idx");
    expect(migration).toContain("tasks_project_attention_idx");
  });

  test("builds internal alerts on the backend", () => {
    expect(migration).toContain("refresh_my_task_notifications");
    expect(migration).toContain("notify_task_operational_change");
    expect(migration).toContain("notify_task_comment");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.refresh_my_task_notifications() FROM PUBLIC, anon");
  });

  test("revokes permissive project defaults before granting least privilege", () => {
    expect(grantsMigration).toContain("REVOKE ALL ON TABLE public.daily_checkins FROM authenticated");
    expect(grantsMigration).toContain("GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_checkins TO authenticated");
    expect(grantsMigration).toContain("GRANT SELECT, UPDATE ON TABLE public.internal_notifications TO authenticated");
    expect(grantsMigration).not.toContain("GRANT ALL");
  });
});
