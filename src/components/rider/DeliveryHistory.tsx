import { useEffect, useState } from "react";
import { Clock, History, MapPin, Route as RouteIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { metersBetween } from "@/lib/nav-voice";
import { CopyButton } from "@/components/CopyButton";

type Pt = { lat: number; lng: number; t?: number };

type Row = {
  id: string;
  order_number: string;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  accepted_at: string | null;
  delivered_at: string | null;
  created_at: string;
  route_history: Pt[] | null;
};

function routeDistanceKm(pts: Pt[]) {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += metersBetween(pts[i - 1], pts[i]);
  return m / 1000;
}

function minutesBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

/** Past deliveries for this rider: pins, date, time taken and distance covered. */
export function DeliveryHistory({ riderId }: { riderId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, order_number, city, region, latitude, longitude, accepted_at, delivered_at, created_at, route_history")
        .eq("rider_id", riderId)
        .eq("delivery_status", "delivered")
        .order("delivered_at", { ascending: false })
        .limit(50);
      if (alive) setRows((data ?? []) as Row[]);
    })();
    return () => { alive = false; };
  }, [riderId]);

  if (rows === null) {
    return <div className="mt-6 grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <History className="h-5 w-5 text-primary" /> Delivery history
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Every completed delivery with its pin, date, duration and distance covered.</p>

      {rows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No completed deliveries yet.</p>}

      <div className="mt-4 space-y-3">
        {rows.map((r) => {
          const pts = Array.isArray(r.route_history) ? r.route_history : [];
          const km = routeDistanceKm(pts);
          const mins = minutesBetween(r.accepted_at, r.delivered_at);
          const open = openId === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <p className="font-display font-bold">{r.order_number}</p>
                  <CopyButton value={r.order_number} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.delivered_at ? new Date(r.delivered_at).toLocaleString() : new Date(r.created_at).toLocaleString()}
                </p>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Clock className="h-3 w-3" />{mins != null ? `${mins} min` : "—"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <RouteIcon className="h-3 w-3" />{km > 0 ? `${km.toFixed(2)} km` : "—"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <MapPin className="h-3 w-3" />{r.city || "—"}{r.region ? `, ${r.region}` : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  {pts.length} pins
                </span>
              </div>

              {r.latitude != null && r.longitude != null && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Buyer pin: {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                </p>
              )}

              {pts.length > 0 && (
                <>
                  <button
                    onClick={() => setOpenId(open ? null : r.id)}
                    className="mt-3 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    {open ? "Hide route pins" : "View route pins"}
                  </button>
                  {open && (
                    <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-muted/50 p-2 text-[11px]">
                      {pts.map((p, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>{i + 1}. {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                          <span className="text-muted-foreground">
                            {p.t ? new Date(p.t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
