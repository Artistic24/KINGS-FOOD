/**
 * Turn-by-turn voice guidance + arrival alarm for the rider maps.
 * Uses the browser SpeechSynthesis API and a WebAudio chime — no extra deps.
 */

let enabled = true;

export function setVoiceEnabled(v: boolean) {
  enabled = v;
  if (!v) stopSpeaking();
}
export function isVoiceEnabled() {
  return enabled;
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function speak(text: string) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/**
 * How close the rider's arrow must be to the buyer's red pin before we say
 * "you have arrived" and ring. Kept tight so the alarm only fires when the
 * arrow is effectively sitting on top of the pin.
 */
export const ARRIVE_RADIUS_M = 6;

/** Turn a Google-style maneuver + distance into a natural spoken phrase. */
export function maneuverPhrase(maneuver: string | null | undefined, instruction: string | null | undefined, meters: number) {
  const m = (maneuver ?? "").toUpperCase();
  const dist = meters < 25 ? "now" : meters < 950 ? `in ${Math.round(meters / 10) * 10} meters` : `in ${(meters / 1000).toFixed(1)} kilometers`;
  let action = "";
  if (m.includes("UTURN")) action = "make a U-turn";
  else if (m.includes("LEFT")) action = "turn left";
  else if (m.includes("RIGHT")) action = "turn right";
  else if (m.includes("ROUNDABOUT")) action = "enter the roundabout";
  else if (m.includes("MERGE")) action = "merge";
  else if (m.includes("FORK")) action = "keep to the fork";
  else if (m.includes("DESTINATION")) {
    // Never claim arrival from a route step — only proximity does that.
    return meters <= ARRIVE_RADIUS_M
      ? "you have arrived at the buyer's location"
      : `the buyer's location is ${dist === "now" ? "just ahead" : dist}`;
  } else action = instruction ? instruction.replace(/<[^>]+>/g, "") : "continue straight";
  return `${action} ${dist}`;
}

/** Speak "in X minutes" ETA milestones once each. */
export function etaPhrase(minutes: number) {
  if (minutes <= 1) return "You are about one minute from the buyer's location";
  return `Arriving in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}


let alarmStop: (() => void) | null = null;

/** Ring a repeating alert tone for `seconds` (default 10) — used on arrival. */
export function ringArrival(seconds = 10) {
  stopRinging();
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  ctx.resume?.().catch(() => {});
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 880;
  osc.connect(gain);
  osc.start();

  // Beep-beep pattern for the whole duration.
  const start = ctx.currentTime;
  for (let t = 0; t < seconds; t += 0.6) {
    gain.gain.setValueAtTime(0.0001, start + t);
    gain.gain.exponentialRampToValueAtTime(0.35, start + t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t + 0.35);
  }

  const timer = window.setTimeout(() => stopRinging(), seconds * 1000 + 200);
  alarmStop = () => {
    window.clearTimeout(timer);
    try {
      osc.stop();
      ctx.close();
    } catch {
      /* ignore */
    }
    alarmStop = null;
  };
}

export function stopRinging() {
  alarmStop?.();
}

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type AnyStep = { maneuver?: string | null; instruction?: string | null; endLat?: number | null; endLng?: number | null };

/**
 * Pick the manoeuvre the rider is actually approaching.
 *
 * Naively taking the first step further than N metres reports steps the rider
 * has already driven past (that's what produced "600 m — Head ⬆️" while the
 * buyer was 5 m away). Instead we anchor on the step whose end point is
 * closest to the rider, and advance to the following step once that one is
 * effectively reached.
 */
export function nextStepAhead<T extends AnyStep>(
  myLoc: { lat: number; lng: number } | null,
  steps: T[],
): { step: T; index: number; meters: number } | null {
  if (!myLoc || !steps || steps.length === 0) return null;
  let bestI = -1;
  let bestD = Infinity;
  steps.forEach((s, i) => {
    if (s.endLat == null || s.endLng == null) return;
    const d = metersBetween(myLoc, { lat: s.endLat, lng: s.endLng });
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  });
  if (bestI < 0) return null;

  let index = bestI;
  let meters = bestD;
  // Already at this manoeuvre → the next instruction is what matters.
  if (meters <= 25 && bestI + 1 < steps.length) {
    const n = steps[bestI + 1];
    if (n.endLat != null && n.endLng != null) {
      index = bestI + 1;
      meters = metersBetween(myLoc, { lat: n.endLat, lng: n.endLng });
    }
  }
  return { step: steps[index], index, meters };
}

