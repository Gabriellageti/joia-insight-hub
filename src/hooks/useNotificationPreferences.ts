import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
}

const VAPID_PUBLIC_KEY = "BLBz0LGpk6QWGEhP8G6k0yVB_Fm7XmXgM8r_9W7hV5kYs6iVJ4Fv3lN8zS2qR9mH5pK1wO3xD4uE6rF8gB0jI2M";

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: false,
  });
  const [loading, setLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);

    if (supported && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    try {
      // Upsert the preference
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      setPreferences((prev) => ({ ...prev, [key]: value }));
      toast.success("Preferência atualizada");
    } catch (error) {
      console.error("Error updating preference:", error);
      toast.error("Erro ao atualizar preferência");
    }
  };

  const subscribeToPush = async (): Promise<boolean> => {
    if (!pushSupported || !user) {
      toast.error("Push notifications não são suportadas neste navegador");
      return false;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        toast.error("Permissão para notificações negada");
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key from edge function
      const { data: configData } = await supabase.functions.invoke("get-vapid-public-key");
      const vapidPublicKey = configData?.publicKey || VAPID_PUBLIC_KEY;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJson = subscription.toJSON();

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
      }, {
        onConflict: "user_id,endpoint",
      });

      if (error) throw error;

      toast.success("Notificações push ativadas");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Erro ao ativar notificações push");
      return false;
    }
  };

  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove from database
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Notificações push desativadas");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      toast.error("Erro ao desativar notificações push");
      return false;
    }
  };

  const togglePushNotifications = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribeToPush();
      if (success) {
        await updatePreference("push_notifications", true);
      }
    } else {
      const success = await unsubscribeFromPush();
      if (success) {
        await updatePreference("push_notifications", false);
      }
    }
  };

  return {
    preferences,
    loading,
    pushSupported,
    pushPermission,
    updateEmailPreference: (value: boolean) => updatePreference("email_notifications", value),
    togglePushNotifications,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
