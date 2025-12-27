import { useState, useEffect } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  task_id: string;
  user_id: string | null;
  user_name: string;
  content: string;
  created_at: string;
}

interface TaskCommentsProps {
  taskId: string;
  taskTitle: string;
}

export function TaskComments({ taskId, taskTitle }: TaskCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchComments();
    }
  }, [taskId]);

  const sendNotification = async (commentContent: string, commenterName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke("notify-task-comment", {
        body: {
          taskId,
          taskTitle,
          commentContent,
          commenterName,
          commenterId: user?.id,
        },
      });
      console.log("Notification sent successfully");
    } catch (error) {
      console.error("Error sending notification:", error);
      // Don't show error to user - notification is secondary
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const userName =
        (user.user_metadata as Record<string, string>)?.full_name ||
        (user.user_metadata as Record<string, string>)?.name ||
        user.email ||
        "Usuário";

      const commentContent = newComment.trim();

      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId,
        user_id: user.id,
        user_name: userName,
        content: commentContent,
      });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      toast.success("Comentário adicionado");

      // Send notification in background
      sendNotification(commentContent, userName);
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast.error("Erro ao adicionar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comentário removido");
    } catch (error) {
      console.error("Erro ao remover comentário:", error);
      toast.error("Erro ao remover comentário");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        Comentários ({comments.length})
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Carregando comentários...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Nenhum comentário ainda
        </div>
      ) : (
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/50"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {comment.user_name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {user?.id === comment.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Escreva um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleSubmit();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pressione Ctrl+Enter para enviar
      </p>
    </div>
  );
}
