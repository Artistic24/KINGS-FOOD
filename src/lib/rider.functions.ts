import { createServerFn } from "@tanstack/react-start";

export type NavStep = {
  maneuver: string | null;
  instruction: string | null;
  distanceMeters: number | null;
  endLat: number | null;
  endLng: number | null;
};

type LatLng = { lat: number; lng: number };

/* ------------------------- geo helpers ------------------------- */

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

function haversine(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Decode a Google encoded polyline into points (used to audit route endpoints). */
function decodePolyline(str: string): LatLng[] {
  const pts: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

function encodeValue(v: number, out: string[]) {
  let value = v < 0 ? ~(v << 1) : v << 1;
  while (value >= 0x20) {
    out.push(String.fromCharCode((0x20 | (value & 0x1f)) + 63));
    value >>= 5;
  }
  out.push(String.fromCharCode(value + 63));
}

function encodePolyline(points: LatLng[]) {
  const out: string[] = [];
  let lat = 0, lng = 0;
  for (const p of points) {
    const la = Math.round(p.lat * 1e5);
    const ln = Math.round(p.lng * 1e5);
    encodeValue(la - lat, out);
    encodeValue(ln - lng, out);
    lat = la; lng = ln;
  }
  return out.join("");
}

/* ------------------------- Routes API ------------------------- */

type ApiStep = {
  distanceMeters?: number;
  staticDuration?: string;
  endLocation?: { latLng?: { latitude?: number; longitude?: number } };
  navigationInstruction?: { maneuver?: string; instructions?: string };
};
type ApiRoute = {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  legs?: Array<{ steps?: ApiStep[] }>;
};

const FIELD_MASK =
  "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.endLocation";

async function callRoutes(
  origin: LatLng,
  dest: LatLng,
  opts: { traffic: "TRAFFIC_AWARE_OPTIMAL" | "TRAFFIC_AWARE" | "TRAFFIC_UNAWARE"; alternatives: boolean },
): Promise<ApiRoute[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const gmapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !gmapsKey) throw new Error("Google Maps not configured");

  const res = await fetch(
    "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        // sideOfRoad keeps the route ending on the buyer's exact side of the street
        destination: {
          location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
          sideOfRoad: true,
        },
        travelMode: "DRIVE",
        routingPreference: opts.traffic,
        computeAlternativeRoutes: opts.alternatives,
        polylineQuality: "HIGH_QUALITY",
        polylineEncoding: "ENCODED_POLYLINE",
        languageCode: "en-US",
        units: "METRIC",
        routeModifiers: { avoidFerries: true },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Routes API ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { routes?: ApiRoute[] };
  return json.routes ?? [];
}

type Scored = {
  route: ApiRoute;
  points: LatLng[];
  startGap: number;
  endGap: number;
  detour: number;
  seconds: number;
  meters: number;
  score: number;
};

/** Decode and measure every candidate route. */
function scoreRoutes(routes: ApiRoute[], origin: LatLng, dest: LatLng): Scored[] {
  const straight = Math.max(haversine(origin, dest), 1);
  return routes
    .map((route) => {
      const enc = route.polyline?.encodedPolyline ?? "";
      const points = enc ? decodePolyline(enc) : [];
      if (points.length < 2) return null;
      const startGap = haversine(points[0], origin);
      const endGap = haversine(points[points.length - 1], dest);
      const meters = route.distanceMeters ?? straight;
      const seconds = route.duration ? parseInt(String(route.duration).replace(/\D/g, ""), 10) || 0 : 0;
      return { route, points, startGap, endGap, detour: meters / straight, seconds, meters, score: 0 } as Scored;
    })
    .filter((r): r is Scored => r !== null);
}

/** Largest distance the path strays from the destination beyond where it started (moving away). */
function backtrack(points: LatLng[], dest: LatLng) {
  const start = haversine(points[0], dest);
  let worst = 0;
  for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 80))) {
    worst = Math.max(worst, haversine(points[i], dest) - start);
  }
  return worst;
}

/** A candidate is only trustworthy if it truly connects origin -> buyer without wild loops. */
function isSane(c: Scored, straight: number, dest: LatLng) {
  const endTol = Math.max(80, straight * 0.04);
  const startTol = Math.max(100, straight * 0.06);
  const maxDetour = straight < 1500 ? 4 : straight < 15000 ? 2.4 : 1.8;
  const maxBack = Math.max(400, straight * 0.25);
  return c.endGap <= endTol && c.startGap <= startTol && c.detour <= maxDetour && backtrack(c.points, dest) <= maxBack;
}

/**
 * Among sane routes, keep only those within 15% of the shortest road distance,
 * then take the fastest. Stops a "faster" route that drives far out of the way.
 */
function pickBest(sane: Scored[]): Scored | null {
  if (!sane.length) return null;
  const shortest = Math.min(...sane.map((c) => c.meters));
  const near = sane.filter((c) => c.meters <= shortest * 1.15 + 150);
  return near.sort((a, b) => (a.seconds || a.meters) - (b.seconds || b.meters) || a.meters - b.meters)[0];
}

// Compute driving distance + ETA via Google Routes API through the connector gateway.
export const computeRoute = createServerFn({ method: "POST" })
  .inputValidator((d: { origin: LatLng; dest: LatLng }) => {
    const ok = (v: unknown) => typeof v === "number" && Number.isFinite(v);
    if (!ok(d?.origin?.lat) || !ok(d?.origin?.lng) || !ok(d?.dest?.lat) || !ok(d?.dest?.lng)) {
      throw new Error("Invalid coordinates");
    }
    if (Math.abs(d.origin.lat) > 90 || Math.abs(d.dest.lat) > 90) throw new Error("Invalid coordinates");
    return d;
  })
  .handler(async ({ data }) => {
    const { origin, dest } = data;
    const straight = Math.max(haversine(origin, dest), 1);

    const attempts: Array<{ traffic: "TRAFFIC_AWARE_OPTIMAL" | "TRAFFIC_UNAWARE"; alternatives: boolean }> = [
      { traffic: "TRAFFIC_AWARE_OPTIMAL", alternatives: true },
      { traffic: "TRAFFIC_UNAWARE", alternatives: true },
    ];

    const sane: Scored[] = [];
    let lastErr: unknown = null;
    for (const attempt of attempts) {
      try {
        const c = scoreRoutes(await callRoutes(origin, dest, attempt), origin, dest);
        sane.push(...c.filter((x) => isSane(x, straight, dest)));
      } catch (e) {
        lastErr = e;
      }
    }
    const best = pickBest(sane);
    if (!best) {
      if (lastErr && !sane.length) console.warn("Routes failed:", lastErr);
      // No trustworthy road route: never draw a misleading line.
      return {
        distanceMeters: Math.round(straight),
        seconds: null,
        polyline: null as string | null,
        steps: [] as NavStep[],
        approximate: true,
      };
    }

    const chosen = best!;
    const steps: NavStep[] = (chosen.route.legs ?? [])
      .flatMap((l) => l.steps ?? [])
      .map((st) => ({
        maneuver: st.navigationInstruction?.maneuver ?? null,
        instruction: st.navigationInstruction?.instructions ?? null,
        distanceMeters: st.distanceMeters ?? null,
        endLat: st.endLocation?.latLng?.latitude ?? null,
        endLng: st.endLocation?.latLng?.longitude ?? null,
      }));

    // Guarantee the drawn line starts at the rider and ends on the buyer's pin.
    const pts = chosen.points.slice();
    if (chosen.startGap > 12 && chosen.startGap < 60) pts.unshift(origin);
    if (chosen.endGap > 8 && chosen.endGap < 60) pts.push(dest);

    return {
      distanceMeters: chosen.route.distanceMeters ?? Math.round(chosen.meters),
      seconds: chosen.seconds || null,
      polyline: encodePolyline(pts) as string | null,
      steps,
      approximate: false,
    };
  });
