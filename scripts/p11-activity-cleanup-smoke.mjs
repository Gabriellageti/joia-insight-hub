import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !secret) throw new Error("Server-side test credentials required");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
const run = `p11-e2e-cleanup-${randomUUID()}`;
const evidence = { run, at: new Date().toISOString(), checks: [] };
const fixtures = []; const entities = [];
let initialAuditIds = [];
const ok = (response) => { if (response.error) throw new Error(`${response.error.code || "request"}:${response.error.message}`); return response.data; };
const insert = async (table, value) => {
  const row = ok(await admin.from(table).insert(value).select("id").single());
  entities.push({ table, id: row.id }); return row.id;
};
try {
  for (const role of ["admin", "viewer"]) {
    const email = `${run}-${role}@example.invalid`; const password = `${randomUUID()}Aa1!`;
    const user = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { full_name: `P11-E2E-${role}` } })).user;
    const fixture = { userId: user.id }; fixtures.push(fixture);
    const workspace = ok(await admin.from("workspaces").insert({ name: `P11-E2E-${role}`, slug: `${run}-${role}`, created_by: user.id }).select("id").single());
    fixture.workspaceId = workspace.id;
    ok(await admin.from("workspace_members").insert({ workspace_id: workspace.id, user_id: user.id, role, is_default: true }));
    fixture.client = createClient(url, key, options);
    fixture.token = ok(await fixture.client.auth.signInWithPassword({ email, password })).session.access_token;
  }
  const [a, b] = fixtures;
  const clientId = await insert("clients", { name: "P11-E2E-Cleanup Client", workspace_id: a.workspaceId });
  const projectId = await insert("projects", { name: "P11-E2E-Cleanup Project", client_id: clientId, workspace_id: a.workspaceId });
  ok(await admin.from("project_members").insert({ project_id: projectId, user_id: a.userId, access_level: "manager" }));
  const taskId = await insert("tasks", { title: "P11-E2E-Cleanup Task", client_id: clientId, project_id: projectId, workspace_id: a.workspaceId });
  ok(await a.client.from("tasks").update({ title: "P11-E2E-Cleanup Task updated" }).eq("id", taskId).select("id").single());
  ok(await a.client.from("tasks").delete().eq("id", taskId));
  assert.deepEqual(ok(await admin.from("tasks").select("id").eq("id", taskId)), []);
  const deletion = ok(await admin.from("activity_logs").select("id,task_id,metadata").eq("entity_id", taskId).eq("action_type", "tasks_delete").single());
  assert.equal(deletion.task_id, null);
  assert.equal(deletion.metadata.references.task_id, taskId);
  assert.equal(deletion.metadata.entity_snapshot.title, "P11-E2E-Cleanup Task updated");
  evidence.checks.push("authenticated_task_delete_and_snapshot");
  const meetingId = await insert("meetings", { title: "P11-E2E-Cleanup Meeting", client_id: clientId, project_id: projectId, workspace_id: a.workspaceId, date: new Date().toISOString() });
  await insert("meeting_agenda_items", { meeting_id: meetingId, title: "P11-E2E-Agenda" });
  await insert("meeting_decisions", { meeting_id: meetingId, description: "P11-E2E-Decision" });
  await insert("meeting_next_steps", { meeting_id: meetingId, description: "P11-E2E-Next" });
  ok(await a.client.from("meetings").delete().eq("id", meetingId));
  assert.deepEqual(ok(await admin.from("meetings").select("id").eq("id", meetingId)), []);
  evidence.checks.push("authenticated_meeting_delete_with_children");
  const audits = ok(await a.client.from("activity_logs").select("id").eq("workspace_id", a.workspaceId));
  assert.ok(audits.length >= 13);
  initialAuditIds = audits.map((row) => row.id);
  assert.deepEqual(ok(await b.client.from("activity_logs").select("id").in("id", initialAuditIds)), []);
  for (const response of [
    await a.client.from("activity_logs").update({ title: "P11-E2E-forbidden" }).eq("id", randomUUID()),
    await a.client.from("activity_logs").delete().eq("id", randomUUID()),
  ]) assert.equal(response.error?.code, "42501");
  evidence.checks.push("cross_workspace_denied", "audit_mutations_denied");
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "FAIL";
  throw error;
} finally {
  const errors = [];
  // Exact recorded IDs only. Leave all audit rows intact, including deletion events.
  for (const entity of entities.reverse()) {
    const result = await admin.from(entity.table).delete().eq("id", entity.id);
    if (result.error) errors.push(`${entity.table}:${result.error.code}`);
    const check = await admin.from(entity.table).select("id").eq("id", entity.id);
    if (check.error || check.data.length) errors.push(`${entity.table}:remaining`);
  }
  for (const fixture of fixtures) {
    if (fixture.token) {
      const signedOut = await admin.auth.admin.signOut(fixture.token, "global");
      if (signedOut.error) errors.push("signout_failed");
    }
    if (fixture.workspaceId) {
      const result = await admin.from("workspaces").delete().eq("id", fixture.workspaceId);
      if (result.error) errors.push(`workspace:${result.error.code}`);
      const check = await admin.from("workspaces").select("id").eq("id", fixture.workspaceId);
      if (check.error || check.data.length) errors.push("workspace_remaining");
    }
    const result = await admin.auth.admin.deleteUser(fixture.userId);
    if (result.error) errors.push(`user:${result.error.code || "failed"}`);
    if ((await admin.auth.admin.getUserById(fixture.userId)).data.user) errors.push("user_remaining");
  }
  if (initialAuditIds.length) {
    const retained = ok(await admin.from("activity_logs").select("id,workspace_id,actor_id,metadata").in("id", initialAuditIds));
    if (retained.length !== initialAuditIds.length) errors.push("audit_lost");
    if (retained.some((row) => row.workspace_id !== null || row.actor_id !== null || row.metadata.environment !== "e2e" || !row.metadata.references.workspace_id)) errors.push("audit_context_invalid");
    const historical = await admin.from("activity_logs").select("id", { count: "exact", head: true }).contains("metadata", { test_run_id: `${run}-admin` });
    if (historical.error) errors.push("audit_count_failed");
    evidence.initialEventsRetained = retained.length;
    evidence.totalEventsRetained = historical.count;
    evidence.auditVisibility = "server-only after workspace deletion";
  }
  evidence.cleanup = { result: errors.length ? "FAIL" : "PASS", errors,
    userIds: fixtures.map((f) => f.userId), workspaceIds: fixtures.map((f) => f.workspaceId), entities };
  if (errors.length) evidence.result = "FAIL";
  console.log(JSON.stringify(evidence, null, 2));
  if (errors.length) throw new Error(`P11_CLEANUP_FAILED:${errors.join(",")}`);
}
