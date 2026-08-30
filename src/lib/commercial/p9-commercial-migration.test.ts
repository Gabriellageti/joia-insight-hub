import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20260829100000_p9_commercial_crm.sql", "utf8");
const stagesSql = readFileSync("supabase/migrations/20260829100500_p9_customizable_pipeline_stages.sql", "utf8");

describe("P9 commercial CRM migration", () => {
  test("evolves leads without reusing diagnostic opportunities", () => {
    expect(sql).toContain("ALTER TABLE public.leads");
    expect(sql).not.toContain("ALTER TABLE public.opportunities");
    expect(sql).toContain("leads_stage_check");
  });

  test("prepares stages for workspace customization", () => {
    expect(stagesSql).toContain("CREATE TABLE public.commercial_pipeline_stages");
    expect(stagesSql).toContain("FOREIGN KEY (workspace_id,stage)");
    expect(stagesSql).toContain("commercial_pipeline_stages_manager_update");
  });

  test("provides a traceable pipeline, proposals and follow-ups", () => {
    expect(sql).toContain("CREATE TABLE public.commercial_activities");
    expect(sql).toContain("CREATE TABLE public.commercial_proposals");
    expect(sql).toContain("CREATE TABLE public.commercial_follow_ups");
    expect(sql).toContain("commercial_lead_audit");
  });

  test("keeps follow-ups idempotent and visible to the responsible user", () => {
    expect(sql).toContain("commercial_follow_ups_one_open_idx");
    expect(sql).toContain("responsible_user_id = (SELECT auth.uid())");
    expect(sql).toContain("schedule_commercial_follow_up");
  });

  test("checks duplicates and requires an explicit conversion", () => {
    expect(sql).toContain("find_lead_client_duplicates");
    expect(sql).toContain("only won opportunities can be converted");
    expect(sql).toContain("possible duplicate client; review before conversion");
  });

  test("uses workspace RLS and blocks anonymous access", () => {
    expect(sql).toContain("private.workspace_access_level(workspace_id)");
    expect(sql).toContain("REVOKE ALL ON public.commercial_activities,public.commercial_proposals,public.commercial_follow_ups FROM anon");
    expect(sql).not.toContain("SERVICE_ROLE");
  });
});
