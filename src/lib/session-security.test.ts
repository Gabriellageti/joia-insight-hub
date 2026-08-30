import { describe, expect, test } from "bun:test";
import { clearSensitiveLocalState, type BrowserStorageLike } from "./session-security";

function storage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  const api: BrowserStorageLike = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
  };
  return { api, values };
}

describe("session security", () => {
  test("removes confidential meeting drafts without deleting install preferences", () => {
    const state = storage({
      "joia:meeting-notes:meeting-a": "confidential",
      "joia:pwa-install-dismissed-at:v1": "123",
      "supabase.auth.token": "managed-by-supabase",
    });
    expect(clearSensitiveLocalState(state.api)).toBe(1);
    expect(state.values.has("joia:meeting-notes:meeting-a")).toBe(false);
    expect(state.values.has("joia:pwa-install-dismissed-at:v1")).toBe(true);
    expect(state.values.has("supabase.auth.token")).toBe(true);
  });
});
