import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Do not create fixtures or attempt generation for an intentionally disabled feature.
if (process.env.AI_ASSISTANT_ENABLED !== "true") {
  console.log(JSON.stringify({ enabled: false, code: "AI_ASSISTANT_DISABLED", checks: [] }));
  process.exit(0);
}

const deployment = process.env.P11_DEPLOYMENT;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const phase = process.env.P11_PHASE || "unspecified";

if (!deployment || !supabaseUrl || !publishableKey || !secretKey) {
  throw new Error("P11_DEPLOYMENT e as variáveis Supabase do servidor são obrigatórias");
}

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = randomUUID().replaceAll("-", "").slice(0, 14);
const email = `p11-smoke-${suffix}@example.invalid`;
const password = `P11-${randomUUID()}-aA1!`;
let userId;
let workspaceId;

function vercelRequest(path, accessToken, body) {
  const requestId = `p11-${phase}-${randomUUID()}`;
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "p11-smoke-"));
  const bodyPath = join(temporaryDirectory, "request.json");
  writeFileSync(bodyPath, JSON.stringify(body), { encoding: "utf8", mode: 0o600 });
  const args = [
    "curl", path,
    "--deployment", deployment,
    "--yes", "--",
    "--silent", "--show-error", "--request", "POST",
    "--header", "Content-Type: application/json",
    "--header", `Authorization: Bearer ${accessToken}`,
    "--header", `X-Request-Id: ${requestId}`,
    "--data-binary", `@${bodyPath}`,
  ];
  try {
    const vercelCli = process.platform === "win32"
      ? join(dirname(process.execPath), "node_modules", "vercel", "dist", "vc.js")
      : null;
    const result = vercelCli
      ? spawnSync(process.execPath, [vercelCli, ...args], { cwd: process.cwd(), encoding: "utf8", windowsHide: true })
      : spawnSync("npx", ["vercel", ...args], { cwd: process.cwd(), encoding: "utf8" });
    if (result.status !== 0) {
      const safeError = String(result.stderr || result.error?.message || "sem diagnóstico")
        .replace(/eyJ[A-Za-z0-9._-]+/g, "[REDACTED]").slice(0, 1000);
      throw new Error(`vercel curl falhou (exit ${result.status ?? "spawn"}): ${safeError}`);
    }
    const response = JSON.parse(result.stdout.trim());
    return { requestId, response };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `P11 Smoke ${suffix}` },
  });
  if (createError || !created.user) throw createError || new Error("usuário não criado");
  userId = created.user.id;

  const { data: workspace, error: workspaceError } = await admin.from("workspaces")
    .insert({ name: `P11 Smoke ${suffix}`, slug: `p11-smoke-${suffix}`, created_by: userId })
    .select("id").single();
  if (workspaceError || !workspace) throw workspaceError || new Error("workspace não criado");
  workspaceId = workspace.id;

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId, user_id: userId, role: "owner", is_default: true, created_by: userId,
  });
  if (memberError) throw memberError;

  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError || !session.session) throw signInError || new Error("login sintético falhou");

  const { requestId, response } = vercelRequest("/api/assistant", session.session.access_token, {
    question: "Resuma apenas o contexto operacional autorizado deste workspace de teste.",
    scope: {}, history: [],
  });
  if (!response.interactionId || !["ai", "fallback"].includes(response.mode)) {
    throw new Error(`resposta inesperada: ${response.error || "sem interactionId/mode"}`);
  }

  const { data: audit, error: auditError } = await admin.from("ai_interactions")
    .select("id,user_id,workspace_id,status,mode,completed_at,error_message")
    .eq("id", response.interactionId).single();
  if (auditError || !audit) throw auditError || new Error("auditoria ausente");
  if (audit.user_id !== userId || audit.workspace_id !== workspaceId || audit.status !== "success" || !audit.completed_at) {
    throw new Error("auditoria não foi concluída de forma íntegra");
  }

  const { error: forbiddenCompletion } = await userClient.rpc("complete_ai_interaction", {
    p_interaction_id: response.interactionId,
    p_user_id: userId,
    p_status: "success",
    p_answer: "tentativa do navegador",
  });

  let rateLimited = null;
  if (process.env.P11_TEST_RATE_LIMIT === "1") {
    for (let index = 0; index < 9; index += 1) {
      const { error } = await userClient.rpc("begin_ai_interaction", {
        p_question: `Teste sintético de limite ${index + 1}`,
        p_scope: {},
      });
      if (error) throw new Error(`preparo do rate limit falhou: ${error.code || "unknown"}`);
    }
    const limited = vercelRequest("/api/assistant", session.session.access_token, {
      question: "Esta solicitação deve atingir o limite temporário.", scope: {}, history: [],
    });
    rateLimited = limited.response.error === "Limite temporário do assistente atingido";
    if (!rateLimited) throw new Error("a 11ª solicitação não foi limitada");
  }

  console.log(JSON.stringify({
    phase,
    result: "PASS",
    requestId,
    responseMode: response.mode,
    auditStatus: audit.status,
    auditCompleted: Boolean(audit.completed_at),
    providerOutcome: audit.error_message || "AI succeeded",
    authenticatedCompletionBlocked: Boolean(forbiddenCompletion),
    rateLimited,
  }));
} finally {
  const cleanupErrors = [];
  if (workspaceId) {
    const removed = await admin.from("workspaces").delete().eq("id", workspaceId);
    if (removed.error) cleanupErrors.push(`workspace:${removed.error.code || "unknown"}`);
  }
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) cleanupErrors.push(`user:${removed.error.code || "unknown"}`);
  }
  if (cleanupErrors.length) throw new Error(`P11_FIXTURE_CLEANUP_FAILED:${cleanupErrors.join(",")}`);
}
