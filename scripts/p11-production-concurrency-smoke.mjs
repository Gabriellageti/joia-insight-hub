import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publicKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !secretKey) throw new Error("Variáveis Supabase ausentes");
const admin = createClient(url, secretKey, { auth: { persistSession: false } });
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const email = `p11-concurrency-${suffix}@example.invalid`;
const password = `P11-${randomUUID()}-aA1!`;
let userId;
let workspaceId;

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("usuário não criado");
  userId = created.data.user.id;
  const workspace = await admin.from("workspaces").insert({ name: `P11 Concurrency ${suffix}`, slug: `p11-concurrency-${suffix}`, created_by: userId }).select("id").single();
  if (workspace.error || !workspace.data) throw workspace.error || new Error("workspace não criado");
  workspaceId = workspace.data.id;
  const member = await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner", is_default: true, created_by: userId });
  if (member.error) throw member.error;

  const clients = [0, 1].map(() => createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } }));
  for (const client of clients) {
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
  }

  const stage = await admin.from("commercial_pipeline_stages").insert({ workspace_id: workspaceId, key: "won", label: "Ganho", position: 1, default_probability: 100 });
  if (stage.error) throw stage.error;
  const lead = await admin.from("leads").insert({ workspace_id: workspaceId, name: "P11 Lead", company: `Empresa ${suffix}`, stage: "won", probability: 100, created_by: userId }).select("id").single();
  if (lead.error || !lead.data) throw lead.error || new Error("lead não criado");
  const conversions = await Promise.all(clients.map((client) => client.rpc("convert_lead_to_client", { p_lead_id: lead.data.id, p_existing_client_id: null })));
  if (conversions.some((item) => item.error)) throw conversions.find((item) => item.error).error;
  const conversionIds = conversions.map((item) => item.data);
  const convertedLead = await admin.from("leads").select("converted_client_id").eq("id", lead.data.id).single();
  const conversionActivities = await admin.from("commercial_activities").select("id", { count: "exact", head: true }).eq("lead_id", lead.data.id).eq("activity_type", "conversion");
  const crmPass = new Set(conversionIds).size === 1 && conversionIds[0] === convertedLead.data?.converted_client_id && conversionActivities.count === 1;

  const project = await admin.from("projects").insert({ workspace_id: workspaceId, name: "P11 Projeto" }).select("id").single();
  const template = await admin.from("project_templates").insert({ workspace_id: workspaceId, name: "P11 Modelo", status: "published", created_by: userId }).select("id").single();
  if (project.error || template.error || !project.data || !template.data) throw project.error || template.error || new Error("template/projeto ausente");
  const projectMember = await admin.from("project_members").insert({ project_id: project.data.id, user_id: userId, access_level: "manager", created_by: userId });
  const taskTemplate = await admin.from("task_templates").insert({ workspace_id: workspaceId, project_template_id: template.data.id, title: "P11 Tarefa Única", default_assignee_id: userId, created_by: userId }).select("id").single();
  if (projectMember.error || taskTemplate.error || !taskTemplate.data) throw projectMember.error || taskTemplate.error || new Error("fixture do modelo ausente");
  const applications = await Promise.all(clients.map((client) => client.rpc("apply_project_template", { p_template_id: template.data.id, p_project_id: project.data.id, p_start_date: "2026-08-29", p_fallback_assignee: userId })));
  if (applications.some((item) => item.error)) throw applications.find((item) => item.error).error;
  const taskCount = await admin.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", project.data.id).eq("source_task_template_id", taskTemplate.data.id);
  const instantiationCount = await admin.from("project_template_instantiations").select("id", { count: "exact", head: true }).eq("project_id", project.data.id);
  const templatePass = taskCount.count === 1 && instantiationCount.count === 1 && applications.map((item) => item.data).reduce((sum, value) => sum + Number(value), 0) === 1;

  console.log(JSON.stringify({ result: crmPass && templatePass ? "PASS" : "FAIL", crm: { pass: crmPass, sameClient: new Set(conversionIds).size === 1, activityCount: conversionActivities.count }, template: { pass: templatePass, taskCount: taskCount.count, instantiationCount: instantiationCount.count, createdAcrossCalls: applications.map((item) => item.data) } }));
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
