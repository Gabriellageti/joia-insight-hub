import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

interface NotifyRequest {
  commentId: string;
}

interface PushError {
  statusCode?: number;
}

const jsonHeaders = { "Content-Type": "application/json" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    ...(allowedOrigins.includes(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), ...jsonHeaders },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, 405, { error: "Método não permitido." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("notify-task-comment: configuração obrigatória ausente");
    return response(request, 503, { error: "Serviço de notificações indisponível." });
  }
  if (!authorization?.startsWith("Bearer ")) return response(request, 401, { error: "Autenticação obrigatória." });

  try {
    const payload = await request.json() as Partial<NotifyRequest>;
    if (!payload.commentId || !uuidPattern.test(payload.commentId)) {
      return response(request, 400, { error: "Comentário inválido." });
    }

    const token = authorization.slice("Bearer ".length);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return response(request, 401, { error: "Sessão inválida ou expirada." });

    // This query deliberately uses the caller's JWT. Task/comment RLS proves the
    // caller can access the task before service-role access is used for delivery.
    const { data: comment, error: commentError } = await userClient
      .from("task_comments")
      .select("id, task_id, user_id, user_name, content")
      .eq("id", payload.commentId)
      .maybeSingle();
    if (commentError || !comment) return response(request, 404, { error: "Comentário não encontrado." });
    if (comment.user_id !== authData.user.id) return response(request, 403, { error: "Você não pode notificar este comentário." });

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: task, error: taskError } = await service
      .from("tasks")
      .select("id, title, created_by, assigned_to")
      .eq("id", comment.task_id)
      .maybeSingle();
    if (taskError || !task) return response(request, 404, { error: "Tarefa não encontrada." });

    const { data: participants, error: participantsError } = await service
      .from("task_comments")
      .select("user_id")
      .eq("task_id", task.id);
    if (participantsError) throw new Error("participants_query_failed");

    const recipientIds = new Set<string>([task.created_by, task.assigned_to]);
    participants?.forEach(({ user_id }) => user_id && recipientIds.add(user_id));
    recipientIds.delete(authData.user.id);
    if (recipientIds.size === 0) return response(request, 200, { message: "Nenhum destinatário elegível." });

    const ids = [...recipientIds];
    const [{ data: preferences }, { data: profiles }] = await Promise.all([
      service.from("notification_preferences").select("user_id, email_notifications, push_notifications").in("user_id", ids),
      service.from("profiles").select("id, full_name").in("id", ids),
    ]);
    const preferenceMap = new Map(preferences?.map((item) => [item.user_id, item]) ?? []);
    const profileMap = new Map(profiles?.map((item) => [item.id, item.full_name]) ?? []);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM");
    let emailsSent = 0;
    let emailsFailed = 0;
    if (resendKey && resendFrom) {
      const resend = new Resend(resendKey);
      await Promise.all(ids.map(async (recipientId) => {
        if (preferenceMap.get(recipientId)?.email_notifications === false) return;
        const { data: claimed } = await service.rpc("claim_task_comment_notification", {
          _comment_id: comment.id, _recipient_id: recipientId, _channel: "email",
        });
        if (!claimed) return;
        try {
          const { data: recipient } = await service.auth.admin.getUserById(recipientId);
          if (!recipient.user?.email) throw new Error("recipient_email_missing");
          const commenterName = escapeHtml(comment.user_name || "Usuário");
          await resend.emails.send({
            from: resendFrom,
            to: [recipient.user.email],
            subject: `Novo comentário na tarefa: ${task.title}`,
            html: `<h2>Novo comentário na tarefa</h2><p><strong>${escapeHtml(task.title)}</strong></p><p><strong>${commenterName}</strong> comentou:</p><p style="white-space:pre-wrap">${escapeHtml(comment.content)}</p>`,
          });
          emailsSent += 1;
        } catch {
          emailsFailed += 1;
          await service.rpc("release_task_comment_notification", {
            _comment_id: comment.id, _recipient_id: recipientId, _channel: "email",
          });
        }
      }));
    }

    let pushSent = 0;
    let pushFailed = 0;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const pushRecipients = ids.filter((id) => preferenceMap.get(id)?.push_notifications === true);
    if (vapidPublicKey && vapidPrivateKey && vapidSubject && pushRecipients.length > 0) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      const { data: subscriptions } = await service.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", pushRecipients);
      await Promise.all((subscriptions ?? []).map(async (subscription) => {
        const { data: claimed } = await service.rpc("claim_task_comment_notification", {
          _comment_id: comment.id, _recipient_id: subscription.user_id, _channel: "push",
        });
        if (!claimed) return;
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            JSON.stringify({ title: `${profileMap.get(authData.user.id) ?? "Alguém"} comentou`, body: comment.content.slice(0, 100), tag: `task-comment-${comment.id}`, data: { url: "/plano-acao", taskId: task.id } }),
          );
          pushSent += 1;
        } catch (error: unknown) {
          pushFailed += 1;
          const statusCode = (error as PushError).statusCode;
          if (statusCode === 404 || statusCode === 410) await service.from("push_subscriptions").delete().eq("id", subscription.id);
          await service.rpc("release_task_comment_notification", {
            _comment_id: comment.id, _recipient_id: subscription.user_id, _channel: "push",
          });
        }
      }));
    }

    console.log("notify-task-comment concluída", { recipientCount: ids.length, emailsSent, emailsFailed, pushSent, pushFailed });
    return response(request, 200, { message: "Notificações processadas.", emailsSent, emailsFailed, pushSent, pushFailed });
  } catch {
    console.error("notify-task-comment: falha interna");
    return response(request, 500, { error: "Não foi possível processar as notificações." });
  }
});
