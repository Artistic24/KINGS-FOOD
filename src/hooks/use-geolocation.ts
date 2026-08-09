import { useEffect, useState } from "react";

export type GeoCoords = { lat: number; lng: number; accuracy: number };

type State = {
  coords: GeoCoords | null;
  status: "idle" | "prompting" | "granted" | "denied" | "unavailable" | "error";
  error?: string;
};

/**
 * Requests the user's precise GPS location.
 * Pass `enabled = true` to actively request (will trigger the browser permission prompt).
 */
export function useGeolocation(enabled = true) {
  const [state, setState] = useState<State>({ coords: null, status: "idle" });

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ coords: null, status: "unavailable" });
      return;
    }
    setState((s) => ({ ...s, status: "prompting" }));

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: "granted",
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        });
      },
      (err) => {
        setState({
          coords: null,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          error: err.message,
        });
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return state;
}
