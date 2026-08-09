import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useCart } from "@/lib/cart";
import { fetchDeliveryZones } from "@/lib/queries";
import { formatXAF } from "@/lib/format";
import { MapPicker } from "@/components/MapPicker";
import { CheckoutTutorial } from "@/components/CheckoutTutorial";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — St Kingston" }] }),
  component: CheckoutPage,
});

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "Enter your name").max(100),
  customer_phone: z.string().trim().regex(/^[+0-9 ()-]{8,20}$/, "Enter a valid phone"),
  region: z.string().min(1, "Pick a region"),
  city: z.string().trim().min(2, "Enter your city/town").max(80),
  street: z.string().trim().max(200).optional().or(z.literal("")),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  payment_method: z.enum(["cash_on_delivery", "mtn_momo", "orange_money"]),
  payer_phone: z.string().trim().max(20).optional().or(z.literal("")),
});

type PaymentSetting = {
  id: string;
  provider: string;
  display_name: string;
  ussd_template: string | null;
  transfer_number: string;
  account_name: string;
  instructions: string | null;
  active: boolean;
};

type NearestAdmin = {
  admin_user_id: string;
  full_name: string | null;
  region: string;
  town: string;
  latitude: number;
  longitude: number;
  distance_km: number;
};

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const clearCart = useCart((s) => s.clear);

  const { data: zones = [] } = useQuery({ queryKey: ["zones"], queryFn: fetchDeliveryZones });
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: async (): Promise<PaymentSetting[]> => {
      const { data, error } = await supabase
        .from("payment_settings" as any)
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    region: "",
    city: "",
    street: "",
    landmark: "",
    notes: "",
    payment_method: "cash_on_delivery" as "cash_on_delivery" | "mtn_momo" | "orange_money",
    payer_phone: "",
  });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nearestAdmin, setNearestAdmin] = useState<NearestAdmin | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminCheckMsg, setAdminCheckMsg] = useState<string | null>(null);

  const geo = useGeolocation(true);

  useEffect(() => {
    if (geo.coords && lat == null && lng == null) {
      setLat(geo.coords.lat);
      setLng(geo.coords.lng);
    }
  }, [geo.coords, lat, lng]);

  // Run the geofence/admin-match check whenever region, town, or pin changes
  useEffect(() => {
    setNearestAdmin(null);
    setAdminCheckMsg(null);
    if (!form.region || !form.city.trim() || lat == null || lng == null) return;
    let cancelled = false;
    setCheckingAdmin(true);
    (async () => {
      const { data, error } = await supabase.rpc("nearest_admin" as any, {
        _lat: lat,
        _lng: lng,
        _region: form.region,
        _town: form.city.trim(),
        _radius_km: 10,
      });
      if (cancelled) return;
      setCheckingAdmin(false);
      if (error) {
        setAdminCheckMsg(error.message);
        return;
      }
      const row = Array.isArray(data) && data.length > 0 ? (data[0] as NearestAdmin) : null;
      if (!row) {
        setAdminCheckMsg(
          `No St Kingston admin found within 10 km of your location in ${form.region} / ${form.city}. We can't deliver here yet.`,
        );
      } else {
        setNearestAdmin(row);
      }
    })();
    return () => { cancelled = true; };
  }, [form.region, form.city, lat, lng]);

  const [proofFile, setProofFile] = useState<File | null>(null);

  const zone = zones.find((z) => z.region === form.region);
  const fee = zone?.fee_xaf ?? 0;
  const total = subtotal + fee;

  if (authLoading) {
    return <div className="mx-auto px-4 py-20 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to complete checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">We'll save your orders so you can track them.</p>
        <Link
          to="/auth"
          search={{ redirect: "/checkout" }}
          className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">Start shopping</Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (lat == null || lng == null) {
      toast.error("Please drop a pin on the map for delivery");
      return;
    }
    if (!nearestAdmin) {
      toast.error(
        adminCheckMsg ||
          "We can't confirm a St Kingston admin near you yet. Adjust your region/town or pin location.",
      );
      return;
    }

    setSubmitting(true);
    try {
      // Optional payment screenshot — stored privately, visible to admins & the rider.
      let payment_proof_url: string | null = null;
      if (proofFile && form.payment_method !== "cash_on_delivery") {
        const path = `${user.id}/${Date.now()}-${proofFile.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
        if (upErr) throw new Error(`Payment screenshot upload failed: ${upErr.message}`);
        const { data: signed } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        payment_proof_url = signed?.signedUrl ?? null;
      }

      const payment_status = form.payment_method === "cash_on_delivery" ? "pending" : "submitted";
      const order_status = form.payment_method === "cash_on_delivery" ? "placed" : "pending_payment";

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: order_status,
          subtotal_xaf: subtotal,
          delivery_fee_xaf: fee,
          total_xaf: total,
          payment_method: form.payment_method,
          payment_status,
          customer_name: parsed.data.customer_name,
          customer_phone: parsed.data.customer_phone,
          region: parsed.data.region,
          city: parsed.data.city,
          street: parsed.data.street || null,
          landmark: parsed.data.landmark || null,
          latitude: lat,
          longitude: lng,
          origin_latitude: geo.coords?.lat ?? null,
          origin_longitude: geo.coords?.lng ?? null,
          origin_accuracy_m: geo.coords?.accuracy ?? null,
          notes: parsed.data.notes || null,
          assigned_admin_id: nearestAdmin.admin_user_id,
          payment_proof_url,
        } as any)
        .select("id, order_number")
        .single();
      if (orderErr) throw orderErr;

      const { error: itemsErr } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          product_id: i.productId,
          product_name: i.name,
          unit_price_xaf: i.price,
          quantity: i.quantity,
          line_total_xaf: i.price * i.quantity,
        })),
      );
      if (itemsErr) throw itemsErr;

      const { error: payErr } = await supabase.from("payments").insert({
        order_id: order.id,
        method: form.payment_method,
        status: payment_status,
        amount_xaf: total,
        payer_phone: form.payer_phone || parsed.data.customer_phone,
      });
      if (payErr) throw payErr;

      clearCart();
      toast.success("Order placed!");
      navigate({ to: "/orders/$orderNumber", params: { orderNumber: order.order_number } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Could not place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Checkout</h1>

      <CheckoutTutorial />



      <form onSubmit={onSubmit} className="mt-8 grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Your details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Full name" required>
                <input className={inputCls} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
              </Field>
              <Field label="Phone" required>
                <input className={inputCls} placeholder="+237 6XX XX XX XX" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} required />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Delivery address</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Region" required>
                <select className={inputCls} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required>
                  <option value="">Pick a region…</option>
                  {zones.filter((z) => z.active).map((z) => (
                    <option key={z.id} value={z.region}>{z.region} — {formatXAF(z.fee_xaf)}</option>
                  ))}
                </select>
              </Field>
              <Field label="City / Town" required>
                <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </Field>
              <Field label="Street / Quarter">
                <input className={inputCls} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </Field>
              <Field label="Landmark">
                <input className={inputCls} placeholder="e.g. opposite the pharmacy" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
              </Field>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-sm font-medium">Drop your delivery pin <span className="text-destructive">*</span></label>
                <button
                  type="button"
                  onClick={() => {
                    // Use the live fix immediately if we have it
                    if (geo.coords) {
                      setLat(geo.coords.lat);
                      setLng(geo.coords.lng);
                      toast.success("Pin moved to your current location");
                      return;
                    }
                    // Otherwise request a one-shot fix from within this user gesture
                    if (typeof navigator === "undefined" || !navigator.geolocation) {
                      toast.error("Geolocation is not supported on this device");
                      return;
                    }
                    const tid = toast.loading("Getting your location…");
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setLat(pos.coords.latitude);
                        setLng(pos.coords.longitude);
                        toast.success("Pin moved to your current location", { id: tid });
                      },
                      (err) => {
                        toast.error(
                          err.code === err.PERMISSION_DENIED
                            ? "Location permission denied. Enable it in your browser settings."
                            : `Couldn't get location: ${err.message}`,
                          { id: tid },
                        );
                      },
                      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  <MapPin className="h-3.5 w-3.5" /> Use my current location
                </button>
              </div>
              {geo.status === "prompting" && (
                <div className="mb-2 rounded-xl bg-muted px-3 py-2 text-xs">📡 Requesting location permission… please allow access for accurate delivery.</div>
              )}
              {geo.status === "denied" && (
                <div className="mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">Location permission denied. Drop your pin manually on the map, or enable location in your browser settings.</div>
              )}
              {geo.status === "granted" && geo.coords && (
                <div className="mb-2 rounded-xl bg-forest/10 px-3 py-2 text-xs text-forest">✅ Live location captured (±{Math.round(geo.coords.accuracy)} m). Your origin will be shared with our dispatch team.</div>
              )}
              <MapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
              {lat != null && lng != null && (
                <p className="mt-2 text-xs text-muted-foreground">📍 Delivery pin: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
              )}
              {/* Coverage / nearest-admin geofence status */}
              {(form.region && form.city && lat != null && lng != null) && (
                <div className="mt-3">
                  {checkingAdmin ? (
                    <div className="rounded-xl bg-muted px-3 py-2 text-xs">📡 Checking coverage near you…</div>
                  ) : nearestAdmin ? (
                    <div className="rounded-xl bg-forest/10 px-3 py-2 text-xs text-forest">
                      ✅ Coverage confirmed — closest St Kingston admin in {nearestAdmin.region} / {nearestAdmin.town} is {nearestAdmin.distance_km.toFixed(1)} km from your pin.
                    </div>
                  ) : (
                    <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      ⚠️ {adminCheckMsg ?? `No St Kingston admin within 10 km of ${form.region} / ${form.city}.`}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4">
              <Field label="Delivery notes">
                <textarea className={inputCls + " min-h-20"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Payment</h2>
            <div className="mt-4 grid gap-2">
              <PayChoice id="cash_on_delivery" current={form.payment_method} onSelect={(v) => setForm({ ...form, payment_method: v })} title="Cash on delivery" subtitle="Pay the rider when your order arrives" icon="💵" />
              <PayChoice id="mtn_momo" current={form.payment_method} onSelect={(v) => setForm({ ...form, payment_method: v })} title="MTN Mobile Money" subtitle="Transfer & confirm" icon="🟡" />
              <PayChoice id="orange_money" current={form.payment_method} onSelect={(v) => setForm({ ...form, payment_method: v })} title="Orange Money" subtitle="Transfer & confirm" icon="🟠" />
            </div>

            {form.payment_method !== "cash_on_delivery" && (
              nearestAdmin ? (
                <PaymentInstructions
                  method={form.payment_method}
                  amount={total}
                  settings={paymentMethods}
                  payerPhone={form.payer_phone}
                  onPayerPhone={(v) => setForm({ ...form, payer_phone: v })}
                />
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  🔒 Transfer details are hidden until your location is confirmed within 10 km of a St Kingston admin in your region & town. Fill in your region, town and drop your delivery pin above.
                </div>
              )
            )}

            {form.payment_method !== "cash_on_delivery" && nearestAdmin && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium">Upload your payment screenshot (optional)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attach the transfer confirmation so the admin and your rider can verify the payment instantly.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                />
                {proofFile && <p className="mt-2 text-xs text-forest">Attached: {proofFile.name}</p>}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 md:sticky md:top-24">
          <h2 className="font-display text-lg font-bold">Your order</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-2">
                <span>{i.quantity}× {i.name}</span>
                <span className="font-medium">{formatXAF(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatXAF(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery {zone?.region ? `· ${zone.region}` : ""}</span><span>{formatXAF(fee)}</span></div>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="font-display font-bold">Total</span>
            <span className="font-display text-xl font-bold text-primary">{formatXAF(total)}</span>
          </div>
          {form.payment_method === "cash_on_delivery" && (
            <p className="rounded-xl bg-forest/10 px-3 py-2 text-xs text-foreground">
              💵 Pay <span className="font-semibold">{formatXAF(total)}</span> to the rider on delivery —
              that is {formatXAF(subtotal)} for your items plus {formatXAF(fee)} delivery
              {zone?.region ? ` for the ${zone.region} region` : ""}.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !nearestAdmin}
            title={!nearestAdmin ? "Confirm your location is within 10 km of a St Kingston admin" : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {nearestAdmin ? "Place order" : "Confirm location first"}
          </button>
        </aside>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label} {required && <span className="text-destructive">*</span>}</span>
      {children}
    </label>
  );
}

function PayChoice({
  id, current, onSelect, title, subtitle, icon,
}: { id: "cash_on_delivery" | "mtn_momo" | "orange_money"; current: string; onSelect: (v: any) => void; title: string; subtitle: string; icon: string }) {
  const selected = current === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
        selected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-input"
      }`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-xl">{icon}</span>
      <span className="flex-1">
        <span className="block font-display font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span className={`h-4 w-4 rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-border"}`} />
    </button>
  );
}

function PaymentInstructions({
  method,
  amount,
  settings,
  payerPhone,
  onPayerPhone,
}: {
  method: "mtn_momo" | "orange_money";
  amount: number;
  settings: PaymentSetting[];
  payerPhone: string;
  onPayerPhone: (v: string) => void;
}) {
  const provider = method === "mtn_momo" ? "mtn" : "orange";
  const s = settings.find((p) => p.provider === provider);
  if (!s) {
    return (
      <div className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        Payment details are being set up. Please use Cash on delivery for now, or contact support.
      </div>
    );
  }
  const ussd = (s.ussd_template ?? "")
    .replace("{number}", s.transfer_number.replace(/\s+/g, ""))
    .replace("{amount}", String(amount));

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-primary/30 bg-muted p-4 text-sm">
      <p className="font-medium">
        Transfer <span className="font-bold text-primary">{formatXAF(amount)}</span> to:
      </p>
      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.display_name}</p>
        <p className="font-display text-xl font-bold tracking-wide">{s.transfer_number}</p>
        <p className="text-xs text-muted-foreground">Account name: <span className="font-semibold text-foreground">{s.account_name}</span></p>
      </div>
      {ussd && (
        <div className="rounded-xl bg-background p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Shortcut code (tap to dial on phone)</p>
          <a href={`tel:${encodeURIComponent(ussd)}`} className="mt-1 inline-block font-mono text-lg font-bold text-primary underline-offset-2 hover:underline">
            {ussd}
          </a>
        </div>
      )}
      {s.instructions && <p className="text-xs text-muted-foreground">{s.instructions}</p>}
      <p className="text-xs text-muted-foreground">Use your order number as the transfer reference. We'll confirm and start preparing.</p>
      <Field label="The phone you'll pay from">
        <input className={inputCls} placeholder="+237 6XX XX XX XX" value={payerPhone} onChange={(e) => onPayerPhone(e.target.value)} />
      </Field>
    </div>
  );
}
