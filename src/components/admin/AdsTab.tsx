import { useEffect, useState } from "react";
import { Loader2, Upload, Trash2, Plus, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Ad = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  region: string | null;
  active: boolean;
  sort_order: number;
};

const EMPTY: Omit<Ad, "id"> = {
  title: "",
  subtitle: "",
  image_url: "",
  cta_text: "Shop now",
  cta_url: "",
  region: "",
  active: true,
  sort_order: 0,
};

async function uploadAdImage(file: File): Promise<string> {
  const path = `ads/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("brand-assets").upload(path, file);
  if (error) throw error;
  const { data } = await supabase.storage
    .from("brand-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  return data?.signedUrl || "";
}

export function AdsTab() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<Ad, "id">>({ ...EMPTY });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ads" as any)
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    setAds(((data as any) ?? []) as Ad[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (file: File, apply: (url: string) => void) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    try {
      const url = await uploadAdImage(file);
      apply(url);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const create = async () => {
    if (!draft.title.trim()) return toast.error("Title required");
    const { error } = await supabase.from("ads" as any).insert({
      ...draft,
      subtitle: draft.subtitle || null,
      image_url: draft.image_url || null,
      cta_url: draft.cta_url || null,
      region: draft.region || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Ad created");
    setDraft({ ...EMPTY });
    setCreating(false);
    load();
  };

  const patch = async (id: string, changes: Partial<Ad>) => {
    const { error } = await supabase.from("ads" as any).update(changes).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this ad?")) return;
    const { error } = await supabase.from("ads" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ad deleted");
    load();
  };

  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Ads</h2>
          <p className="text-sm text-muted-foreground">Rotating popup ads shown to shoppers on the homepage.</p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {creating ? "Cancel" : "New ad"}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-bold">Create new ad</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input placeholder="Title *" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="rounded-xl border border-input bg-background px-3 py-2 md:col-span-2" />
            <input placeholder="Subtitle" value={draft.subtitle || ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} className="rounded-xl border border-input bg-background px-3 py-2 md:col-span-2" />
            <input placeholder="CTA text" value={draft.cta_text || ""} onChange={(e) => setDraft({ ...draft, cta_text: e.target.value })} className="rounded-xl border border-input bg-background px-3 py-2" />
            <input placeholder="CTA link (e.g. /sectors/burgers)" value={draft.cta_url || ""} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} className="rounded-xl border border-input bg-background px-3 py-2" />
            <input placeholder="Region (optional)" value={draft.region || ""} onChange={(e) => setDraft({ ...draft, region: e.target.value })} className="rounded-xl border border-input bg-background px-3 py-2" />
            <input type="number" placeholder="Sort order" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} className="rounded-xl border border-input bg-background px-3 py-2" />
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                {draft.image_url && <img src={draft.image_url} alt="" className="h-16 w-24 rounded-lg object-cover" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload image
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, (url) => setDraft({ ...draft, image_url: url })); e.target.value = ""; }} />
                </label>
              </div>
            </div>
          </div>
          <button onClick={create} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" /> Create ad
          </button>
        </div>
      )}

      {ads.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No ads yet. Create your first popup above.
        </p>
      )}

      <ul className="space-y-3">
        {ads.map((ad) => (
          <li key={ad.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
            {ad.image_url ? (
              <img src={ad.image_url} alt={ad.title} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">No image</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{ad.title}</p>
              {ad.subtitle && <p className="truncate text-xs text-muted-foreground">{ad.subtitle}</p>}
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {ad.cta_url || "no link"} · order {ad.sort_order}{ad.region ? ` · ${ad.region}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <Upload className="h-3 w-3" />
                Replace
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, (url) => patch(ad.id, { image_url: url })); e.target.value = ""; }} />
              </label>
              <button
                onClick={() => patch(ad.id, { active: !ad.active })}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${ad.active ? "border-forest/40 bg-forest/10 text-forest" : "border-input bg-background"}`}
              >
                {ad.active ? <><Eye className="h-3 w-3" /> Active</> : <><EyeOff className="h-3 w-3" /> Hidden</>}
              </button>
              <button onClick={() => remove(ad.id)} className="rounded-full border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
