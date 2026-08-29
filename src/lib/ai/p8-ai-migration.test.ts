import { describe, expect, test } from "bun:test";

const migration = await Bun.file("supabase/migrations/20260829090000_p8_ai_assistant.sql").text();
const grants = await Bun.file("supabase/migrations/20260829090500_p8_revoke_ai_interaction_writes.sql").text();
const endpoint = await Bun.file("api/assistant.ts").text();

describe("P8 Assistente JoIA", () => {
  test("builds context through the authenticated RLS session", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("private.workspace_access_level(v_workspace)");
    for (const source of ["public.tasks", "public.projects", "public.meetings", "public.meeting_decisions", "public.documents", "public.consulting_reports"]) expect(migration).toContain(source);
    expect(endpoint).toContain("Authorization: authorization");
    expect(endpoint).not.toContain("SERVICE_ROLE");
  });
  test("persists every generation before calling the model", () => {
    expect(endpoint.indexOf('rpc("begin_ai_interaction"')).toBeLessThan(endpoint.indexOf("generateText({"));
    expect(migration).toContain("CREATE TABLE public.ai_interactions");
    expect(migration).toContain("input_tokens");
    expect(migration).toContain("output_tokens");
  });
  test("keeps suggested tasks behind human review", () => {
    expect(endpoint).toContain("suggestedTasks");
    expect(endpoint).toContain("nunca afirmar que criou");
    expect(endpoint).not.toContain(".from(\"tasks\").insert");
  });
  test("protects audit data and server functions", () => {
    expect(migration).toContain("ai_interactions_owner_select");
    expect(migration).toContain("REVOKE ALL ON public.ai_interactions FROM anon");
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(grants).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER");
  });
});
