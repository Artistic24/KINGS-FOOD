import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Ad = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
};

const DISMISS_KEY = "kf.ads.dismissed_at";
const RESHOW_MS = 6 * 60 * 60 * 1000; // 6 hours

export function AdsPopup() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Only show on the homepage.
    if (typeof window !== "undefined" && window.location.pathname !== "/") return;

    const last = typeof window !== "undefined" ? Number(localStorage.getItem(DISMISS_KEY) || 0) : 0;
    if (Date.now() - last < RESHOW_MS) return;

    (async () => {
      const { data } = await supabase
        .from("ads" as any)
        .select("id, title, subtitle, image_url, cta_text, cta_url")
        .eq("active", true)
        .order("sort_order")
        .limit(10);
      if (cancelled) return;
      const rows = (data as unknown as Ad[]) ?? [];
      if (rows.length === 0) return;
      setAds(rows);
      const t = setTimeout(() => setOpen(true), 2500);
      return () => clearTimeout(t);
    })();

    return () => { cancelled = true; };
  }, []);

  // Auto-rotate every 5s
  useEffect(() => {
    if (!open || ads.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [open, ads.length]);

  if (!open || ads.length === 0) return null;
  const ad = ads[idx];

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Featured offer"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>

        {ad.image_url ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            <img src={ad.image_url} alt={ad.title} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-primary via-saffron to-forest text-primary-foreground">
            <Sparkles className="h-16 w-16 opacity-80" />
          </div>
        )}

        <div className="p-5">
          <h3 className="font-display text-2xl font-bold leading-tight">{ad.title}</h3>
          {ad.subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{ad.subtitle}</p>}

          <div className="mt-4 flex items-center gap-3">
            {ad.cta_url ? (
              <a
                href={ad.cta_url}
                onClick={dismiss}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-warm transition-colors hover:bg-primary/90"
              >
                {ad.cta_text || "Shop now"}
              </a>
            ) : (
              <button
                onClick={dismiss}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-warm transition-colors hover:bg-primary/90"
              >
                {ad.cta_text || "OK"}
              </button>
            )}
          </div>

          {ads.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setIdx((i) => (i - 1 + ads.length) % ads.length)}
                aria-label="Previous ad"
                className="rounded-full p-1 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5">
                {ads.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setIdx((i) => (i + 1) % ads.length)}
                aria-label="Next ad"
                className="rounded-full p-1 hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
