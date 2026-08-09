import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Video, Loader2, Upload, CheckCircle2, X, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sampleFace, blendSample, type FaceSample } from "@/lib/face-liveness";

export const Route = createFileRoute("/rider/apply")({
  head: () => ({ meta: [{ title: "Become a rider — St Kingston" }, { name: "robots", content: "noindex" }] }),
  component: RiderApplyPage,
});

type IdType = "national_id" | "passport" | "drivers_license";

const ID_TYPES: { value: IdType; label: string; description: string; requiresBack: boolean }[] = [
  { value: "national_id", label: "National ID", description: "Cameroon CNI card", requiresBack: true },
  { value: "passport", label: "Passport", description: "International passport", requiresBack: false },
  { value: "drivers_license", label: "Driver's license", description: "Valid driving permit", requiresBack: true },
];

function RiderApplyPage() {
  const { user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idType, setIdType] = useState<IdType>("national_id");
  const [idFront, setIdFront] = useState<Blob | null>(null);
  const [idBack, setIdBack] = useState<Blob | null>(null);
  const [faceVideo, setFaceVideo] = useState<Blob | null>(null);
  const [status, setStatus] = useState<"none" | "pending" | "approved" | "declined">("none");
  const [submitting, setSubmitting] = useState(false);

  const idMeta = ID_TYPES.find((t) => t.value === idType)!;

  // Identity must match the signed-in account — prefill and lock it.
  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.full_name) setFullName(data.full_name);
        if (data?.phone) setPhone(data.phone);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("rider_requests")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => data && setStatus(data.status));
  }, [user]);

  if (authLoading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to apply</h1>
        <Link to="/auth" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold">Application pending</h1>
        <p className="mt-2 text-sm text-muted-foreground">An admin will review your application shortly.</p>
        <button
          onClick={async () => {
            const { error } = await (supabase as any).from("rider_requests").delete().eq("user_id", user.id).eq("status", "pending");
            if (error) return toast.error(error.message);
            toast.success("You can now submit a new application");
            setStatus("none");
          }}
          className="mt-6 text-xs text-muted-foreground underline"
        >
          Withdraw and start over
        </button>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-forest" />
        <h1 className="mt-4 font-display text-2xl font-bold">You're a rider!</h1>
        <Link to="/rider" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Open rider dashboard</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return toast.error("Full name and phone required");
    if (email.trim() && email.trim().toLowerCase() !== (user.email ?? "").toLowerCase())
      return toast.error("The email must match your account email");
    if (!idFront) return toast.error(`${idMeta.label} photo is required`);
    if (idMeta.requiresBack && !idBack) return toast.error(`Back of ${idMeta.label} is required`);
    if (!faceVideo) return toast.error("Face verification video required");
    setSubmitting(true);
    try {
      const upload = async (blob: Blob, name: string, fallbackType: string) => {
        const path = `${user.id}/${Date.now()}-${name}`;
        const contentType = blob.type || fallbackType;
        const { error } = await supabase.storage.from("rider-verification").upload(path, blob, { contentType, upsert: true });
        if (error) throw error;
        return path;
      };
      const uploads: Promise<string>[] = [
        upload(idFront, "id_front", "image/jpeg"),
        upload(faceVideo, "face", "video/webm"),
      ];
      if (idMeta.requiresBack && idBack) uploads.splice(1, 0, upload(idBack, "id_back", "image/jpeg"));
      const paths = await Promise.all(uploads);
      const [frontPath, backPath, videoPath] = idMeta.requiresBack
        ? paths
        : [paths[0], paths[0], paths[1]]; // passport reuses front as back to satisfy NOT NULL

      const { error } = await (supabase as any).from("rider_requests").insert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        id_type: idType,
        id_front_path: frontPath,
        id_back_path: backPath,
        face_video_path: videoPath,
      });
      if (error) throw error;
      toast.success("Application submitted! Waiting for admin review.");
      setStatus("pending");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <h1 className="font-display text-3xl font-bold">Become a rider</h1>
      <p className="mt-1 text-sm text-muted-foreground">Deliver goods to buyers in your area and earn on every trip.</p>
      <p className="mt-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">Your name, phone and email are taken from your account and must match it. Update them in <Link to="/account" className="font-semibold underline">your profile</Link> first if they are wrong.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display text-lg font-bold">Personal information</h2>
          <label className="block text-sm">
            <span className="font-medium">Full name * <span className="text-xs font-normal text-muted-foreground">(must match your profile)</span></span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Phone * <span className="text-xs font-normal text-muted-foreground">(must match your profile)</span></span>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="+237 6XX XX XX XX" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Email (your account email)</span>
            <input type="email" readOnly value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display text-lg font-bold">Identity document</h2>
          <p className="text-xs text-muted-foreground">Choose which document you'll use to verify your identity.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ID_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => { setIdType(t.value); setIdFront(null); setIdBack(null); }}
                className={`rounded-xl border p-3 text-left text-sm transition ${idType === t.value ? "border-primary bg-primary/10" : "border-input hover:border-primary/50"}`}
              >
                <p className="font-semibold">{t.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
          <PhotoCapture label={idMeta.requiresBack ? `Front of ${idMeta.label}` : `${idMeta.label} photo page`} value={idFront} onChange={setIdFront} />
          {idMeta.requiresBack && <PhotoCapture label={`Back of ${idMeta.label}`} value={idBack} onChange={setIdBack} />}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display text-lg font-bold">Face verification</h2>
          <p className="text-xs text-muted-foreground">Our system will guide you through a short liveness check with voice instructions. Please enable your speakers.</p>
          <FaceVerification value={faceVideo} onChange={setFaceVideo} />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Submit application
        </button>
      </form>
    </div>
  );
}

function PhotoCapture({ label, value, onChange }: { label: string; value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setStream(s);
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          try { await videoRef.current.play(); } catch { /* autoplay blocked */ }
        }
      }, 50);
    } catch {
      toast.error("Camera unavailable — use 'Upload from device' instead");
    }
  };
  const stop = () => { stream?.getTracks().forEach((t) => t.stop()); setStream(null); };
  const snap = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return toast.error("Camera not ready yet");
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((b) => { if (b) onChange(b); stop(); }, "image/jpeg", 0.85);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = "";
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label} *</p>
      {value ? (
        <div className="relative">
          <img src={URL.createObjectURL(value)} alt={label} className="w-full max-h-56 rounded-lg object-cover" />
          <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : stream ? (
        <div>
          <video ref={videoRef} className="w-full max-h-56 rounded-lg bg-black" playsInline muted autoPlay />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={snap} className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Capture</button>
            <button type="button" onClick={stop} className="rounded-full border border-input px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm hover:bg-muted">
            <Camera className="h-4 w-4" /> Open camera
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" /> Upload from device
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
        </div>
      )}
    </div>
  );
}

// Voice-guided ADAPTIVE liveness verification.
// Each instruction stays on screen until the camera actually sees it — but the
// detector is deliberately very sensitive, so a small, natural movement is
// enough. Only four instructions: position, turn left, turn right, smile.
type LiveCtx = { turnSign: number };

type LiveStep = {
  id: string;
  prompt: string;
  hint: string;
  /** Returns true when the requested action has been observed. */
  check: (s: FaceSample, base: FaceSample | null, ctx: LiveCtx) => boolean;
  /** How long the condition must hold (ms) before moving on. */
  hold: number;
};

/** Signed "how far has the head rotated" score, combining centroid + balance. */
function turnScore(s: FaceSample, base: FaceSample) {
  return (s.cx - base.cx) * 1.6 + (s.asym - base.asym) * 0.9;
}

const TURN_THRESHOLD = 0.028; // ~a small, natural head turn

const VERIFICATION_STEPS: LiveStep[] = [
  {
    id: "center",
    prompt: "Position your face inside the oval frame",
    hint: "Move a little closer so your face fills the oval",
    check: (s) => s.mass > 0.035 && Math.abs(s.cx - 0.5) < 0.26 && Math.abs(s.cy - 0.5) < 0.3,
    hold: 700,
  },
  {
    id: "left",
    prompt: "Slowly turn your head to the LEFT",
    hint: "Turn your head slowly to one side",
    check: (s, base, ctx) => {
      if (!base || s.mass < 0.015) return false;
      const t = turnScore(s, base);
      if (Math.abs(t) < TURN_THRESHOLD) return false;
      ctx.turnSign = Math.sign(t); // remember which way counted as "left"
      return true;
    },
    hold: 220,
  },
  {
    id: "right",
    prompt: "Now turn your head to the RIGHT",
    hint: "Turn your head the other way",
    check: (s, base, ctx) => {
      if (!base || s.mass < 0.015) return false;
      const t = turnScore(s, base);
      return ctx.turnSign !== 0
        ? Math.sign(t) === -ctx.turnSign && Math.abs(t) >= TURN_THRESHOLD
        : Math.abs(t) >= TURN_THRESHOLD;
    },
    hold: 220,
  },
  {
    id: "smile",
    prompt: "Great — now smile for the camera",
    hint: "Smile 🙂",
    check: (s, base) => {
      if (!base || s.mass < 0.02) return false;
      return s.mouth > base.mouth * 1.05 + 0.3 || s.bright > base.bright + 2;
    },
    hold: 250,
  },
];


function speak(text: string, muted: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
      // Fallback in case onend never fires
      setTimeout(() => resolve(), Math.max(1500, text.length * 70));
    } catch {
      resolve();
    }
  });
}

function FaceVerification({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      setStream(s);
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          try { await videoRef.current.play(); } catch { /* ignore */ }
        }
      }, 50);
    } catch {
      toast.error("Camera unavailable — use 'Upload video' instead");
    }
  };

  const stopAll = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setRecording(false);
    setStepIndex(-1);
    setProgress(0);
    setHintOn(false);
    setElapsedSec(0);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const startVerification = async () => {
    if (!stream) return;
    cancelledRef.current = false;
    chunks.current = [];
    let mime = "video/webm;codecs=vp8";
    if (typeof MediaRecorder === "undefined") {
      toast.error("Recording not supported on this browser — use Upload instead");
      return;
    }
    if (!MediaRecorder.isTypeSupported(mime)) mime = MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: mime || "video/webm" });
      if (!cancelledRef.current) onChange(blob);
      stopAll();
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);

    // Adaptive loop: wait for each instruction to actually be performed.
    const canvas = document.createElement("canvas");
    const ctx: LiveCtx = { turnSign: 0 };
    let base: FaceSample | null = null;
    let smoothed: FaceSample | null = null;

    for (let i = 0; i < VERIFICATION_STEPS.length; i++) {
      if (cancelledRef.current) break;
      const step = VERIFICATION_STEPS[i];
      setStepIndex(i);
      setHintOn(false);
      speak(step.prompt, muted);

      const started = Date.now();
      let heldSince: number | null = null;
      let lastNag = Date.now();

      await new Promise<void>((resolve) => {
        const tick = () => {
          if (cancelledRef.current) return resolve();
          const raw = videoRef.current ? sampleFace(videoRef.current, canvas) : null;
          if (raw) {
            const s = blendSample(smoothed, raw);
            smoothed = s;
            if (step.check(s, base, ctx)) {
              if (heldSince == null) heldSince = Date.now();
              if (Date.now() - heldSince >= step.hold) {
                setProgress((i + 1) / VERIFICATION_STEPS.length);
                return resolve();
              }
            } else {
              heldSince = null;
            }
          }
          // Re-prompt with a gentle hint if they seem stuck on this action.
          if (Date.now() - lastNag > 6000) {
            lastNag = Date.now();
            setHintOn(true);
            speak(step.hint, muted);
          }
          setElapsedSec(Math.round((Date.now() - started) / 1000));
          requestAnimationFrame(tick);
        };
        tick();
      });

      // Freeze the neutral, front-facing pose as the reference for turns/smile,
      // and re-baseline after each turn so the next one is measured fairly.
      if (step.id === "center" && smoothed) base = smoothed;
      if (step.id === "right" && smoothed) base = smoothed;
    }


    if (!cancelledRef.current) {
      await speak("Verification complete", muted);
      if (rec.state === "recording") rec.stop();
    }
  };

  const cancel = () => {

    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else stopAll();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 20 * 1024 * 1024) return toast.error("Video too large (max 20MB)");
      onChange(f);
    }
    e.target.value = "";
  };

  useEffect(() => () => stopAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (value) {
    return (
      <div className="relative">
        <video src={URL.createObjectURL(value)} controls className="w-full max-h-72 rounded-lg" />
        <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (stream) {
    const currentStep = stepIndex >= 0 ? VERIFICATION_STEPS[stepIndex] : null;
    const currentPrompt = currentStep ? (hintOn ? currentStep.hint : currentStep.prompt) : "Tap Start when you're ready";
    return (
      <div>
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="w-full max-h-80 object-cover" playsInline muted autoPlay style={{ transform: "scaleX(-1)" }} />
          {/* Oval face guide overlay */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className={`h-56 w-44 rounded-[50%] border-4 ${recording ? "border-forest animate-pulse" : "border-white/70"}`} />
          </div>
          {/* Prompt banner */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
            <p className="font-display text-base font-bold text-white drop-shadow">{currentPrompt}</p>
            {recording && (
              <>
                <p className="mt-1 text-[11px] text-white/70">
                  Step {stepIndex + 1} of {VERIFICATION_STEPS.length} · {elapsedSec}s — the next instruction only comes once this one is done
                </p>
                <div className="mx-auto mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
                  <div className="h-full bg-primary transition-all duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white"
            aria-label={muted ? "Unmute voice guide" : "Mute voice guide"}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {!recording ? (
            <button type="button" onClick={startVerification} className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Start verification
            </button>
          ) : (
            <button type="button" disabled className="flex-1 rounded-full bg-primary/60 px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Verifying...
            </button>
          )}
          <button type="button" onClick={cancel} className="rounded-full border border-input px-4 py-2.5 text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={openCamera} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        <Video className="h-4 w-4" /> Start face verification
      </button>
    </div>
  );
}
