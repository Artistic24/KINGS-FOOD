import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, Circle, Bike } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatXAF } from "@/lib/format";
import { MapPicker } from "@/components/MapPicker";
import { CopyButton } from "@/components/CopyButton";
import { buyerPin } from "@/lib/buyer-pin";
import { GoogleMap } from "@/components/GoogleMap";
import { computeRoute } from "@/lib/rider.functions";

export const Route = createFileRoute("/orders/$orderNumber")({
  head: ({ params }) => ({ meta: [{ title: `Order ${params.orderNumber} — St Kingston` }] }),
  component: OrderPage,
});

const STATUS_FLOW = [
  { key: "placed", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "dispatched", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

function OrderPage() {
  const { orderNumber } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [rider, setRider] = useState<any>(null);
  const [riderLoc, setRiderLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const prevDeliveryStatus = useState<{ current?: string }>({ current: undefined })[0];

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      const { data: o } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (o) {
        setOrder(o);
        prevDeliveryStatus.current = (o as any).delivery_status;
        const { data: its } = await supabase.from("order_items").select("*").eq("order_id", o.id);
        setItems(its ?? []);
        if ((o as any).rider_id) await loadRider(o.id, (o as any).rider_id);
      }
      setLoading(false);
    })();
  }, [orderNumber, user, authLoading]);

  const loadRider = async (orderId: string, riderId: string) => {
    const { data: r } = await (supabase as any).from("riders").select("*").eq("user_id", riderId).maybeSingle();
    setRider(r);
    const { data: loc } = await (supabase as any).from("rider_locations").select("lat, lng").eq("order_id", orderId).maybeSingle();
    if (loc) setRiderLoc({ lat: loc.lat, lng: loc.lng });
  };

  // Live subscription
  useEffect(() => {
    if (!order?.id) return;
    const ch = supabase
      .channel(`order-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => {
        const next = payload.new as any;
        if (next.delivery_status === "arrived" && prevDeliveryStatus.current !== "arrived") {
          toast.success("🛵 Your rider has arrived!", { description: "Come out to collect your order." });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Your rider has arrived", { body: `Order ${next.order_number}` });
          }
        }
        prevDeliveryStatus.current = next.delivery_status;
        setOrder(next);
        if (next.rider_id && !rider) loadRider(next.id, next.rider_id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations", filter: `order_id=eq.${order.id}` }, (payload) => {
        const n = payload.new as any;
        if (n) setRiderLoc({ lat: n.lat, lng: n.lng });
      })
      .subscribe();
    // ask notification permission once
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    return () => { supabase.removeChannel(ch); };
  }, [order?.id, rider]);

  if (authLoading || loading) {
    return <div className="mx-auto py-20 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to view your order</h1>
        <Link to="/auth" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">Sign in</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Order not found</h1>
        <Link to="/account" className="mt-4 inline-block text-primary underline">Your orders</Link>
      </div>
    );
  }

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === order.status);
  const isDelivered = order.delivery_status === "delivered" || order.status === "delivered";
  const deliveryMarkers: any[] = [];
  if (riderLoc && !isDelivered) deliveryMarkers.push({ ...riderLoc, color: "blue", label: "R", title: "Rider" });
  const buyerLoc = buyerPin(order);
  if (buyerLoc) deliveryMarkers.push({ lat: buyerLoc.lat, lng: buyerLoc.lng, color: "red", label: "You", title: "Delivery address" });
  const routeHistory: Array<{ lat: number; lng: number }> = Array.isArray((order as any).route_history) ? (order as any).route_history : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-saffron/10 to-forest/10 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Order confirmed</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold md:text-4xl">{order.order_number}<CopyButton value={order.order_number} /></h1>
            <p className="mt-1 text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span className="rounded-full bg-card px-4 py-1.5 text-sm font-semibold capitalize">{order.status.replace("_", " ")}</span>
        </div>

        {order.payment_status !== "confirmed" && order.payment_method !== "cash_on_delivery" && (
          <div className="mt-5 rounded-2xl bg-card p-4 text-sm">
            <p className="font-display font-bold">⏳ Awaiting payment confirmation</p>
            <p className="mt-1 text-muted-foreground">
              Please transfer <span className="font-bold text-primary">{formatXAF(order.total_xaf)}</span> via{" "}
              {order.payment_method === "mtn_momo" ? "MTN Mobile Money" : "Orange Money"} using <span className="font-bold">{order.order_number}</span> as reference.
            </p>
          </div>
        )}
      </div>

      {rider && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Bike className="h-5 w-5 text-primary" /> {isDelivered ? "Delivered by" : "Your rider"}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-bold">{rider.full_name?.[0]?.toUpperCase() || "R"}</div>
            <div>
              <p className="font-semibold">{rider.full_name}</p>
              <a href={`tel:${rider.phone}`} className="text-sm text-primary underline">{rider.phone}</a>
              {order.delivery_status && <p className="mt-0.5 text-xs text-muted-foreground capitalize">Status: {String(order.delivery_status).replace("_", " ")}</p>}
              {isDelivered && order.delivered_at && (
                <p className="text-[11px] text-muted-foreground">Delivered {new Date(order.delivered_at).toLocaleString()}</p>
              )}
            </div>
          </div>
          {isDelivered && routeHistory.length > 1 ? (
            <DeliveredRouteMap points={routeHistory} destination={buyerLoc ? { lat: buyerLoc.lat, lng: buyerLoc.lng } : { lat: order.latitude, lng: order.longitude }} />
          ) : (
            <LiveRiderMap order={order} riderLoc={riderLoc} markers={deliveryMarkers} />
          )}
          {order.delivery_status === "arrived" && (
            <div className="mt-3 rounded-xl border border-saffron/40 bg-saffron/10 p-3 text-sm">
              🛵 <b>Your rider has arrived!</b> Please come out to collect your order.
            </div>
          )}
        </section>
      )}


      {/* Status timeline */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Delivery progress</h2>
        <ol className="mt-4 space-y-3">
          {STATUS_FLOW.map((s, i) => {
            const done = i <= currentIdx && order.status !== "cancelled";
            return (
              <li key={s.key} className="flex items-center gap-3">
                {done ? <CheckCircle2 className="h-5 w-5 text-forest" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <span className={done ? "font-semibold" : "text-muted-foreground"}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Static map fallback when no rider */}
      {!rider && buyerLoc && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Delivery location</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.street && `${order.street}, `}{order.city}, {order.region}
            {order.landmark && ` · near ${order.landmark}`}
          </p>
          <div className="mt-4">
            <MapPicker lat={buyerLoc.lat} lng={buyerLoc.lng} onChange={() => {}} readOnly height={260} />
          </div>
        </section>
      )}

      {/* Items */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Items</h2>
        <ul className="mt-3 divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between py-2 text-sm">
              <span>{it.quantity}× {it.product_name}</span>
              <span className="font-medium">{formatXAF(it.line_total_xaf)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatXAF(order.subtotal_xaf)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatXAF(order.delivery_fee_xaf)}</span></div>
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-display font-bold">Total</span>
            <span className="font-display text-xl font-bold text-primary">{formatXAF(order.total_xaf)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function LiveRiderMap({
  order,
  riderLoc,
  markers,
}: {
  order: any;
  riderLoc: { lat: number; lng: number } | null;
  markers: any[];
}) {
  const compute = useServerFn(computeRoute);
  const [route, setRoute] = useState<{ distanceMeters: number | null; seconds: number | null; polyline: string | null } | null>(null);

  useEffect(() => {
    const target = buyerPin(order);
    if (!riderLoc || !target) return;
    let cancelled = false;
    compute({ data: { origin: riderLoc, dest: { lat: target.lat, lng: target.lng } } })
      .then((r) => { if (!cancelled) setRoute(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [riderLoc?.lat, riderLoc?.lng, order.latitude, order.longitude, compute]);

  if (markers.length === 0) return null;
  return (
    <div className="mt-4">
      <GoogleMap
        center={riderLoc || markers[0]}
        markers={markers}
        drawLineBetween
        routePolyline={route?.polyline ?? null}
        mapType="hybrid"
        followFirstMarker={!!riderLoc}
        height={340}
      />
      {route && (
        <p className="mt-2 text-xs text-muted-foreground">
          Rider is {route.distanceMeters ? `${(route.distanceMeters / 1000).toFixed(1)} km` : "—"} away · ETA {route.seconds ? `${Math.round(route.seconds / 60)} min` : "—"}
        </p>
      )}
    </div>
  );
}


function DeliveredRouteMap({
  points,
  destination,
}: {
  points: Array<{ lat: number; lng: number }>;
  destination: { lat: number | null; lng: number | null };
}) {
  const start = points[0];
  const end = points[points.length - 1];
  const markers: any[] = [{ ...start, color: "green", label: "S", title: "Start" }];
  if (destination.lat && destination.lng) markers.push({ lat: destination.lat, lng: destination.lng, color: "red", label: "E", title: "Delivered here" });
  else markers.push({ ...end, color: "red", label: "E", title: "End" });
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-muted-foreground">📍 Route the rider took ({points.length} GPS points)</p>
      <GoogleMap
        center={start}
        markers={markers}
        pathPoints={points}
        mapType="hybrid"
        height={340}
      />
    </div>
  );
}


