export type PinSource = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  origin_latitude?: number | string | null;
  origin_longitude?: number | string | null;
  origin_accuracy_m?: number | string | null;
};

export type LatLng = { lat: number; lng: number };

// Cameroon bounding box — anything outside is corrupt data, never a real pin.
const CMR = { minLat: 1.5, maxLat: 13.2, minLng: 8.3, maxLng: 16.3 };

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? (n as number) : null;
}

export function validPin(lat: unknown, lng: unknown): LatLng | null {
  const la = num(lat);
  const ln = num(lng);
  if (la == null || ln == null) return null;
  if (la === 0 && ln === 0) return null;
  if (la < CMR.minLat || la > CMR.maxLat || ln < CMR.minLng || ln > CMR.maxLng) return null;
  return { lat: la, lng: ln };
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function metersBetween(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Single source of truth for where a rider must actually drive.
 *
 * The checkout stores TWO points:
 *  - `origin_*`  the device GPS fix captured automatically (trustworthy)
 *  - `latitude/longitude` the pin on the picker map (can be dragged/mis-tapped)
 *
 * A dragged pin is only a legitimate fine-tune when it sits close to the GPS
 * fix. A pin hundreds of metres away is almost always an accidental tap on a
 * zoomed-out map, and following it sends the rider to the wrong place — so the
 * device-verified GPS fix wins in that case.
 */
export function buyerPin(o: PinSource | null | undefined): (LatLng & { source: "pin" | "gps" }) | null {
  if (!o) return null;
  const pin = validPin(o.latitude, o.longitude);
  const gps = validPin(o.origin_latitude, o.origin_longitude);
  if (pin && gps) {
    const drift = metersBetween(pin, gps);
    const tolerance = Math.max(250, Math.min(num(o.origin_accuracy_m) ?? 0, 500));
    return drift <= tolerance ? { ...pin, source: "pin" } : { ...gps, source: "gps" };
  }
  if (gps) return { ...gps, source: "gps" };
  if (pin) return { ...pin, source: "pin" };
  return null;
}
