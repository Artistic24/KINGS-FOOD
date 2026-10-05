import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { Filesystem } from "@capacitor/filesystem";
import { supabase } from "@/integrations/supabase/client";

let initializedForUser: string | null = null;
let notificationId = 1000;

export async function setupNativeDeviceAccess(userId: string) {
  if (!Capacitor.isNativePlatform() || initializedForUser === userId) return;
  initializedForUser = userId;

  try {
    await PushNotifications.requestPermissions();
    await PushNotifications.register();
  } catch (error) {
    console.warn("Push notification permission failed", error);
  }

  try { await LocalNotifications.requestPermissions(); } catch {}
  try { await LocalNotifications.createChannel({ id: "kingsfood", name: "KINGS FOOD", description: "Order and account notifications", importance: 5, sound: "default" }); } catch {}
  try { await Camera.requestPermissions({ permissions: ["camera", "photos"] }); } catch {}
  try { await Geolocation.requestPermissions(); } catch {}

  // Microphone access is requested through the Android WebView when a feature
  // actually uses getUserMedia. We probe once here so Android can show its
  // runtime permission dialog while the user is in the app.
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    }
  } catch {}

  // Capacitor Filesystem uses Android's app-scoped storage by default. Android
  // intentionally does not allow unrestricted filesystem access to normal apps.
  // Camera/photo picker APIs are used for user media instead of requesting
  // the restricted MANAGE_EXTERNAL_STORAGE permission.
  try { await Filesystem.getUri({ directory: "DOCUMENTS", path: "kingsfood" }); } catch {}

  const registration = await PushNotifications.addListener("registration", async ({ value }) => {
    const { error } = await (supabase as any).from("device_push_tokens").upsert(
      { user_id: userId, token: value, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
    if (error) console.warn("Could not save push token", error.message);
  });

  const action = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const link = (notification.data as any)?.link;
    if (typeof link === "string" && link.startsWith("/")) window.location.href = link;
  });

  const push = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    void LocalNotifications.schedule({
      notifications: [{
        id: ++notificationId,
        title: notification.title ?? "KINGS FOOD",
        body: notification.body ?? "",
        channelId: "kingsfood",
        schedule: { at: new Date(Date.now() + 250) },
        extra: notification.data,
      }],
    }).catch(() => {});
  });

  return () => {
    registration.remove();
    action.remove();
    push.remove();
  };
}
