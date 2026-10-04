import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Heart, MapPin, PackageCheck, Ticket, Star, Undo2, BadgeCheck, CreditCard, Bell, SlidersHorizontal,
  Loader2, X, Trash2, Plus, Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { formatXAF } from "@/lib/format";
import { fetchAllProducts, fetchSectors, type Product } from "@/lib/queries";
import { productImage } from "@/lib/product-images";
import { CopyButton } from "@/components/CopyButton";
import { REGIONS } from "@/lib/cameroon-towns";
import {
  fetchFavoriteIds, toggleFavorite, fetchVouchers, fetchRefunds, createRefund,
  fetchNotifications, markNotificationRead, fetchPreferences, savePreferences, PREF_DEFAULTS,
  fetchPaymentMethods, addPaymentMethod, removePaymentMethod, fetchVerification, submitVerification,
  type Preferences, type Verification,
} from "@/lib/shop";

const sb = supabase as any;
const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

type PanelKey =
  | "favorites" | "addresses" | "receive" | "vouchers" | "reviews"
  | "refund" | "verify" | "payments" | "notifications" | "preferences";

const TILES: { key: PanelKey; label: string; icon: typeof Heart }[] = [
  { key: "favorites", label: "Favorites", icon: Heart },
  { key: "addresses", label: "Delivery address", icon: MapPin },
  { key: "receive", label: "To receive", icon: PackageCheck },
  { key: "vouchers", label: "Vouchers", icon: Ticket },
  { key: "reviews", label: "Review", icon: Star },
  { key: "refund", label: "Refund", icon: Undo2 },
  { key: "verify", label: "Verify account", icon: BadgeCheck },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
];

export function AccountHub({
  user,
  verification,
  onVerificationChange,
}: {
  user: User;
  verification: Verification | null;
  onVerificationChange: (v: Verification | null) => void;
}) {
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchNotifications(user.id).then((n) => setUnread(n.filter((x) => !x.read).length)).catch(() => {});
  }, [user.id]);

  return (
    <section className="mt-6">
      <div className="grid grid-cols-4 gap-2 rounded-3xl border border-border bg-card p-4 sm:grid-cols-5">
        {TILES.map((t) => (
          <button
            key={t.key}
            onClick={() => setPanel(t.key)}
            className="group relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-colors hover:bg-muted"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <t.icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium leading-tight">{t.label}</span>
            {t.key === "verify" && verification?.status === "approved" && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-forest" />
            )}
            {t.key === "notifications" && unread > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{unread}</span>
            )}
          </button>
        ))}
      </div>

      {panel && (
        <Drawer title={TILES.find((t) => t.key === panel)!.label} onClose={() => setPanel(null)}>
          {panel === "favorites" && <FavoritesPanel userId={user.id} />}
          {panel === "addresses" && <AddressesPanel userId={user.id} />}
          {panel === "receive" && <ToReceivePanel userId={user.id} />}
          {panel === "vouchers" && <VouchersPanel userId={user.id} />}
          {panel === "reviews" && <MyReviewsPanel userId={user.id} />}
          {panel === "refund" && <RefundPanel userId={user.id} />}
          {panel === "verify" && (
            <VerifyPanel user={user} verification={verification} onChange={onVerificationChange} />
          )}
          {panel === "payments" && <PaymentsPanel userId={user.id} />}
          {panel === "notifications" && <NotificationsPanel userId={user.id} onRead={() => setUnread((n) => Math.max(0, n - 1))} />}
          {panel === "preferences" && <PreferencesPanel userId={user.id} />}
        </Drawer>
      )}
    </section>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-background p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Busy() { return <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div>; }
function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>; }

/* ------------------------- Favorites ------------------------- */

function FavoritesPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    (async () => {
      const [ids, products] = await Promise.all([fetchFavoriteIds(userId), fetchAllProducts()]);
      setItems(products.filter((p) => ids.includes(p.id)));
    })().catch(() => setItems([]));
  }, [userId]);

  if (!items) return <Busy />;
  if (!items.length) return <Empty text="No favorites yet. Tap the ☆ on any product." />;

  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <img src={productImage(p.slug, p.image_url) ?? ""} alt="" className="h-12 w-12 rounded-xl object-cover" />
          <Link to="/products/$slug" params={{ slug: p.slug }} className="flex-1 text-sm font-medium hover:underline">{p.name}</Link>
          <span className="text-sm font-bold text-primary">{formatXAF(p.price_xaf)}</span>
          <button
            aria-label="Remove favorite"
            onClick={async () => { await toggleFavorite(userId, p.id, false); setItems((x) => (x ?? []).filter((i) => i.id !== p.id)); }}
            className="text-destructive"
          ><Trash2 className="h-4 w-4" /></button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------- Addresses ------------------------- */

function AddressesPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [form, setForm] = useState({ label: "Home", full_name: "", region: "", city: "", street: "", landmark: "", phone: "" });
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const pinReq = useRef(0);

  const load = () => sb.from("addresses").select("*").eq("user_id", userId).order("created_at", { ascending: false })
    .then(({ data }: any) => setRows(data ?? []));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  // Only the newest click counts — any pending fix from an earlier click is dropped.
  const capturePin = () => {
    const id = ++pinReq.current;
    if (typeof navigator === "undefined" || !navigator.geolocation) return toast.error("Location not supported");
    const tid = toast.loading("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== pinReq.current) return toast.dismiss(tid);
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location pin captured", { id: tid });
      },
      (err) => { if (id === pinReq.current) toast.error(err.message, { id: tid }); else toast.dismiss(tid); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const makeDefault = async (id: string) => {
    await sb.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await sb.from("addresses").update({ is_default: true }).eq("id", id);
    toast.success("Default delivery address updated");
    load();
  };

  const add = async () => {
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (!form.region || !form.city) return toast.error("Region and city are required");
    if (!pin) return toast.error("Tap “Use my current location” to attach a delivery pin");
    if (isDefault) await sb.from("addresses").update({ is_default: false }).eq("user_id", userId);
    const { error } = await sb.from("addresses").insert({
      user_id: userId, ...form, is_default: isDefault, latitude: pin.lat, longitude: pin.lng,
    });
    if (error) return toast.error(error.message);
    toast.success("Address saved");
    setForm({ label: "Home", full_name: "", region: "", city: "", street: "", landmark: "", phone: "" });
    setPin(null); pinReq.current++;
    load();
  };


  return (
    <div className="space-y-4">
      {!rows ? <Busy /> : rows.length === 0 ? <Empty text="No saved addresses yet." /> : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li key={a.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                {a.label ?? "Address"}
                {a.is_default && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Default</span>}
              </p>
              {a.full_name && <p className="text-xs font-medium">{a.full_name}</p>}
              <p className="text-muted-foreground">{[a.street, a.landmark, a.city, a.region].filter(Boolean).join(", ")}</p>
              {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
              {a.latitude != null && a.longitude != null && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  📍 {Number(a.latitude).toFixed(5)}, {Number(a.longitude).toFixed(5)}
                  <CopyButton value={`${Number(a.latitude)}, ${Number(a.longitude)}`} />
                </p>
              )}
              <div className="mt-1 flex items-center gap-3">
                {!a.is_default && <button onClick={() => makeDefault(a.id)} className="text-xs font-semibold text-primary">Set as default</button>}
                <button onClick={async () => { await sb.from("addresses").delete().eq("id", a.id); load(); }} className="text-xs text-destructive">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2 rounded-2xl border border-border p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Add address</p>
        <input className={inp} placeholder="Label (Home, Office…)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <input className={inp} placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className={inp} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            <option value="">Pick a region…</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className={inp} placeholder="City / town" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <input className={inp} placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
        <input className={inp} placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
        <input className={inp} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={capturePin} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            <MapPin className="h-3.5 w-3.5" />{pin ? "Update location pin" : "Use my current location"}
          </button>
          {pin && <span className="text-xs text-muted-foreground">📍 {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span>}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-primary" />
          Set as my default delivery address
        </label>
        <button onClick={add} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Save address</button>
      </div>
    </div>
  );
}


/* ------------------------- To receive ------------------------- */

function ToReceivePanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    sb.from("orders")
      .select("id, order_number, status, delivery_status, total_xaf, created_at")
      .eq("user_id", userId)
      .not("status", "in", "(delivered,cancelled)")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setRows(data ?? []));
  }, [userId]);

  if (!rows) return <Busy />;
  if (!rows.length) return <Empty text="Nothing on the way right now." />;
  return (
    <ul className="space-y-2">
      {rows.map((o) => (
        <li key={o.id}>
          <Link to="/orders/$orderNumber" params={{ orderNumber: o.order_number }} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm hover:bg-muted">
            <div>
              <p className="font-display font-bold">{o.order_number}</p>
              <p className="text-xs capitalize text-muted-foreground">{String(o.delivery_status || o.status).replace(/_/g, " ")}</p>
            </div>
            <span className="font-bold text-primary">{formatXAF(o.total_xaf)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------- Vouchers ------------------------- */

function VouchersPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { fetchVouchers(userId).then(setRows).catch(() => setRows([])); }, [userId]);
  if (!rows) return <Busy />;
  if (!rows.length) return <Empty text="No vouchers available yet." />;
  return (
    <ul className="space-y-2">
      {rows.map((v) => (
        <li key={v.id} className={`rounded-2xl border border-dashed p-3 text-sm ${v.used ? "opacity-50" : "border-primary/50"}`}>
          <p className="font-display text-lg font-bold text-primary">{v.percent_off ? `${v.percent_off}% off` : formatXAF(v.amount_xaf)}</p>
          <p className="font-mono text-xs">{v.code}</p>
          {v.label && <p className="text-xs text-muted-foreground">{v.label}</p>}
          {v.expires_at && <p className="text-xs text-muted-foreground">Expires {new Date(v.expires_at).toLocaleDateString()}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------- My reviews ------------------------- */

function MyReviewsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    sb.from("product_reviews").select("id, rating, body, created_at, products(name, slug)").eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setRows(data ?? []));
  }, [userId]);
  if (!rows) return <Busy />;
  if (!rows.length) return <Empty text="You haven't reviewed any product yet." />;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
          <p className="font-semibold">{r.products?.name ?? "Product"}</p>
          <p className="text-saffron">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></p>
          {r.body && <p className="mt-1 text-muted-foreground">{r.body}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------- Refund ------------------------- */

function RefundPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [reason, setReason] = useState("");
  const load = () => fetchRefunds(userId).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const submit = async () => {
    if (!orderNumber.trim() || !reason.trim()) return toast.error("Order number and reason are required");
    try {
      await createRefund(userId, orderNumber.trim().toUpperCase(), reason.trim());
      toast.success("Refund request sent"); setOrderNumber(""); setReason(""); load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border border-border p-3">
        <input className={inp} placeholder="Order number (KF-XXXX)" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        <textarea rows={3} className={inp} placeholder="Why do you want a refund?" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button onClick={submit} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Request refund</button>
      </div>
      {!rows ? <Busy /> : rows.length === 0 ? <Empty text="No refund requests." /> : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
              <p className="font-display font-bold">{r.order_number}<span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{r.status}</span></p>
              <p className="text-muted-foreground">{r.reason}</p>
              {r.admin_notes && <p className="mt-1 text-xs text-forest">Admin: {r.admin_notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------- Verification ------------------------- */

function VerifyPanel({ user, verification, onChange }: { user: User; verification: Verification | null; onChange: (v: Verification | null) => void }) {
  const [form, setForm] = useState({
    full_name: verification?.full_name ?? ((user.user_metadata as any)?.full_name || ""),
    phone: verification?.phone ?? "",
    id_type: verification?.id_type ?? "id_card",
  });
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File, side: "front" | "back") => {
    setBusy(true);
    try {
      const path = `${user.id}/verify-${side}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("rider-verification").upload(path, file, { upsert: true });
      if (error) throw error;
      side === "front" ? setFront(path) : setBack(path);
      toast.success(`${side === "front" ? "Front" : "Back"} uploaded`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    setBusy(true);
    try {
      await submitVerification({ user_id: user.id, ...form, id_front_path: front, id_back_path: back });
      toast.success("Verification submitted for review");
      onChange({ id: verification?.id ?? "new", status: "pending", review_notes: null, ...form });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (verification?.status === "approved") {
    return (
      <div className="rounded-2xl border border-forest/40 bg-forest/10 p-5 text-center">
        <BadgeCheck className="mx-auto h-8 w-8 text-forest" />
        <p className="mt-2 font-display text-lg font-bold">Account verified</p>
        <p className="text-sm text-muted-foreground">You can now request an admin badge or apply as a rider.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {verification?.status === "pending" && (
        <p className="rounded-xl bg-saffron/15 p-3 text-sm">Your verification is pending review. You can update your details below.</p>
      )}
      {verification?.status === "declined" && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Declined{verification.review_notes ? `: ${verification.review_notes}` : ""}. Please resubmit.</p>
      )}
      <input className={inp} placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <input className={inp} placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <select className={inp} value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })}>
        <option value="id_card">National ID card</option>
        <option value="passport">Passport</option>
        <option value="drivers_license">Driver's licence</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        {(["front", "back"] as const).map((side) => (
          <label key={side} className="grid cursor-pointer place-items-center gap-1 rounded-xl border border-dashed border-border p-4 text-xs hover:bg-muted">
            <Upload className="h-4 w-4" />
            {(side === "front" ? front : back) ? `${side} uploaded ✓` : `Upload ${side}`}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, side); e.currentTarget.value = ""; }} />
          </label>
        ))}
      </div>
      <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for verification
      </button>
    </div>
  );
}

/* ------------------------- Payment methods ------------------------- */

function PaymentsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [form, setForm] = useState({ provider: "mtn_momo", account_name: "", phone: "" });
  const load = () => fetchPaymentMethods(userId).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const add = async () => {
    if (!form.account_name.trim() || !form.phone.trim()) return toast.error("Account name and number are required");
    try { await addPaymentMethod(userId, form.provider, form.account_name.trim(), form.phone.trim()); setForm({ ...form, account_name: "", phone: "" }); load(); toast.success("Payment method added"); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      {!rows ? <Busy /> : rows.length === 0 ? <Empty text="No payment methods saved." /> : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm">
              <div>
                <p className="font-semibold capitalize">{m.provider.replace("_", " ")} · {m.phone}</p>
                <p className="text-xs text-muted-foreground">{m.account_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.verified ? "bg-forest/15 text-forest" : "bg-muted text-muted-foreground"}`}>{m.verified ? "Verified" : "Unverified"}</span>
                <button aria-label="Remove" onClick={async () => { await removePaymentMethod(m.id); load(); }} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2 rounded-2xl border border-border p-3">
        <select className={inp} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
          <option value="mtn_momo">MTN Mobile Money</option>
          <option value="orange_money">Orange Money</option>
        </select>
        <input className={inp} placeholder="Account name" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
        <input className={inp} placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button onClick={add} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add method</button>
      </div>
    </div>
  );
}

/* ------------------------- Notifications ------------------------- */

function NotificationsPanel({ userId, onRead }: { userId: string; onRead: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { fetchNotifications(userId).then(setRows).catch(() => setRows([])); }, [userId]);
  if (!rows) return <Busy />;
  if (!rows.length) return <Empty text="No notifications yet." />;
  return (
    <ul className="space-y-2">
      {rows.map((n) => (
        <li
          key={n.id}
          onClick={async () => { if (!n.read) { await markNotificationRead(n.id); n.read = true; onRead(); setRows([...rows]); } }}
          className={`cursor-pointer rounded-2xl border p-3 text-sm ${n.read ? "border-border bg-card" : "border-primary/40 bg-primary/5"}`}
        >
          <p className="font-semibold">{n.title}</p>
          {n.body && <p className="text-muted-foreground">{n.body}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------- Preferences ------------------------- */

function PreferencesPanel({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [sectors, setSectors] = useState<any[]>([]);
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchPreferences(userId), fetchSectors()]).then(([p, s]) => {
      setPrefs(p); setSectors(s); setKeywords(p.keywords.join(", "));
    }).catch(() => setPrefs(PREF_DEFAULTS));
  }, [userId]);

  if (!prefs) return <Busy />;

  const toggleSector = (id: string) =>
    setPrefs({ ...prefs, sectors: prefs.sectors.includes(id) ? prefs.sectors.filter((s) => s !== id) : [...prefs.sectors, id] });

  const save = async () => {
    setSaving(true);
    try {
      const next = { ...prefs, keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) };
      await savePreferences(userId, next);
      setPrefs(next);
      toast.success("Preferences saved — your recommendations will update");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Sectors you love</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sectors.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSector(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${prefs.sectors.includes(s.id) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"}`}
            >{s.name}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Keywords (comma separated)</p>
        <input className={`${inp} mt-2`} placeholder="grilled chicken, spicy, rice" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </div>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.notify_inapp} onChange={(e) => setPrefs({ ...prefs, notify_inapp: e.target.checked })} />In-app notifications</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.notify_email} onChange={(e) => setPrefs({ ...prefs, notify_email: e.target.checked })} />Email notifications</label>
      </div>
      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save preferences
      </button>
    </div>
  );
}
