import { describe, expect, test } from "bun:test";

const sql = await Bun.file("supabase/migrations/20260829070000_p6_intelligent_notifications.sql").text();

describe("P6 intelligent notifications", () => {
  test("evolves the existing internal notification source", () => {
    expect(sql).toContain("ALTER TABLE public.internal_notifications");
    expect(sql).not.toContain("CREATE TABLE public.notifications");
    expect(sql).toContain("priority text");
    expect(sql).toContain("action_url text");
  });
  test("covers every requested operational signal", () => {
    for (const type of ["task_assigned", "due_soon", "overdue", "blocked", "mention", "comment", "meeting_upcoming", "meeting_unfinished", "project_risk", "client_attention"]) expect(sql).toContain(type);
  });
  test("deduplicates without reopening persistent unread state", () => {
    expect(sql).toContain("CONFLICT(user_id,dedupe_key)");
    expect(sql).toContain("internal_notifications.resolved_at IS NOT NULL");
    expect(sql).toContain("resolved_at=NULL");
  });
  test("keeps external channels prepared but inactive", () => {
    expect(sql).toContain("delivery_channels jsonb");
    expect(sql).toContain("channel_config jsonb");
    expect(sql).not.toContain("http_post");
    expect(sql).not.toContain("net.http");
  });
  test("uses preferences and immutable server-authored content", () => {
    expect(sql).toContain("private.notification_enabled");
    expect(sql).toContain("only notification read state can be changed");
    expect(sql).toContain("SECURITY DEFINER");
  });
});
