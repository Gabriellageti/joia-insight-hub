import { describe, expect, it } from "bun:test";
import { buildMeetingSummary, getMeetingCompletionWarnings, isMeetingStale } from "./meetings";
import type { MeetingOperationalData } from "@/integrations/supabase/meetings";

const base = {
  meeting: { id: "m1", title: "Alinhamento", status: "Em andamento", date: "2026-08-28T12:00:00Z", notes: null },
  agendaItems: [{ discussed: false }], decisions: [], nextSteps: [], participants: [], tasks: [], documents: [], activities: [],
} as unknown as MeetingOperationalData;

describe("meeting operations", () => {
  it("warns before finishing an incomplete meeting", () => {
    expect(getMeetingCompletionWarnings(base)).toHaveLength(4);
  });

  it("detects scheduled meetings left in the past", () => {
    expect(isMeetingStale({ status: "Agendada", date: "2026-08-27T12:00:00Z" }, new Date("2026-08-28T12:00:00Z"))).toBe(true);
    expect(isMeetingStale({ status: "Realizada", date: "2026-08-27T12:00:00Z" }, new Date("2026-08-28T12:00:00Z"))).toBe(false);
  });

  it("builds a copyable summary", () => {
    expect(buildMeetingSummary(base)).toContain("Alinhamento");
    expect(buildMeetingSummary(base)).toContain("Nenhuma decisão registrada");
  });
});
