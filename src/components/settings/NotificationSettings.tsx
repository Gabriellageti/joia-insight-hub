import { Mail, Bell, BellOff, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAuth } from "@/contexts/AuthContext";

export function NotificationSettings() {
  const { user } = useAuth();
  const {
    preferences,
    loading,
    pushSupported,
    pushPermission,
    updateEmailPreference,
    togglePushNotifications,
  } = useNotificationPreferences();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
          <CardDescription>Faça login para gerenciar suas notificações</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa estar logado para configurar notificações.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
          <CardDescription>Configure como você deseja ser notificado</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Notificação</CardTitle>
        <CardDescription>Configure como você deseja ser notificado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Notificações por Email</p>
              <p className="text-sm text-muted-foreground">
                Receba emails quando houver novos comentários em tarefas que você participa
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.email_notifications}
            onCheckedChange={updateEmailPreference}
          />
        </div>

        {/* Push Notifications */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              {preferences.push_notifications ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Notificações Push</p>
                {!pushSupported && (
                  <Badge variant="secondary" className="text-xs">
                    Não suportado
                  </Badge>
                )}
                {pushSupported && pushPermission === "denied" && (
                  <Badge variant="destructive" className="text-xs">
                    Bloqueado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Receba notificações no navegador mesmo quando o app estiver fechado
              </p>
              {pushSupported && pushPermission === "denied" && (
                <p className="text-xs text-destructive">
                  As notificações foram bloqueadas. Altere nas configurações do navegador.
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={preferences.push_notifications}
            onCheckedChange={togglePushNotifications}
            disabled={!pushSupported || pushPermission === "denied"}
          />
        </div>

        {/* Info about notifications */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Você será notificado quando outros usuários comentarem em tarefas que você participa.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
