import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type Refund = {
  id: string;
  user_id: string;
  order_number: string | null;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export function RefundsTab() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("refund_requests")
        .select("id, user_id, order_number, reason, status, admin_notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Refund[];
    },
  });

  const respond = useMutation({
    mutationFn: async (v: { row: Refund; status: string }) => {
      const note = notes[v.row.id] ?? "";
      const { error } = await sb
        .from("refund_requests")
        .update({ status: v.status, admin_notes: note || null })
        .eq("id", v.row.id);
      if (error) throw error;
      await sb.from("notifications").insert({
        user_id: v.row.user_id,
        title: `Refund ${v.status}`,
        body: note || `Your refund request${v.row.order_number ? ` for ${v.row.order_number}` : ""} was ${v.status}.`,
        link: "/account",
      });
    },
    onSuccess: () => {
      toast.success("Customer notified");
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    },
    onError: (e: any) => toast.error(e.message || "Could not update refund"),
  });

  if (isLoading) return <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Undo2 className="h-5 w-5 text-primary" /> Refund requests</h2>
        <p className="mt-1 text-xs text-muted-foreground">Approve or decline refunds. The customer gets an in-app notification with your note.</p>
      </div>

      {(rows || []).filter((r) => r.status === "pending").map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{r.order_number || "No order number"}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${r.status === "approved" ? "bg-forest/15 text-forest" : r.status === "declined" ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>{r.status}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
          {r.admin_notes && <p className="mt-1 text-xs">Note: {r.admin_notes}</p>}
          <textarea
            className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            rows={2}
            placeholder="Reply to the customer…"
            value={notes[r.id] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
          />
          <div className="mt-2 flex gap-2">
            <button onClick={() => respond.mutate({ row: r, status: "approved" })} className="rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-forest-foreground">Approve</button>
            <button onClick={() => respond.mutate({ row: r, status: "declined" })} className="rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-destructive-foreground">Decline</button>
          </div>
        </div>
      ))}

      {(rows || []).filter((r) => r.status === "pending").length === 0 && <p className="text-sm text-muted-foreground">No pending refund requests.</p>}

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-base font-bold">Refund history</h3>
        <div className="mt-2 divide-y divide-border">
          {(rows || []).filter((r) => r.status !== "pending").map((r) => (
            <div key={r.id} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{r.order_number || "No order number"}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${r.status === "approved" ? "bg-forest/15 text-forest" : "bg-destructive/15 text-destructive"}`}>{r.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.reason}</p>
              {r.admin_notes && <p className="text-xs">Note: {r.admin_notes}</p>}
              <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
          ))}
          {(rows || []).filter((r) => r.status !== "pending").length === 0 && <p className="py-2 text-xs text-muted-foreground">No past refunds yet.</p>}
        </div>
      </div>
    </div>
  );
}
