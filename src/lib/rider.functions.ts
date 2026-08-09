import { createServerFn } from "@tanstack/react-start";

export type NavStep = {
  maneuver: string | null;
  instruction: string | null;
  distanceMeters: number | null;
  endLat: number | null;
  endLng: number | null;
};

// Compute driving distance + ETA via Google Routes API through the connector gateway.
export const computeRoute = createServerFn({ method: "POST" })
  .inputValidator((d: { origin: { lat: number; lng: number }; dest: { lat: number; lng: number } }) => {
    if (
      typeof d?.origin?.lat !== "number" ||
      typeof d?.origin?.lng !== "number" ||
      typeof d?.dest?.lat !== "number" ||
      typeof d?.dest?.lng !== "number"
    ) {
      throw new Error("Invalid coordinates");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmapsKey) throw new Error("Google Maps not configured");

    const res = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.endLocation",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: data.origin.lat, longitude: data.origin.lng } } },
        destination: { location: { latLng: { latitude: data.dest.lat, longitude: data.dest.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        polylineQuality: "HIGH_QUALITY",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Routes API ${res.status}: ${body.slice(0, 200)}`);
    }
    type Step = {
      distanceMeters?: number;
      staticDuration?: string;
      endLocation?: { latLng?: { latitude?: number; longitude?: number } };
      navigationInstruction?: { maneuver?: string; instructions?: string };
    };
    const json = (await res.json()) as {
      routes?: Array<{
        duration?: string;
        distanceMeters?: number;
        polyline?: { encodedPolyline?: string };
        legs?: Array<{ steps?: Step[] }>;
      }>;
    };
    const route = json.routes?.[0];
    if (!route) return { distanceMeters: null, seconds: null, polyline: null, steps: [] as NavStep[] };
    const steps: NavStep[] = (route.legs ?? []).flatMap((l) => l.steps ?? []).map((st) => ({
      maneuver: st.navigationInstruction?.maneuver ?? null,
      instruction: st.navigationInstruction?.instructions ?? null,
      distanceMeters: st.distanceMeters ?? null,
      endLat: st.endLocation?.latLng?.latitude ?? null,
      endLng: st.endLocation?.latLng?.longitude ?? null,
    }));
    const seconds = route.duration ? parseInt(String(route.duration).replace(/\D/g, ""), 10) : null;
    return {
      distanceMeters: route.distanceMeters ?? null,
      seconds,
      polyline: route.polyline?.encodedPolyline ?? null,
      steps,
    };
  });
