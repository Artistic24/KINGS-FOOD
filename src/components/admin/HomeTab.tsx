import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Home, Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HOME_DEFAULTS, HOME_FIELDS, fetchHomeContent, saveHomeContent, type HomeContent } from "@/lib/home-content";

export function HomeTab() {
  const [form, setForm] = useState<HomeContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchHomeContent().then(setForm).catch((e) => toast.error(e.message));
  }, []);

  if (!form) return <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const set = (k: keyof HomeContent, v: string) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      await saveHomeContent(form);
      toast.success("Home page updated");
    } catch (e: any) {
      toast.error(e.message || "Could not save");
    }
    setSaving(false);
  };

  const uploadHero = async (file: File) => {
    setUploading(true);
    const path = `home/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data: signed } = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    setUploading(false);
    if (signed?.signedUrl) {
      setForm({ ...form, heroImageUrl: signed.signedUrl });
      toast.success("Image uploaded — remember to save");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Home className="h-5 w-5 text-primary" /> Home page content</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Edit every text and image shown on the home page. Customer ratings are managed by customers and can't be edited here.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
        {HOME_FIELDS.map((f) => (
          <div key={f.key} className={f.long || f.image ? "md:col-span-2" : ""}>
            <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
            {f.image ? (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {form.heroImageUrl && <img src={form.heroImageUrl} alt="" className="h-20 w-32 rounded-lg object-cover" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input px-4 py-2 text-sm hover:bg-muted">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadHero(file); e.target.value = ""; }} />
                </label>
                <input
                  value={form.heroImageUrl}
                  onChange={(e) => set("heroImageUrl", e.target.value)}
                  placeholder="…or paste an image URL (leave empty for the default)"
                  className="min-w-[240px] flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
                {form.heroImageUrl && (
                  <button onClick={() => set("heroImageUrl", "")} className="rounded-full border border-input px-3 py-2 text-xs hover:bg-muted">Remove</button>
                )}
              </div>
            ) : f.long ? (
              <textarea
                rows={3}
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save home page
        </button>
        <button onClick={() => setForm({ ...HOME_DEFAULTS })} className="inline-flex items-center gap-2 rounded-full border border-input px-5 py-2.5 text-sm hover:bg-muted">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </button>
      </div>
    </div>
  );
}
