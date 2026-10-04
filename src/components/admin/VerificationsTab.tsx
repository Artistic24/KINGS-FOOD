import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Loader2, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type Verification = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  id_type: string;
  id_front_path: string | null;
  id_back_path: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
};

const ID_LABELS: Record<string, string> = {
  id_card: "National ID card",
  passport: "Passport",
  drivers_license: "Driver's license",
};

function IdPreview({ path, label }: { path: string | null; label: string }) {
  const { data: url } = useQuery({
    queryKey: ["verify-id", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("rider-verification").createSignedUrl(path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!path) return <span className="text-xs text-muted-foreground">No {label.toLowerCase()} photo</span>;
  return (
    <button
      onClick={() => (url ? window.open(url, "_blank") : toast.error("Photo not available"))}
      className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 text-xs hover:bg-muted"
    >
      <SearchIcon className="h-3 w-3" /> {label}
    </button>
  );
}

export function VerificationsTab() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("account_verifications")
        .select("id, user_id, full_name, phone, id_type, id_front_path, id_back_path, status, review_notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Verification[];
    },
  });

  const respond = useMutation({
    mutationFn: async (v: { row: Verification; status: "approved" | "declined" }) => {
      const note = notes[v.row.id] ?? "";
      const { error } = await sb
        .from("account_verifications")
        .update({ status: v.status, review_notes: note || null, reviewed_at: new Date().toISOString() })
        .eq("id", v.row.id);
      if (error) throw error;
      await sb.from("notifications").insert({
        user_id: v.row.user_id,
        title: v.status === "approved" ? "Account verified" : "Verification declined",
        body:
          note ||
          (v.status === "approved"
            ? "Your account is now verified. You can request an admin badge or apply as a rider."
            : "Your verification was declined. Please check your details and submit again."),
        link: "/account",
      });
    },
    onSuccess: () => {
      toast.success("Customer notified");
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    },
    onError: (e: any) => toast.error(e.message || "Could not update verification"),
  });

  if (isLoading) return <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const pending = (rows || []).filter((r) => r.status === "pending");
  const past = (rows || []).filter((r) => r.status !== "pending");

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><BadgeCheck className="h-5 w-5 text-primary" /> Account verification</h2>
        <p className="mt-1 text-xs text-muted-foreground">Approve or decline identity checks. The customer gets an in-app notification with your note.</p>
      </div>

      {pending.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{r.full_name}</p>
              <p className="text-xs text-muted-foreground">{r.phone} · {ID_LABELS[r.id_type] ?? r.id_type}</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold uppercase">{r.status}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <IdPreview path={r.id_front_path} label="ID front" />
            <IdPreview path={r.id_back_path} label="ID back" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
          <textarea
            className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            rows={2}
            placeholder="Note to the customer (optional)…"
            value={notes[r.id] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
          />
          <div className="mt-2 flex gap-2">
            <button onClick={() => respond.mutate({ row: r, status: "approved" })} disabled={respond.isPending} className="rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-forest-foreground">Approve</button>
            <button onClick={() => respond.mutate({ row: r, status: "declined" })} disabled={respond.isPending} className="rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-destructive-foreground">Decline</button>
          </div>
        </div>
      ))}
      {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending verification requests.</p>}

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-base font-bold">Verification history</h3>
        <div className="mt-2 divide-y divide-border">
          {past.map((r) => (
            <div key={r.id} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{r.full_name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${r.status === "approved" ? "bg-forest/15 text-forest" : "bg-destructive/15 text-destructive"}`}>{r.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.phone} · {ID_LABELS[r.id_type] ?? r.id_type}</p>
              {r.review_notes && <p className="text-xs">Note: {r.review_notes}</p>}
              <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
          ))}
          {past.length === 0 && <p className="py-2 text-xs text-muted-foreground">No past verifications yet.</p>}
        </div>
      </div>
    </div>
  );
}
