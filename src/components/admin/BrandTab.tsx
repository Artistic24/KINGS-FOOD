import { useEffect, useState } from "react";
import { Loader2, Upload, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_BRAND } from "@/lib/brand";

async function uploadBrandFile(file: File, prefix: string): Promise<string> {
  const path = `${prefix}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage
    .from("brand-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10); // 10 years
  return data?.signedUrl || "";
}

export function BrandTab() {
  const qc = useQueryClient();
  const [name, setName] = useState(DEFAULT_BRAND.brand_name);
  const [tagline, setTagline] = useState(DEFAULT_BRAND.tagline || "");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("brand_settings" as any)
        .select("brand_name, tagline, logo_url")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        const b = data as any;
        setName(b.brand_name || DEFAULT_BRAND.brand_name);
        setTagline(b.tagline || "");
        setLogoUrl(b.logo_url || "");
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("brand_settings" as any)
      .upsert({ id: 1, brand_name: name, tagline: tagline || null, logo_url: logoUrl || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Brand updated");
    qc.invalidateQueries({ queryKey: ["brand-settings"] });
  };

  const onLogoChange = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Logo must be under 5 MB");
    setUploading(true);
    try {
      const url = await uploadBrandFile(file, "logos");
      setLogoUrl(url);
      toast.success("Logo uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-xl font-bold">Brand identity</h2>
        <p className="mt-1 text-sm text-muted-foreground">These appear in the header, footer, and share previews.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium">Brand name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2"
              placeholder="KINGS FOOD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tagline</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2"
              placeholder="Cameroon's all-in-one marketplace"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Logo</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-lg font-bold text-muted-foreground">Logo</span>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoChange(f); e.target.value = ""; }}
                />
              </label>
              {logoUrl && (
                <button onClick={() => setLogoUrl("")} className="text-xs text-muted-foreground underline">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save brand
        </button>
      </div>
    </div>
  );
}
