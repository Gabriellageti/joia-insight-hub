import { readFileSync } from "node:fs";
import type { Page, Route } from "@playwright/test";

export const id = "20000000-0000-4000-8000-000000000001";
export const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const now = new Date().toISOString();
export const longName = "Empresa de Consultoria e Desenvolvimento Empresarial do Sudeste Ltda";
export const projectName = "Projeto de Reestruturação Financeira e Operacional — Ciclo Extraordinário 2026";
export const viewports = [
  { name: "mobile-small", width: 320, height: 568 }, { name: "mobile", width: 375, height: 667 },
  { name: "mobile-large", width: 430, height: 932 }, { name: "tablet", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 }, { name: "notebook", width: 1280, height: 720 },
  { name: "desktop", width: 1440, height: 900 }, { name: "desktop-large", width: 1920, height: 1080 },
];
export const routes = [...readFileSync("src/App.tsx", "utf8").matchAll(/path="([^"]+)"/g)]
  .map((match) => match[1]).filter((path) => path !== "/*")
  .map((pattern) => ({ pattern, path: pattern === "*" ? "/rota-inexistente" : pattern.replace(/:[^/]+/g, id) }))
  .sort((a, b) => Number(a.path === "/auth") - Number(b.path === "/auth"));

export async function installBackend(page: Page, count = 1, expanded = false) {
  const env = readFileSync(".env", "utf8");
  const url = env.match(/VITE_SUPABASE_URL=["']?([^\s"']+)/)?.[1];
  if (!url) throw new Error("Public Supabase URL required for local fixture");
  const session = { access_token: "responsive-synthetic-token", refresh_token: "responsive-synthetic-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "responsavel.com.nome.muito.longo@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Responsável da Auditoria Responsiva Sintética" }, identities: [], created_at: now, updated_at: now } };
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`, session });
  const common = { id, workspace_id: workspaceId, created_at: now, updated_at: now, created_by: userId };
  const data: Record<string, Record<string, unknown>[]> = {
    workspace_members: [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }],
    user_roles: [{ user_id: userId, role: "admin_joia" }],
    workspaces: [{ id: workspaceId, name: "Workspace sintético", slug: "responsive" }],
    profiles: [{ id: userId, full_name: session.user.user_metadata.full_name, email: session.user.email }],
    project_members: [{ project_id: id, user_id: userId, access_level: "manager" }],
    clients: [{ ...common, name: longName, trade_name: longName, legal_name: longName, status: "ativo", email: session.user.email }],
    projects: [{ ...common, name: projectName, client_id: id, phase: "Estruturação", progress: 40, responsible: session.user.user_metadata.full_name, status: "active" }],
    tasks: Array.from({ length: count }, (_, i) => ({ ...common, id: i ? `30000000-0000-4000-8000-${String(i).padStart(12, "0")}` : id, title: `Tarefa ${i + 1}: Validar conciliação e conferir todas as pendências do ciclo extraordinário`, description: "Descrição sintética " + "Texto longo para verificar responsividade. ".repeat(8), project_id: id, client_id: id, task_type: "project", type: "processo", assigned_to: userId, responsible: session.user.user_metadata.full_name, status: "not_started", priority: "urgent", due_date: now.slice(0, 10), evidence_required: false })),
    meetings: [{ ...common, title: "Reunião de revisão extraordinária do planejamento financeiro e operacional", client_id: id, project_id: id, date: now, duration: "60", participants: [], status: "Agendada", responsible_user_id: userId, notes: "Notas sintéticas" }],
    diagnostic_templates: [{ ...common, name: "Template de Diagnóstico Operacional e Financeiro Completo", type: "diagnostic", status: "draft", sections: [], description: "Template sintético", version: 1 }],
    diagnostics: [{ ...common, name: "Diagnóstico completo de reestruturação operacional", client_id: id, project_id: id, template_id: id, status: "not_started", answers: {}, score: 0 }],
    consulting_reports: [{ ...common, title: "Relatório de consultoria e planejamento extraordinário", client_id: id, project_ids: [id], period_start: "2026-08-01", period_end: "2026-08-31", version_group_id: id, version_number: 1, status: "draft", sections: { executive_summary: "Resumo sintético revisável", considerations: "Considerações sintéticas" }, source_snapshot: {} }],
  };
  if (expanded) Object.assign(data, {
    employees: [{ ...common, user_id: userId, name: session.user.user_metadata.full_name, email: session.user.email, position: "Responsável técnico", status: "active", department: "Operações", role: "consultant" }],
    leads: [{ ...common, name: "Contato da oportunidade sintética com nome extenso", company: longName, stage: "new_lead", probability: 10, value: 123456789.99, responsible_user_id: userId, source: "Indicação de parceiro com descrição extensa", next_action: "Revisar proposta financeira detalhada e confirmar próxima reunião", next_action_date: now.slice(0, 10), service: projectName, notes: "Observações sintéticas", converted_client_id: null }],
    commercial_activities: [{ ...common, lead_id: id, activity_type: "note", title: "Revisão da proposta extraordinária", description: "Nota longa ".repeat(30), happened_at: now }],
    commercial_proposals: [{ ...common, lead_id: id, value: 123456789.99, scope: projectName, proposal_date: now.slice(0, 10), status: "draft" }],
    commercial_follow_ups: [{ ...common, lead_id: id, responsible_user_id: userId, action: "Confirmar todos os detalhes da proposta com o responsável financeiro", due_at: now, completed_at: null }],
    documents: [{ ...common, name: "Relatorio_de_Reestruturacao_Financeira_Operacional_Extraordinaria_2026_Versao_Final_Revisada_Com_Anexos.pdf", display_name: "Relatório extraordinário com revisão detalhada e anexos", description: "Descrição extensa ".repeat(20), client_id: id, project_id: id, uploaded_by: userId, category: "other", tags: ["Revisão extraordinária", "Financeiro"], file_type: "Documento", visibility: "Interno", file_size: 102400, mime_type: "application/pdf", version_group_id: id, version_number: 2, is_current_version: true, storage_path: "synthetic/never-download.pdf", source_provider: "supabase_storage" }],
    project_templates: [{ ...common, name: projectName, description: "Descrição extensa do modelo ".repeat(8), project_type: "consulting", default_phase: "Diagnóstico", is_internal_process: false, status: "published", project_template_stages: [{ count: 4 }], task_templates: [{ count: 12 }] }],
    task_templates: [{ ...common, title: "Tarefa modelo de revisão extraordinária e confirmação de evidências", description: "Descrição sintética", default_priority: "medium", start_offset_days: 0, due_offset_days: 3, initial_status: "not_started", task_template_checklist_items: [] }],
    notifications: [{ ...common, user_id: userId, title: "Revisar todas as pendências operacionais antes do próximo ciclo", body: "Notificação sintética ".repeat(10), notification_type: "task_assigned", priority: "important", read_at: null, action_url: "/plano-acao" }],
  });
  if (!count) for (const key of ["clients", "projects", "tasks", "meetings", "diagnostic_templates", "diagnostics", "consulting_reports"]) data[key] = [];
  const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: Array.isArray(body) ? { "content-range": `0-${Math.max(0, body.length - 1)}/${body.length}`, "access-control-expose-headers": "content-range" } : {}, body: JSON.stringify(body) });
  // Routing disables the browser cache. Reuse the real public font responses within
  // a scenario so 37 navigations do not repeatedly download identical assets.
  const fontResponses = new Map<string, ReturnType<Route["fetch"]>>();
  // Never let this layout audit send data to the real backend or the AI provider.
  await page.route("**/*", async (route) => {
    const request = route.request(); const requestUrl = new URL(request.url());
    if (requestUrl.pathname === "/api/assistant") return respond(route, { enabled: false, code: "AI_ASSISTANT_DISABLED" });
    if (requestUrl.pathname.includes("/auth/v1/")) return respond(route, requestUrl.pathname.endsWith("/user") ? session.user : session);
    if (requestUrl.pathname.includes("/rest/v1/")) {
      const table = requestUrl.pathname.split("/").at(-1)!;
      if (table === "get_operations_dashboard") return respond(route, { scope: "company", periodDays: 30, kpis: { activeProjects: count, riskProjects: 0, lateProjects: 0, openTasks: count, lateTasks: 0, blockedTasks: 0, attentionClients: 0, pendingMeetings: count, weekDeliveries: 0 }, projects: [], clients: [], attention: [], deliveries: [], weekly: { completedTasks: 0, createdTasks: count, newBlocks: 0, completedMeetings: 0 } });
      let rows = data[table] || [];
      const rowId = requestUrl.searchParams.get("id");
      if (rowId?.startsWith("eq.")) rows = rows.filter((row) => row.id === rowId.slice(3));
      if (request.method() === "POST" && !requestUrl.pathname.includes("/rpc/")) { const raw = request.postDataJSON(); rows = (Array.isArray(raw) ? raw : [raw]).map((row) => ({ ...common, ...row })); data[table] = [...(data[table] || []), ...rows]; }
      if (request.method() === "PATCH") { rows.forEach((row) => Object.assign(row, request.postDataJSON())); }
      if (table === "workspaces" || request.headers().accept?.includes("vnd.pgrst.object")) return respond(route, rows[0] || null);
      return respond(route, rows);
    }
    if (["127.0.0.1", "localhost"].includes(requestUrl.hostname)) return route.continue();
    if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(requestUrl.hostname)) {
      if (!fontResponses.has(request.url())) fontResponses.set(request.url(), route.fetch({ timeout: 15_000 }));
      try { return await route.fulfill({ response: await fontResponses.get(request.url())! }); }
      catch { fontResponses.delete(request.url()); return route.continue(); }
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  return data;
}

export async function measure(page: Page) {
  return page.evaluate(() => {
    const outside = [...document.querySelectorAll<HTMLElement>("main button, main input, main h1, main h2, main [role=tablist], main table, main textarea, [role=dialog]")].filter((element) => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return false;
      if (rect.left >= -1 && rect.right <= innerWidth + 1) return false;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        if (["auto", "scroll"].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 1 && parent.clientWidth <= innerWidth) return false;
        parent = parent.parentElement;
      }
      return true;
    }).map((element) => ({ tag: element.tagName, text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 100), class: element.className, width: Math.round(element.getBoundingClientRect().width) }));
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth, outside, heading: document.querySelector("main h1,main h2,h1")?.textContent, text: document.querySelector("main")?.textContent?.slice(0, 220) };
  });
}
