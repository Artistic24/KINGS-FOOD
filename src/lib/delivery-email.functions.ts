import { createServerFn } from "@tanstack/react-start";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function admin() {
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const sendDeliveryEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data }) => {
    const sb = admin();
    const { data: order, error: orderError } = await sb
      .from("orders")
      .select("id, user_id, order_number, total_xaf, delivered_at")
      .eq("id", data.orderId)
      .eq("delivery_status", "delivered")
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return { sent: false, reason: "order_not_delivered" };

    const { data: preference } = await sb
      .from("user_preferences")
      .select("notify_email")
      .eq("user_id", order.user_id)
      .maybeSingle();
    if (preference?.notify_email === false) return { sent: false, reason: "email_disabled" };

    const { data: claim, error: claimError } = await sb.rpc("claim_delivery_email", { _order_id: order.id });
    if (claimError) throw claimError;
    if (!claim) return { sent: false, reason: "already_sent" };

    const { data: userData, error: userError } = await sb.auth.admin.getUserById(order.user_id);
    if (userError) throw userError;
    const email = userData.user?.email;
    if (!email) return { sent: false, reason: "no_email" };

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || "KINGS FOOD <onboarding@resend.dev>";
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not configured; delivery email was claimed but not sent.");
      return { sent: false, reason: "email_provider_not_configured" };
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: `KINGS FOOD — Order ${order.order_number} delivered`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>Your KINGS FOOD order was delivered successfully</h2><p>Order <strong>${order.order_number}</strong> has been delivered.</p><p>Thank you for shopping with KINGS FOOD.</p></div>`,
    });
    if (error) throw new Error(error.message);
    return { sent: true, email };
  });
