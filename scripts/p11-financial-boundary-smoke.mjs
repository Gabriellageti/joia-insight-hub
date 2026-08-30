import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !secret) throw new Error("Server-side test credentials required");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
const run = `p11-e2e-financial-${randomUUID()}`;
const fixtures = [];
const evidence = { run, at: new Date().toISOString(), checks: [], cleanup: [] };
const requireOk = (response) => { if (response.error) throw new Error(response.error.code || "request_failed"); return response.data; };
try {
  // No company records are read or changed. An impossible ID limits positive
  // server checks; denied reads are required to return 42501, not empty RLS rows.
  const absentId = randomUUID();
  const server = await admin.from("financial_recurring_rules").select("id").eq("id", absentId);
  assert.equal(server.error, null);
  assert.deepEqual(server.data, []);
  evidence.checks.push({ role: "service_role", result: "PASS", http: server.status, scope: "read authorization, nonexistent ID" });
  for (const role of ["admin", "manager", "member", "viewer"]) {
    const email = `${run}-${role}@example.invalid`;
    const password = `${randomUUID()}Aa1!`;
    const user = requireOk(await admin.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { full_name: `P11-E2E-${role}` } })).user;
    const fixture = { userId: user.id, role }; fixtures.push(fixture);
    const workspace = requireOk(await admin.from("workspaces").insert({ name: `P11-E2E-${role}`, slug: `${run}-${role}`, created_by: user.id }).select("id").single());
    fixture.workspaceId = workspace.id;
    requireOk(await admin.from("workspace_members").insert({ workspace_id: workspace.id, user_id: user.id, role, is_default: true }));
    const client = createClient(url, key, options);
    const login = requireOk(await client.auth.signInWithPassword({ email, password }));
    fixture.token = login.session.access_token;
    const read = await client.from("financial_recurring_rules").select("id").eq("id", absentId);
    assert.equal(read.error?.code, "42501");
    assert.equal(read.status, 403);
    evidence.checks.push({ role, result: "PASS", http: read.status, code: read.error.code });
  }
  const anonymous = createClient(url, key, options);
  const read = await anonymous.from("financial_recurring_rules").select("id").eq("id", absentId);
  assert.equal(read.error?.code, "42501");
  evidence.checks.push({ role: "anon", result: "PASS", http: read.status, code: read.error.code });
} finally {
  const errors = [];
  for (const fixture of fixtures.reverse()) {
    if (fixture.token) {
      const response = await admin.auth.admin.signOut(fixture.token, "global");
      if (response.error) errors.push(`signout:${response.error.code || "failed"}`);
    }
    if (fixture.workspaceId) {
      const response = await admin.from("workspaces").delete().eq("id", fixture.workspaceId);
      if (response.error) errors.push(`workspace:${response.error.code}`);
      const check = await admin.from("workspaces").select("id").eq("id", fixture.workspaceId);
      if (check.error || check.data.length) errors.push("workspace_remaining");
    }
    const response = await admin.auth.admin.deleteUser(fixture.userId);
    if (response.error) errors.push(`user:${response.error.code || "failed"}`);
    const check = await admin.auth.admin.getUserById(fixture.userId);
    if (check.data.user) errors.push("user_remaining");
    evidence.cleanup.push({ userId: fixture.userId, workspaceId: fixture.workspaceId });
  }
  evidence.cleanupResult = errors.length ? "FAIL" : "PASS";
  console.log(JSON.stringify(evidence, null, 2));
  if (errors.length) throw new Error(`P11_CLEANUP_FAILED:${errors.join(",")}`);
}
