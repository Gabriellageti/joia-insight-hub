import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publicKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !secretKey) throw new Error("Variáveis Supabase ausentes");
const admin = createClient(url, secretKey, { auth: { persistSession: false } });
const fixtures = [];
const uploadedPaths = [];

async function identity(label) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `p11-storage-${label}-${suffix}@example.invalid`;
  const password = `P11-${randomUUID()}-aA1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("usuário não criado");
  const userId = created.data.user.id;
  const workspace = await admin.from("workspaces").insert({
    name: `P11 Storage ${label} ${suffix}`, slug: `p11-storage-${label}-${suffix}`, created_by: userId,
  }).select("id").single();
  if (workspace.error || !workspace.data) throw workspace.error || new Error("workspace não criado");
  const workspaceId = workspace.data.id;
  const member = await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner", is_default: true, created_by: userId });
  if (member.error) throw member.error;
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  fixtures.push({ userId, workspaceId });
  return { client, userId, workspaceId };
}

try {
  const a = await identity("a");
  const b = await identity("b");
  const versionGroup = randomUUID();
  const pathV1 = `${a.workspaceId}/${versionGroup}/v1.txt`;
  const pathV2 = `${a.workspaceId}/${versionGroup}/v2.txt`;
  let previousVersionId = null;
  for (const [path, version, current] of [[pathV1, 1, false], [pathV2, 2, true]]) {
    const uploaded = await a.client.storage.from("documents").upload(path, new Blob([`P11 synthetic version ${version}`], { type: "text/plain" }));
    if (uploaded.error) throw uploaded.error;
    uploadedPaths.push(path);
    const metadata = await a.client.from("documents").insert({
      workspace_id: a.workspaceId, name: `v${version}.txt`, display_name: `P11 versão ${version}`,
      storage_path: path, version_group_id: versionGroup, version_number: version,
      previous_version_id: previousVersionId,
      is_current_version: current, source_provider: "supabase_storage", uploaded_by: a.userId,
    }).select("id").single();
    if (metadata.error) throw metadata.error;
    previousVersionId = metadata.data.id;
  }

  const signedA = await a.client.storage.from("documents").createSignedUrl(pathV2, 60);
  const fetchA = signedA.data?.signedUrl ? await fetch(signedA.data.signedUrl) : null;
  const signedB = await b.client.storage.from("documents").createSignedUrl(pathV2, 60);
  const knownPathB = await b.client.storage.from("documents").download(pathV2);
  const oldVersionB = await b.client.storage.from("documents").createSignedUrl(pathV1, 60);
  const expiring = await a.client.storage.from("documents").createSignedUrl(pathV2, 1);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const expiredFetch = expiring.data?.signedUrl ? await fetch(expiring.data.signedUrl) : null;

  const result = {
    signedUrlA: Boolean(fetchA?.ok),
    userBCannotSign: Boolean(signedB.error),
    knownPathBlocked: Boolean(knownPathB.error),
    oldVersionBlockedForB: Boolean(oldVersionB.error),
    expirationEnforced: Boolean(expiredFetch && !expiredFetch.ok),
  };
  console.log(JSON.stringify({ result: Object.values(result).every(Boolean) ? "PASS" : "FAIL", ...result }));
} finally {
  const cleanupErrors = [];
  if (uploadedPaths.length) {
    const removed = await admin.storage.from("documents").remove(uploadedPaths);
    if (removed.error) cleanupErrors.push(`storage:${removed.error.message}`);
  }
  for (const fixture of fixtures.reverse()) {
    const workspace = await admin.from("workspaces").delete().eq("id", fixture.workspaceId);
    if (workspace.error) cleanupErrors.push(`workspace:${workspace.error.code || "unknown"}`);
    const user = await admin.auth.admin.deleteUser(fixture.userId);
    if (user.error) cleanupErrors.push(`user:${user.error.code || "unknown"}`);
  }
  if (cleanupErrors.length) throw new Error(`P11_FIXTURE_CLEANUP_FAILED:${cleanupErrors.join(",")}`);
}
