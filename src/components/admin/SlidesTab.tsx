import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllHomeSlides } from "@/lib/shop";

const sb = supabase as any;
const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

/** Manage the rotating home-page advert banner (max 5 images, 3s auto-slide). */
export function SlidesTab() {
  const qc = useQueryClient();
  const { data: slides = [], isLoading } = useQuery({ queryKey: ["home-slides-all"], queryFn: fetchAllHomeSlides });
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [url, setUrl] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["home-slides-all"] });
    qc.invalidateQueries({ queryKey: ["home-slides"] });
  };

  const upload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8 MB");
    setUploading(true);
    try {
      const path = `home-slides/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      setUrl(data?.signedUrl || "");
      toast.success("Uploaded — click Add slide");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const add = async () => {
    if (!url.trim()) return toast.error("Upload an image or paste an image URL first");
    if (slides.length >= 5) return toast.error("Maximum of 5 advert slides");
    const { error } = await sb.from("home_slides").insert({
      image_url: url.trim(),
      caption: caption.trim() || null,
      link_url: link.trim() || null,
      sort_order: slides.length,
    });
    if (error) return toast.error(error.message);
    setUrl(""); setCaption(""); setLink("");
    toast.success("Advert added");
    refresh();
  };

  const update = async (id: string, patch: any) => {
    const { error } = await sb.from("home_slides").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("home_slides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Advert removed");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-lg font-bold">Home advert banner</h3>
        <p className="text-xs text-muted-foreground">Up to 5 images. They slide left automatically every 3 seconds on the home page.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <input className={inp} placeholder="Image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-muted">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload image
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
            </label>
          </div>
          <div className="space-y-2">
            <input className={inp} placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <input className={inp} placeholder="Link URL (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
        </div>
        <button onClick={add} disabled={slides.length >= 5} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          <Plus className="h-4 w-4" /> Add slide ({slides.length}/5)
        </button>
      </div>

      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {slides.map((s, i) => (
            <div key={s.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
              <img src={s.image_url} alt={s.caption ?? "Advert"} className="h-24 w-32 rounded-xl border border-border object-cover" />
              <div className="flex-1 space-y-2">
                <input className={inp} defaultValue={s.caption ?? ""} placeholder="Caption" onBlur={(e) => update(s.id, { caption: e.target.value || null })} />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={s.active} onChange={(e) => update(s.id, { active: e.target.checked })} />Active</label>
                  <input type="number" defaultValue={s.sort_order ?? i} className="w-16 rounded-lg border border-input bg-background px-2 py-1" onBlur={(e) => update(s.id, { sort_order: Number(e.target.value) })} />
                  <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {slides.length === 0 && <p className="text-sm text-muted-foreground">No advert slides yet.</p>}
        </div>
      )}
    </div>
  );
}
