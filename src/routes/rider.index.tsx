import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Navigation, CheckCircle2, AlertTriangle, Phone, Map as MapIcon, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { buyerPin } from "@/lib/buyer-pin";
import { GoogleMap } from "@/components/GoogleMap";
import { computeRoute } from "@/lib/rider.functions";
import { formatXAF } from "@/lib/format";
import { RiderMapsPanel } from "@/components/RiderMapsPanel";
import { CopyButton } from "@/components/CopyButton";
import { useNavVoice } from "@/hooks/use-nav-voice";
import { DeliveryHistory } from "@/components/rider/DeliveryHistory";
import { metersBetween, nextStepAhead, ringArrival, setVoiceEnabled, speak, stopRinging } from "@/lib/nav-voice";


export const Route = createFileRoute("/rider/")({
  head: () => ({ meta: [{ title: "Rider dashboard — St Kingston" }, { name: "robots", content: "noindex" }] }),
  component: RiderDashboard,
});

function RiderDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [mapsOpen, setMapsOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !user) { setChecking(false); return; }
    (async () => {
      const { data } = await (supabase as any).from("riders").select("*").eq("user_id", user.id).maybeSingle();
      setRider(data);
      setChecking(false);
    })();
  }, [user, authLoading]);

  useEffect(() => {
    if (!rider) return;
    const load = async () => {
      const { data: mine } = await (supabase as any)
        .from("orders")
        .select("*")
        .eq("rider_id", rider.user_id)
        .in("delivery_status", ["accepted", "picked_up", "en_route", "arrived"])
        .order("created_at", { ascending: false })
        .limit(1);
      setActive(mine?.[0] ?? null);

      const { data: avail } = await (supabase as any)
        .from("orders")
        .select("*")
        .is("rider_id", null)
        .in("delivery_status", ["unassigned", "incident"])
        .in("status", ["placed", "confirmed", "preparing", "dispatched"])
        .order("created_at", { ascending: false })
        .limit(20);
      setAvailable(avail ?? []);
    };
    load();
    const ch = supabase
      .channel("rider-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rider]);

  if (authLoading || checking) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Sign in required</h1>
      <Link to="/auth" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Sign in</Link>
    </div>
  );
  if (!rider) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <MapPin className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-bold">You're not a rider yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">Apply and get approved by an admin.</p>
      <Link to="/rider/apply" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Apply now</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Rider dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hi {rider.full_name}, ready to ride?</p>
        </div>
        <button
          onClick={() => setMapsOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <MapIcon className="h-4 w-4" />Maps
        </button>
      </div>
      {mapsOpen && <RiderMapsPanel onClose={() => setMapsOpen(false)} riderId={rider.user_id} />}

      {active ? (
        <ActiveDelivery order={active} rider={rider} onDone={() => setActive(null)} />
      ) : (
        <AvailableList orders={available} rider={rider} />
      )}

      <DeliveryHistory riderId={rider.user_id} />
    </div>
  );
}

function AvailableList({ orders, rider }: { orders: any[]; rider: any }) {
  const [reports, setReports] = useState<Record<string, Array<{ kind: string; note: string; created_at: string }>>>({});
  const [cancels, setCancels] = useState<Record<string, Array<{ reason: string | null; created_at: string }>>>({});

  // Show any accident report / cancellation reason before a new rider re-accepts.
  useEffect(() => {
    const ids = orders.map((o) => o.id);
    if (ids.length === 0) { setReports({}); setCancels({}); return; }
    (async () => {
      const [{ data: reps }, { data: cans }] = await Promise.all([
        (supabase as any).from("delivery_reports").select("order_id, kind, note, created_at").in("order_id", ids),
        (supabase as any).from("rider_cancellations").select("order_id, reason, created_at").in("order_id", ids),
      ]);
      const g1: any = {}, g2: any = {};
      (reps ?? []).forEach((r: any) => { (g1[r.order_id] ||= []).push(r); });
      (cans ?? []).forEach((c: any) => { (g2[c.order_id] ||= []).push(c); });
      setReports(g1); setCancels(g2);
    })();
  }, [orders]);

  const accept = async (o: any) => {
    const { error } = await (supabase as any)
      .from("orders")
      .update({ rider_id: rider.user_id, delivery_status: "accepted" })
      .eq("id", o.id)
      .is("rider_id", null);
    if (error) return toast.error(error.message);
    toast.success("Order accepted!");
  };
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-bold">Available pickups</h2>
      {orders.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No pickups available right now. Check back soon.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => {
            const incidents = reports[o.id] ?? [];
            const cancelled = cancels[o.id] ?? [];
            return (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 font-display font-bold">{o.order_number}<CopyButton value={o.order_number} /></p>
                  <p className="text-xs text-muted-foreground">{o.customer_name} · {o.customer_phone}</p>
                  <p className="mt-1 text-sm">{o.street ? `${o.street}, ` : ""}{o.city}, {o.region}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{formatXAF(o.total_xaf)}</p>
                  <button onClick={() => accept(o)} className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Accept</button>
                </div>
              </div>

              {(incidents.length > 0 || cancelled.length > 0) && (
                <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />Previous incident on this order
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-foreground/80">
                    {incidents.map((r, i) => (
                      <li key={`r${i}`}>
                        <span className="font-semibold capitalize">{r.kind}</span> · {new Date(r.created_at).toLocaleString()} — {r.note}
                      </li>
                    ))}
                    {cancelled.map((c, i) => (
                      <li key={`c${i}`}>
                        <span className="font-semibold">Cancelled by a rider</span> · {new Date(c.created_at).toLocaleString()}
                        {c.reason ? ` — ${c.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}


function ActiveDelivery({ order, rider, onDone }: { order: any; rider: any; onDone: () => void }) {
  const [route, setRoute] = useState<{ distanceMeters: number | null; seconds: number | null; polyline: string | null; steps?: any[] } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const compute = useServerFn(computeRoute);


  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsError("GPS not available on this device");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setMyLoc({ lat, lng });
        setGpsError(null);
        // Push live location so the buyer sees us move.
        const { error } = await (supabase as any).from("rider_locations").upsert(
          {
            order_id: order.id,
            rider_id: rider.user_id,
            lat, lng,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "order_id" },
        );
        if (error) console.warn("location upsert failed:", error.message);
        // Persist a breadcrumb so the route can be replayed in order history.
        (supabase as any).rpc("append_route_point", { _order_id: order.id, _lat: lat, _lng: lng })
          .then(({ error: e }: any) => { if (e) console.warn("route append failed:", e.message); });
      },
      (err) => {
        setGpsError(err.message || "GPS unavailable");
        console.warn("GPS error:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [order.id, rider.user_id]);

  const cancelOrder = async () => {
    const reason = prompt("Why are you cancelling? (short reason, shown to admins)");
    if (reason === null) return;
    const { error } = await (supabase as any).rpc("cancel_rider_order", {
      _order_id: order.id, _reason: reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Order released back to the pool");
    onDone();
  };

  // Live travel direction for the 3D navigation arrow.
  const [heading, setHeading] = useState(0);
  const prevLocRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!myLoc) return;
    const prev = prevLocRef.current;
    if (prev) {
      const dx = Math.hypot(prev.lat - myLoc.lat, prev.lng - myLoc.lng) * 111000;
      if (dx > 3) {
        const y = Math.sin(((myLoc.lng - prev.lng) * Math.PI) / 180) * Math.cos((myLoc.lat * Math.PI) / 180);
        const x =
          Math.cos((prev.lat * Math.PI) / 180) * Math.sin((myLoc.lat * Math.PI) / 180) -
          Math.sin((prev.lat * Math.PI) / 180) * Math.cos((myLoc.lat * Math.PI) / 180) * Math.cos(((myLoc.lng - prev.lng) * Math.PI) / 180);
        setHeading((Math.atan2(y, x) * 180) / Math.PI);
      }
    }
    prevLocRef.current = myLoc;
  }, [myLoc]);

  // Recompute route when rider moves a meaningful distance (>75m) or every 30s.
  const lastRouteRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  useEffect(() => {
    const target = buyerPin(order);
    if (!myLoc || !target) return;
    const last = lastRouteRef.current;
    const now = Date.now();
    const movedFar = !last || Math.hypot(last.lat - myLoc.lat, last.lng - myLoc.lng) * 111000 > 25;
    const stale = !last || now - last.t > 12000;
    if (!movedFar && !stale) return;
    lastRouteRef.current = { ...myLoc, t: now };
    compute({ data: { origin: myLoc, dest: { lat: target.lat, lng: target.lng } } })
      .then(setRoute)
      .catch((e) => console.warn("ETA failed:", e.message));
  }, [myLoc, order.latitude, order.longitude, order.origin_latitude, order.origin_longitude, compute]);

  const setStatus = async (delivery_status: string, extra: Record<string, any> = {}, successMsg?: string) => {
    const { error } = await (supabase as any).from("orders").update({ delivery_status, ...extra }).eq("id", order.id);
    if (error) { toast.error(error.message); return false; }
    // Optimistic local update so the UI reflects the new status even before realtime fires.
    Object.assign(order, { delivery_status, ...extra });
    if (successMsg) toast.success(successMsg);
    return true;
  };

  const markArrived = async () => {
    await setStatus("arrived", { arrived_at: new Date().toISOString() });
    speak("You have arrived at the buyer's location");
    ringArrival(10);
    toast.success("Buyer notified of your arrival");
  };
  const markDelivered = async () => {
    stopRinging();
    await setStatus("delivered", { delivered_at: new Date().toISOString(), status: "delivered" });
    await (supabase as any).from("rider_locations").delete().eq("order_id", order.id);
    toast.success("Delivery completed!");
    onDone();
  };

  const submitReport = async () => {
    if (!reportNote.trim()) return toast.error("Add a short report");
    const { error } = await (supabase as any).from("delivery_reports").insert({
      order_id: order.id, rider_id: rider.user_id, kind: "accident", note: reportNote.trim(),
    });
    if (error) return toast.error(error.message);
    // Release the order back into the pool so another rider can pick it up —
    // they'll see this report before accepting.
    await setStatus("incident", { status: "confirmed", rider_id: null });
    await (supabase as any).from("rider_locations").delete().eq("order_id", order.id);
    toast.success("Report submitted. Order returned to the pending pool.");
    setReporting(false); setReportNote(""); onDone();
  };

  const destPin = buyerPin(order);
  const markers: any[] = [];
  if (destPin) markers.push({ lat: destPin.lat, lng: destPin.lng, color: "red", label: "B", title: "Buyer" });

  const dest = destPin ? { lat: destPin.lat, lng: destPin.lng } : null;
  const metersToBuyer = myLoc && dest ? metersBetween(myLoc, dest) : null;
  // Delivered can only be confirmed on the doorstep (≤3 m) or once "Arrived" was tapped.
  const canDeliver = order.delivery_status === "arrived" || (metersToBuyer != null && metersToBuyer <= 3);

  useEffect(() => { setVoiceEnabled(voiceOn); }, [voiceOn]);
  useEffect(() => () => stopRinging(), []);
  useNavVoice({
    enabled: voiceOn,
    myLoc,
    dest,
    steps: (route?.steps ?? []) as any[],
    etaSeconds: route?.seconds ?? null,
    routeKey: order.id,
  });

  // Next turn to display — anchored on the manoeuvre the rider is approaching.
  const nextTurn = (() => {
    const ahead = nextStepAhead(myLoc, ((route as any)?.steps ?? []) as any[]);
    return ahead ? { instruction: ahead.step.instruction as string | null, meters: ahead.meters } : null;
  })();



  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Active delivery</p>
            <p className="mt-1 flex items-center gap-1 font-display text-xl font-bold">{order.order_number}<CopyButton value={order.order_number} /></p>
            <p className="text-sm">{order.customer_name}</p>
            <a href={`tel:${order.customer_phone}`} className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline"><Phone className="h-3 w-3" />{order.customer_phone}</a>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground capitalize">{order.delivery_status.replace("_", " ")}</span>
            <button
              onClick={() => { setVoiceOn((v) => !v); if (voiceOn) stopRinging(); }}
              aria-label={voiceOn ? "Mute voice guidance" : "Enable voice guidance"}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold"
            >
              {voiceOn ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
              {voiceOn ? "Voice on" : "Voice off"}
            </button>
          </div>

        </div>
        <p className="mt-2 text-sm"><MapPin className="mr-1 inline h-4 w-4" />{order.street ? `${order.street}, ` : ""}{order.city}, {order.region}{order.landmark && ` · near ${order.landmark}`}</p>
        {route && (
          <p className="mt-2 text-sm text-muted-foreground">
            <Navigation className="mr-1 inline h-4 w-4" />
            {route.distanceMeters ? `${(route.distanceMeters / 1000).toFixed(1)} km` : "—"} · ETA {route.seconds ? `${Math.round(route.seconds / 60)} min` : "—"}
          </p>
        )}
        {nextTurn?.instruction && (
          <p className="mt-1 text-sm font-semibold text-primary">
            ↱ {nextTurn.meters < 950 ? `${Math.round(nextTurn.meters / 10) * 10} m` : `${(nextTurn.meters / 1000).toFixed(1)} km`} · {nextTurn.instruction}
          </p>
        )}
        {order.payment_proof_url && (
          <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-forest underline">
            🧾 View buyer's payment screenshot
          </a>
        )}
        {gpsError && <p className="mt-2 text-xs text-destructive">GPS: {gpsError}. Enable location to share your position.</p>}
      </div>

      {dest && (
        <GoogleMap
          center={myLoc || dest}
          markers={markers}
          drawLineBetween
          routePolyline={route?.polyline ?? null}
          mapType="hybrid"
          height={360}
          navArrow={myLoc ? { ...myLoc, heading } : null}
          rotateWithHeading
          tilt={60}
        />
      )}


      <div className="grid gap-2 sm:grid-cols-3">
        {order.delivery_status === "accepted" && (
          <button onClick={() => setStatus("picked_up", {}, "Marked as picked up")} className="rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-forest-foreground">Picked up</button>
        )}
        {order.delivery_status === "picked_up" && (
          <button onClick={() => setStatus("en_route", {}, "You're now en route")} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2">En route to buyer</button>
        )}
        {order.delivery_status === "en_route" && (
          <button onClick={markArrived} className="rounded-full bg-saffron px-4 py-2.5 text-sm font-semibold text-saffron-foreground sm:col-span-2">Arrived at buyer</button>
        )}
        {(order.delivery_status === "en_route" || order.delivery_status === "arrived") && (
          <button
            onClick={markDelivered}
            disabled={!canDeliver}
            title={canDeliver ? "Confirm delivery" : "Available within 3 m of the buyer, or after tapping Arrived"}
            className="rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-forest-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
          >
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            {canDeliver ? "Delivered" : `Delivered · ${metersToBuyer != null ? `${Math.round(metersToBuyer)} m away` : "locating…"}`}
          </button>
        )}

        <button onClick={() => setReporting(true)} className="rounded-full border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive"><AlertTriangle className="mr-1 inline h-4 w-4" />Report accident</button>
        {order.delivery_status !== "delivered" && (
          <button onClick={cancelOrder} className="rounded-full border border-input px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted">Cancel & release</button>
        )}
      </div>

      {reporting && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-display font-bold">Incident report</p>
          <textarea value={reportNote} onChange={(e) => setReportNote(e.target.value)} rows={4} maxLength={500} className="mt-2 w-full rounded-lg border border-input bg-background p-2 text-sm" placeholder="Briefly describe what happened..." />
          <div className="mt-2 flex gap-2">
            <button onClick={submitReport} className="flex-1 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">Submit report</button>
            <button onClick={() => setReporting(false)} className="rounded-full border border-input px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
