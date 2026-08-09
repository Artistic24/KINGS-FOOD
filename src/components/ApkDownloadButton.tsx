import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ApkDownloadButton({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const [s, setS] = useState<{ apk_url: string; apk_label: string } | null>(null);
  useEffect(() => {
    supabase.from("support_settings").select("apk_url, apk_label").maybeSingle()
      .then(({ data }) => { if (data && data.apk_url) setS(data as any); });
  }, []);
  if (!s?.apk_url) return null;
  if (variant === "compact") {
    return (
      <a href={s.apk_url} download className="inline-flex items-center gap-2 rounded-full border border-forest/40 bg-forest/10 px-4 py-2 text-sm font-semibold text-forest hover:bg-forest/20">
        <Download className="h-4 w-4" /> {s.apk_label}
      </a>
    );
  }
  return (
    <a
      href={s.apk_url}
      download
      className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 font-semibold text-forest-foreground shadow-lg shadow-forest/30 transition-all hover:bg-forest/90 hover:scale-[1.02]"
    >
      <Download className="h-4 w-4" /> {s.apk_label}
    </a>
  );
}
