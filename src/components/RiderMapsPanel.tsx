import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Search,
  X,
  Navigation,
  MapPin,
  Crosshair,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  RotateCcw,
  Milestone,
  Compass,
  Flag,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap } from "@/components/GoogleMap";
import { computeRoute, type NavStep } from "@/lib/rider.functions";
import { CopyButton } from "@/components/CopyButton";
import { useNavVoice } from "@/hooks/use-nav-voice";
import { nextStepAhead, setVoiceEnabled, stopRinging } from "@/lib/nav-voice";
import { buyerPin } from "@/lib/buyer-pin";

type Found = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  origin_accuracy_m: number | null;
};

type RouteInfo = {
  distanceMeters: number | null;
  seconds: number | null;
  polyline: string | null;
  steps?: NavStep[];
};

/** Normalise whatever the rider types into the stored KF-XXXX form. */
function normaliseCode(raw: string) {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  return t.startsWith("KF-") || t.startsWith("SK-") ? t : `KF-${t.replace(/^KF/, "")}`;
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial bearing in degrees (0 = north, clockwise). */
function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function ManeuverIcon({ maneuver, className }: { maneuver: string | null | undefined; className?: string }) {
  const m = (maneuver ?? "").toUpperCase();
  if (m.includes("LEFT")) return <CornerUpLeft className={className} />;
  if (m.includes("RIGHT")) return <CornerUpRight className={className} />;
  if (m.includes("UTURN")) return <RotateCcw className={className} />;
  if (m.includes("DESTINATION")) return <Flag className={className} />;
  if (m.includes("ROUNDABOUT") || m.includes("MERGE") || m.includes("FORK")) return <Milestone className={className} />;
  return <ArrowUp className={className} />;
}

function fmtMeters(m: number | null | undefined) {
  if (m == null) return "—";
  return m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function RiderMapsPanel({ onClose, riderId }: { onClose: () => void; riderId?: string }) {
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [navMode, setNavMode] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const compute = useServerFn(computeRoute);
  const watchIdRef = useRef<number | null>(null);
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);


  // Continuous high-accuracy GPS so the rider arrow + route stay live.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const prev = prevRef.current;
        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        } else if (prev && metersBetween(prev, next) > 3) {
          setHeading(bearing(prev, next));
        }
        prevRef.current = next;
        setMyLoc(next);
      },
      (err) => console.warn("GPS:", err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const search = async () => {
    const code = normaliseCode(q);
    if (!code) return toast.error("Enter an order number, e.g. KF-6TU1");
    setSearching(true);
    setRoute(null);
    // Only orders this rider has accepted (or is already delivering) can be searched.
    let query = (supabase as any)
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, street, city, region, landmark, latitude, longitude, origin_latitude, origin_longitude, origin_accuracy_m")
      .ilike("order_number", code)
      .in("delivery_status", ["accepted", "picked_up", "en_route", "arrived"]);
    if (riderId) query = query.eq("rider_id", riderId);
    const { data, error } = await query.maybeSingle();
    setSearching(false);
    if (error) return toast.error(error.message);
    if (!data) {
      setFound(null);
      return toast.error(`${code} isn't one of your accepted deliveries`);
    }
    if (!buyerPin(data)) {
      setFound(data);
      return toast.error("That order has no delivery pin saved");
    }
    setFound(data);
    toast.success(`Found ${data.order_number}`);
  };


  // Recompute the fastest route whenever the rider moves or a new order is found.
  const lastRef = useRef<{ lat: number; lng: number; t: number; id: string } | null>(null);
  useEffect(() => {
    const target = buyerPin(found);
    if (!myLoc || !target || !found) return;
    const last = lastRef.current;
    const now = Date.now();
    const movedFar = !last || last.id !== found.id || metersBetween(last, myLoc) > 25;
    const stale = !last || now - last.t > 12000;
    if (!movedFar && !stale) return;
    lastRef.current = { ...myLoc, t: now, id: found.id };

    compute({ data: { origin: myLoc, dest: { lat: target.lat, lng: target.lng } } })
      .then((r) => setRoute(r as RouteInfo))
      .catch((e) => console.warn("route failed:", e.message));
  }, [myLoc, found, compute]);

  // Next manoeuvre = the step the rider is genuinely approaching (steps already
  // driven past are ignored, which is what caused bogus "600 m — Head" banners).
  const nextStep = useMemo(() => {
    const ahead = nextStepAhead(myLoc, route?.steps ?? []);
    return ahead ? { ...ahead.step, distanceToTurn: ahead.meters } : null;
  }, [route, myLoc]);


  const destPin = buyerPin(found);
  const dest = destPin ? { lat: destPin.lat, lng: destPin.lng } : null;
  const straightMeters = myLoc && dest ? metersBetween(myLoc, dest) : null;

  const markers: any[] = [];
  if (myLoc && !navMode) markers.push({ ...myLoc, color: "blue", label: "You", title: "Your position" });
  if (dest) markers.push({ ...dest, color: "red", label: "B", title: found?.customer_name || "Buyer" });

  const center = dest ?? myLoc ?? { lat: 3.848, lng: 11.502 };
  const etaMin = route?.seconds ? Math.max(1, Math.round(route.seconds / 60)) : null;
  const arriveAt = etaMin
    ? new Date(Date.now() + etaMin * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  useEffect(() => { setVoiceEnabled(voiceOn); }, [voiceOn]);
  useEffect(() => () => stopRinging(), []);
  useNavVoice({
    enabled: voiceOn,
    myLoc,
    dest,
    steps: route?.steps ?? [],
    etaSeconds: route?.seconds ?? null,
    routeKey: found?.id ?? "none",
  });


  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search order number, e.g. KF-6TU1"
            className="w-full rounded-full border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <button onClick={search} disabled={searching} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
        </button>
        <button
          onClick={() => { setVoiceOn((v) => !v); if (voiceOn) stopRinging(); }}
          aria-label={voiceOn ? "Mute voice guidance" : "Enable voice guidance"}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted"
        >
          {voiceOn ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
        </button>
        <button onClick={onClose} aria-label="Close map" className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
          <X className="h-5 w-5" />
        </button>

      </div>




      <div className="relative flex-1">
        <GoogleMap
          center={center}
          zoom={navMode ? 18 : 15}
          markers={markers}
          drawLineBetween
          routePolyline={route?.polyline ?? null}
          mapType="hybrid"
          height="100%"
          className="!rounded-none !border-0"
          followFirstMarker={false}
          navArrow={myLoc ? { ...myLoc, heading } : null}
          rotateWithHeading={navMode}
          tilt={navMode ? 60 : 45}
          refitKey={`${found?.id ?? "none"}-${navMode ? "nav" : "overview"}`}
        />

        {/* Turn-by-turn banner */}
        {dest && nextStep && (
          <div className="absolute inset-x-3 top-3 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg">
            <ManeuverIcon maneuver={nextStep.maneuver} className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">{fmtMeters(nextStep.distanceToTurn)}</p>
              <p className="truncate text-xs opacity-90">{nextStep.instruction ?? "Continue on the blue route"}</p>
            </div>
          </div>
        )}

        {/* Recenter / rotation toggle */}
        <button
          onClick={() => setNavMode((v) => !v)}
          className="absolute right-3 top-20 grid h-11 w-11 place-items-center rounded-full bg-background/95 shadow-lg"
          aria-label={navMode ? "Show overview" : "Start navigation view"}
        >
          <Compass className={`h-5 w-5 ${navMode ? "text-primary" : "text-muted-foreground"}`} />
        </button>

        {/* ETA / distance bar */}
        {dest && (
          <div className="absolute inset-x-3 bottom-4 flex items-center justify-between rounded-2xl bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
            <div>
              <p className="text-lg font-bold leading-none text-primary">{etaMin ? `${etaMin} min` : "—"}</p>
              <p className="text-xs text-muted-foreground">
                {fmtMeters(route?.distanceMeters ?? straightMeters)} · {arriveAt ? `arrive ${arriveAt}` : "calculating…"}
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Navigation className="h-3.5 w-3.5" /> fastest route
            </span>
          </div>
        )}

        {!found && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full bg-background/90 px-4 py-2 text-xs text-muted-foreground shadow">
            <Crosshair className="mr-1 inline h-3.5 w-3.5" />
            Search one of your accepted deliveries to drop the buyer's pin and get voice-guided directions
          </div>
        )}
      </div>
    </div>
  );
}
