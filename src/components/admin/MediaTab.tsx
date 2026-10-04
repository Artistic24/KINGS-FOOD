import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Film, Image as ImageIcon, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const BUCKET_LABELS: Record<string, string> = {
  "brand-assets": "Products, logos & adverts",
  "chat-files": "Chat files",
  "payment-proofs": "Payment screenshots",
  "rider-verification": "Rider ID & face videos",
  avatars: "Profile photos",
};

type Media = { id: string; bucket_id: string; name: string; size: number; mimetype: string | null; created_at: string };

const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Thumb({ m }: { m: Media }) {
  const isImg = m.mimetype?.startsWith("image/");
  const isVid = m.mimetype?.startsWith("video/");
  const { data: url } = useQuery({
    queryKey: ["media-url", m.bucket_id, m.name],
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from(m.bucket_id).createSignedUrl(m.name, 3600);
      return data?.signedUrl ?? null;
    },
  });
  const open = () => (url ? window.open(url, "_blank") : toast.error("File not available"));
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button onClick={open} className="grid aspect-square w-full place-items-center bg-muted">
        {isImg && url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
          : isVid && url ? <video src={url} muted className="h-full w-full object-cover" />
          : isVid ? <Film className="h-8 w-8 text-muted-foreground" />
          : isImg ? <ImageIcon className="h-8 w-8 text-muted-foreground" />
          : <FileText className="h-8 w-8 text-muted-foreground" />}
      </button>
      <div className="space-y-0.5 p-2">
        <p className="truncate text-xs font-medium" title={m.name}>{m.name.split("/").pop()}</p>
        <p className="text-[10px] text-muted-foreground">{fmtSize(m.size)} · {new Date(m.created_at).toLocaleDateString()}</p>
        <button onClick={open} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><Download className="h-3 w-3" /> Open</button>
      </div>
    </div>
  );
}

export function MediaTab() {
  const [bucket, setBucket] = useState("all");
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("admin_list_media", { _limit: 2000 });
      if (error) throw error;
      return data as Media[];
    },
  });
  const buckets = useMemo(() => Array.from(new Set(data.map((m) => m.bucket_id))), [data]);
  const list = data.filter((m) =>
    (bucket === "all" || m.bucket_id === bucket) &&
    (kind === "all" || (kind === "other" ? !/^(image|video)\//.test(m.mimetype ?? "") : m.mimetype?.startsWith(kind + "/"))) &&
    (!q || m.name.toLowerCase().includes(q.toLowerCase())),
  );
  const total = list.reduce((s, m) => s + m.size, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ImageIcon className="h-5 w-5 text-primary" /> Media</h2>
        <p className="mt-1 text-xs text-muted-foreground">Every file uploaded on the website — {list.length} files · {fmtSize(total)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search file name" className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm" />
          </div>
          <select value={bucket} onChange={(e) => setBucket(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="all">All folders</option>
            {buckets.map((b) => <option key={b} value={b}>{BUCKET_LABELS[b] ?? b}</option>)}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="all">All types</option><option value="image">Images</option><option value="video">Videos</option><option value="other">Other files</option>
          </select>
        </div>
      </div>
      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        : error ? <p className="text-sm text-destructive">{(error as any).message}</p>
        : list.length === 0 ? <p className="text-sm text-muted-foreground">No files found.</p>
        : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">{list.slice(0, 300).map((m) => <Thumb key={m.id} m={m} />)}</div>}
    </div>
  );
}
