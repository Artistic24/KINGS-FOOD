import { useEffect, useMemo, useState } from "react";
import { X, MapPin, Loader2, ShieldCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { REGIONS, TOWNS_BY_REGION, normalizeTown, type Region } from "@/lib/cameroon-towns";

export function AdminRequestDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState<Region>("Centre");
  const [town, setTown] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);
  const [takenNormalized, setTakenNormalized] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from("admin_requests").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => data && setExisting(data.status));
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) { setFullName(data.full_name || ""); setPhone(data.phone || ""); } });
  }, [user]);

  // Refresh which towns in the chosen region already have an admin.
  useEffect(() => {
    let alive = true;
    setTown("");
    supabase.rpc("taken_admin_towns", { _region: region }).then(({ data }) => {
      if (!alive) return;
      setTakenNormalized(new Set(((data as any[]) || []).map((r) => r.normalized)));
    });
    return () => { alive = false; };
  }, [region]);

  const available = useMemo(
    () => TOWNS_BY_REGION[region].filter((t) => !takenNormalized.has(normalizeTown(t))),
    [region, takenNormalized],
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocating(false); toast.success("Location captured"); },
      (err) => { setLocating(false); toast.error(err.message || "Unable to get location. Make sure location is on."); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName || !phone || !town || lat === null || lng === null)
      return toast.error("All fields required, including GPS pin");
    if (!available.includes(town))
      return toast.error("Pick a town from the available list");
    setSaving(true);
    const { error } = await supabase.from("admin_requests").insert({
      user_id: user.id, full_name: fullName, phone, region, town,
      latitude: lat, longitude: lng, message: message || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent! A super admin will review.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Request admin badge</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {existing === "pending" && <p className="mt-3 rounded-lg bg-saffron/20 px-3 py-2 text-sm">⏳ Your previous request is still pending.</p>}
        {existing === "approved" && <p className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm">✅ You are already an admin.</p>}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />

          <div className="grid grid-cols-2 gap-2">
            <select value={region} onChange={(e) => setRegion(e.target.value as Region)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={town}
              onChange={(e) => setTown(e.target.value)}
              required
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select town…</option>
              {available.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {available.length === 0 ? (
            <p className="text-xs text-destructive">All towns in {region} already have an admin.</p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
              {available.length} town{available.length === 1 ? "" : "s"} still available in {region}.
            </p>
          )}

          <button type="button" onClick={useMyLocation} className="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {lat !== null && lng !== null ? `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Use my current location"}
          </button>

          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why do you want admin access? (optional)" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />

          <button disabled={saving || available.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
          </button>
        </form>
      </div>
    </div>
  );
}
