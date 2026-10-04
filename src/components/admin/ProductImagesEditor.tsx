import { useEffect, useState } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductImages, addProductImage, removeProductImage, type ProductImage } from "@/lib/shop";

/** Extra gallery photos for a product — up to 5 in total (incl. the main image). */
export function ProductImagesEditor({ productId, mainImage }: { productId: string; mainImage: string }) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = () => fetchProductImages(productId).then(setImages).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productId]);

  const total = (mainImage ? 1 : 0) + images.length;

  const upload = async (file: File) => {
    if (total >= 5) return toast.error("A product can have at most 5 images");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8 MB");
    setUploading(true);
    try {
      const path = `products/${productId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      await addProductImage(productId, data?.signedUrl || "", images.length + 1);
      toast.success("Photo added");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const del = async (id: string) => {
    try { await removeProductImage(id); load(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-medium text-foreground/80">Extra gallery photos ({total}/5)</p>
      {loading ? (
        <Loader2 className="mt-2 h-4 w-4 animate-spin text-primary" />
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((im) => (
            <div key={im.id} className="relative">
              <img src={im.url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
              <button
                type="button"
                onClick={() => del(im.id)}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className={`grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted ${total >= 5 ? "pointer-events-none opacity-40" : ""}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
          </label>
        </div>
      )}
    </div>
  );
}
