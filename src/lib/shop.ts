import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/* ---------------- Product gallery (max 5 per product) ---------------- */

export type ProductImage = { id: string; product_id: string; url: string; sort_order: number };

export async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await sb
    .from("product_images")
    .select("id, product_id, url, sort_order")
    .eq("product_id", productId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function addProductImage(productId: string, url: string, sortOrder: number) {
  const { error } = await sb.from("product_images").insert({ product_id: productId, url, sort_order: sortOrder });
  if (error) throw error;
}

export async function removeProductImage(id: string) {
  const { error } = await sb.from("product_images").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Product reviews ---------------- */

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string | null;
  rating: number;
  body: string | null;
  created_at: string;
};

export async function fetchProductReviews(productId: string): Promise<ProductReview[]> {
  const { data, error } = await sb
    .from("product_reviews")
    .select("id, product_id, user_id, author_name, rating, body, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertProductReview(input: {
  product_id: string;
  user_id: string;
  author_name: string | null;
  rating: number;
  body: string;
}) {
  const { error } = await sb.from("product_reviews").upsert(input, { onConflict: "product_id,user_id" });
  if (error) throw error;
}

/** Average rating + count for many products at once (used on cards & recommendations). */
export async function fetchRatingIndex(): Promise<Record<string, { avg: number; count: number }>> {
  const { data, error } = await sb.from("product_reviews").select("product_id, rating").limit(5000);
  if (error) throw error;
  const acc: Record<string, { sum: number; count: number }> = {};
  for (const r of data ?? []) {
    const e = (acc[r.product_id] ??= { sum: 0, count: 0 });
    e.sum += r.rating;
    e.count += 1;
  }
  return Object.fromEntries(
    Object.entries(acc).map(([id, v]) => [id, { avg: v.sum / v.count, count: v.count }]),
  );
}

/* ---------------- Favorites ---------------- */

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await sb.from("favorites").select("product_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.product_id);
}

export async function toggleFavorite(userId: string, productId: string, on: boolean) {
  if (on) {
    const { error } = await sb.from("favorites").insert({ user_id: userId, product_id: productId });
    if (error && error.code !== "23505") throw error;
  } else {
    const { error } = await sb.from("favorites").delete().eq("user_id", userId).eq("product_id", productId);
    if (error) throw error;
  }
}

/* ---------------- Preferences ---------------- */

export type Preferences = {
  sectors: string[];
  keywords: string[];
  notify_email: boolean;
  notify_inapp: boolean;
};

export const PREF_DEFAULTS: Preferences = { sectors: [], keywords: [], notify_email: true, notify_inapp: true };

export async function fetchPreferences(userId: string): Promise<Preferences> {
  const { data, error } = await sb
    .from("user_preferences")
    .select("sectors, keywords, notify_email, notify_inapp")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { ...PREF_DEFAULTS, ...(data ?? {}) };
}

export async function savePreferences(userId: string, prefs: Preferences) {
  const { error } = await sb.from("user_preferences").upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
  if (error) throw error;
}

/* ---------------- Notifications ---------------- */

export type Notification = { id: string; title: string; body: string | null; read: boolean; created_at: string };

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await sb
    .from("notifications")
    .select("id, title, body, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  await sb.from("notifications").update({ read: true }).eq("id", id);
}

/* ---------------- Vouchers ---------------- */

export type Voucher = {
  id: string;
  code: string;
  label: string | null;
  amount_xaf: number;
  percent_off: number | null;
  used: boolean;
  expires_at: string | null;
};

export async function fetchVouchers(userId: string): Promise<Voucher[]> {
  const { data, error } = await sb
    .from("vouchers")
    .select("id, code, label, amount_xaf, percent_off, used, expires_at")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ---------------- Refunds ---------------- */

export type RefundRequest = {
  id: string;
  order_number: string | null;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export async function fetchRefunds(userId: string): Promise<RefundRequest[]> {
  const { data, error } = await sb
    .from("refund_requests")
    .select("id, order_number, reason, status, admin_notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRefund(userId: string, orderNumber: string, reason: string) {
  const { data: order } = await sb.from("orders").select("id").eq("order_number", orderNumber).maybeSingle();
  const { error } = await sb
    .from("refund_requests")
    .insert({ user_id: userId, order_id: order?.id ?? null, order_number: orderNumber, reason });
  if (error) throw error;
}

/* ---------------- Account verification ---------------- */

export type Verification = {
  id: string;
  status: string;
  full_name: string;
  phone: string;
  id_type: string;
  review_notes: string | null;
};

export async function fetchVerification(userId: string): Promise<Verification | null> {
  const { data, error } = await sb
    .from("account_verifications")
    .select("id, status, full_name, phone, id_type, review_notes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitVerification(input: {
  user_id: string;
  full_name: string;
  phone: string;
  id_type: string;
  id_front_path: string | null;
  id_back_path: string | null;
}) {
  const { error } = await sb
    .from("account_verifications")
    .upsert({ ...input, status: "pending" }, { onConflict: "user_id" });
  if (error) throw error;
}

/* ---------------- Payment methods ---------------- */

export type PaymentMethod = {
  id: string;
  provider: string;
  account_name: string;
  phone: string;
  verified: boolean;
  is_default: boolean;
};

export async function fetchPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const { data, error } = await sb
    .from("payment_methods")
    .select("id, provider, account_name, phone, verified, is_default")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addPaymentMethod(userId: string, provider: string, account_name: string, phone: string) {
  const { error } = await sb.from("payment_methods").insert({ user_id: userId, provider, account_name, phone });
  if (error) throw error;
}

export async function removePaymentMethod(id: string) {
  const { error } = await sb.from("payment_methods").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Home advert slides ---------------- */

export type HomeSlide = {
  id: string;
  image_url: string;
  caption: string | null;
  link_url: string | null;
  sort_order: number;
  active: boolean;
};

export async function fetchHomeSlides(): Promise<HomeSlide[]> {
  const { data, error } = await sb
    .from("home_slides")
    .select("id, image_url, caption, link_url, sort_order, active")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllHomeSlides(): Promise<HomeSlide[]> {
  const { data, error } = await sb
    .from("home_slides")
    .select("id, image_url, caption, link_url, sort_order, active")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}
