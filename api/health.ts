const TIMEOUT_MS = 3_000;
const MAX_SCHEDULER_AGE_MS = 10 * 60 * 1_000;

function response(body: unknown, status: number, requestId: string) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": requestId,
    },
  });
}

async function handle(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response({ status: "error", requestId }, 405, requestId);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("health_check_failed", { requestId, reason: "missing_configuration" });
    return response({ status: "degraded", requestId, components: { api: "healthy", database: "unknown", automation: "unknown" } }, 503, requestId);
  }

  try {
    const healthResponse = await fetch(
      `${supabaseUrl}/rest/v1/system_health_components?select=component,status,checked_at&component=eq.automation-scheduler`,
      {
        headers: { apikey: supabaseKey, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (!healthResponse.ok) throw new Error(`database_status_${healthResponse.status}`);
    const rows = await healthResponse.json() as Array<{ status?: string; checked_at?: string }>;
    const scheduler = rows[0];
    const schedulerAge = scheduler?.checked_at ? Date.now() - new Date(scheduler.checked_at).getTime() : Number.POSITIVE_INFINITY;
    const automationHealthy = scheduler?.status === "healthy" && schedulerAge <= MAX_SCHEDULER_AGE_MS;
    const status = automationHealthy ? "healthy" : "degraded";
    const statusCode = automationHealthy ? 200 : 503;
    console.info("health_check_completed", { requestId, status, durationMs: Date.now() - startedAt });
    return response({
      status,
      requestId,
      checkedAt: new Date().toISOString(),
      components: { api: "healthy", database: "healthy", automation: automationHealthy ? "healthy" : "degraded" },
    }, statusCode, requestId);
  } catch (error) {
    console.error("health_check_failed", {
      requestId,
      reason: error instanceof Error ? error.name : "unknown",
      durationMs: Date.now() - startedAt,
    });
    return response({
      status: "degraded",
      requestId,
      checkedAt: new Date().toISOString(),
      components: { api: "healthy", database: "degraded", automation: "unknown" },
    }, 503, requestId);
  }
}

export default { fetch: handle };
