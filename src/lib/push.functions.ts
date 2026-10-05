import { createServerFn } from "@tanstack/react-start";
import { GoogleAuth } from "google-auth-library";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

function adminClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase server credentials are not configured");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sendFcm(token: string, title: string, body: string, link?: string | null) {
  if (!firebaseProjectId) return;
  const auth = new GoogleAuth({
    credentials: process.env.FCM_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON) : undefined,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) throw new Error("Could not obtain FCM access token");

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { ...(link ? { link } : {}) },
        android: { priority: "high", notification: { channel_id: "kingsfood", sound: "default" } },
      },
    }),
  });
  if (!response.ok) throw new Error(`FCM ${response.status}: ${(await response.text()).slice(0, 300)}`);
}

export const sendPushForNotifications = createServerFn({ method: "POST" })
  .inputValidator((data: { notificationIds: string[] }) => data)
  .handler(async ({ data }) => {
    const sb = adminClient();
    const { data: notifications, error } = await sb
      .from("notifications")
      .select("id, user_id, title, body, link")
      .in("id", data.notificationIds);
    if (error) throw error;

    const userIds = Array.from(new Set((notifications ?? []).map((n) => n.user_id)));
    if (!userIds.length) return { sent: 0 };

    const { data: tokens, error: tokenError } = await sb
      .from("device_push_tokens")
      .select("user_id, token")
      .in("user_id", userIds);
    if (tokenError) throw tokenError;

    let sent = 0;
    for (const notification of notifications ?? []) {
      const userTokens = (tokens ?? []).filter((t) => t.user_id === notification.user_id);
      for (const device of userTokens) {
        try {
          await sendFcm(device.token, notification.title, notification.body ?? "", notification.link);
          sent++;
        } catch (error) {
          console.warn("FCM delivery failed", { token: device.token.slice(0, 12), error });
        }
      }
    }
    return { sent };
  });
