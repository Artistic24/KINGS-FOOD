import { useEffect, useRef } from "react";
import { ARRIVE_RADIUS_M, etaPhrase, maneuverPhrase, metersBetween, nextStepAhead, ringArrival, speak } from "@/lib/nav-voice";


type Step = { maneuver: string | null; instruction: string | null; endLat: number | null; endLng: number | null };

/**
 * Announces upcoming turns and ETA milestones, and rings for 10s on arrival.
 * Every announcement fires at most once per turn / milestone.
 */
export function useNavVoice({
  enabled,
  myLoc,
  dest,
  steps,
  etaSeconds,
  routeKey,
}: {
  enabled: boolean;
  myLoc: { lat: number; lng: number } | null;
  dest: { lat: number; lng: number } | null;
  steps: Step[];
  etaSeconds: number | null;
  routeKey: string;
}) {
  const saidTurns = useRef<Set<string>>(new Set());
  const saidEta = useRef<Set<number>>(new Set());
  const arrived = useRef(false);
  const keyRef = useRef(routeKey);

  // New destination → reset everything that was already announced.
  if (keyRef.current !== routeKey) {
    keyRef.current = routeKey;
    saidTurns.current = new Set();
    saidEta.current = new Set();
    arrived.current = false;
  }

  // ETA milestones: 10, 5, 2 and 1 minute out.
  useEffect(() => {
    if (!enabled || etaSeconds == null) return;
    const mins = Math.round(etaSeconds / 60);
    for (const milestone of [10, 5, 2, 1]) {
      if (mins === milestone && !saidEta.current.has(milestone)) {
        saidEta.current.add(milestone);
        speak(etaPhrase(milestone));
      }
    }
  }, [enabled, etaSeconds]);

  // Turn alerts at ~250m and again at ~60m before the manoeuvre the rider is
  // actually approaching (steps already driven past are ignored).
  useEffect(() => {
    if (!enabled || !myLoc || steps.length === 0) return;
    const ahead = nextStepAhead(myLoc, steps);
    if (!ahead) return;
    const { index: i, meters: d, step: st } = ahead;
    if (d > 400) return;
    const band = d <= 60 ? "near" : "far";
    const key = `${i}-${band}`;
    if (saidTurns.current.has(key)) return;
    saidTurns.current.add(`${i}-far`);
    if (band === "near") saidTurns.current.add(`${i}-near`);
    speak(maneuverPhrase(st.maneuver, st.instruction, d));
  }, [enabled, myLoc, steps]);


  // Arrival: only once the rider's arrow is effectively on top of the buyer's
  // red pin (a few metres), never at 10–20 m out.
  useEffect(() => {
    if (!enabled || !myLoc || !dest || arrived.current) return;
    if (metersBetween(myLoc, dest) <= ARRIVE_RADIUS_M) {
      arrived.current = true;
      speak("You have arrived at the buyer's location");
      ringArrival(10);
    }
  }, [enabled, myLoc, dest]);
}
