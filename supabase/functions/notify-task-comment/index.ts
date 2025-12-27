import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  taskId: string;
  taskTitle: string;
  commentContent: string;
  commenterName: string;
  commenterId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { taskId, taskTitle, commentContent, commenterName, commenterId }: NotifyRequest = await req.json();

    console.log(`Processing notification for task ${taskId}, comment by ${commenterName}`);

    // Get task details to find the responsible user
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("responsible, project_id")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      console.error("Error fetching task:", taskError);
      throw taskError;
    }

    if (!task) {
      console.log("Task not found");
      return new Response(JSON.stringify({ message: "Task not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users who have commented on this task (to notify them)
    const { data: commenters, error: commentersError } = await supabase
      .from("task_comments")
      .select("user_id")
      .eq("task_id", taskId)
      .neq("user_id", commenterId);

    if (commentersError) {
      console.error("Error fetching commenters:", commentersError);
    }

    // Get unique user IDs to notify
    const userIdsToNotify = new Set<string>();
    if (commenters) {
      commenters.forEach((c) => {
        if (c.user_id) userIdsToNotify.add(c.user_id);
      });
    }

    console.log(`Users to notify: ${Array.from(userIdsToNotify).join(", ")}`);

    if (userIdsToNotify.size === 0) {
      console.log("No users to notify");
      return new Response(JSON.stringify({ message: "No users to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user emails and notification preferences
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(userIdsToNotify));

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Get notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("user_id, email_notifications")
      .in("user_id", Array.from(userIdsToNotify));

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
    }

    // Get user emails from auth.users (using service role)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const userEmails = users
      .filter((u) => userIdsToNotify.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email,
        name: profiles?.find((p) => p.id === u.id)?.full_name || u.email,
      }));

    // Filter users who want email notifications
    const prefsMap = new Map(preferences?.map((p) => [p.user_id, p.email_notifications]) || []);
    const usersToEmail = userEmails.filter((u) => {
      const pref = prefsMap.get(u.id);
      return pref === undefined || pref === true; // Default to true if no preference set
    });

    console.log(`Sending emails to: ${usersToEmail.map((u) => u.email).join(", ")}`);

    // Send emails
    const emailPromises = usersToEmail.map((user) =>
      resend.emails.send({
        from: "JoIA Insight Hub <onboarding@resend.dev>",
        to: [user.email!],
        subject: `Novo comentário na tarefa: ${taskTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; margin-bottom: 16px;">Novo comentário na tarefa</h2>
            <div style="background-color: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Tarefa:</p>
              <p style="margin: 0; color: #333; font-weight: 600;">${taskTitle}</p>
            </div>
            <div style="background-color: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;"><strong>${commenterName}</strong> comentou:</p>
              <p style="margin: 0; color: #333; white-space: pre-wrap;">${commentContent}</p>
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">
              Você está recebendo este email porque participou desta tarefa.
              <br>Para alterar suas preferências de notificação, acesse as configurações do app.
            </p>
          </div>
        `,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Emails sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        message: "Notifications sent",
        emailsSent: successCount,
        emailsFailed: failCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-task-comment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
