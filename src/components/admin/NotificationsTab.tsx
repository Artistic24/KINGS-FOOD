import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REGIONS } from "@/lib/cameroon-towns";
import { sendPushForNotifications } from "@/lib/push.functions";

const sb = supabase as any;
const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

type Target = "all" | "region" | "user";

export function NotificationsTab() {
  const [target, setTarget] = useState<Target>("all");
  const [region, setRegion] = useState("");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const qc = useQueryClient();
  const { data: history } = useQuery({
    queryKey: ["admin-notify-history"],
    queryFn: async () => {
      const { data } = await sb.from("notifications").select("title, body, created_at, read").order("created_at", { ascending: false }).limit(2000);
      const groups = new Map<string, { title: string; body: string | null; at: string; count: number; read: number }>();
      for (const n of (data || []) as any[]) {
        const key = `${n.title}|${n.body ?? ""}|${String(n.created_at).slice(0, 16)}`;
        const g = groups.get(key);
        if (g) { g.count++; if (n.read) g.read++; }
        else groups.set(key, { title: n.title, body: n.body, at: n.created_at, count: 1, read: n.read ? 1 : 0 });
      }
      return Array.from(groups.values()).slice(0, 100);
    },
  });

  const { data: people } = useQuery({
    queryKey: ["admin-notify-people"],
    queryFn: async () => {
      const { data } = await sb.from("profiles").select("id, full_name, phone").order("created_at", { ascending: false }).limit(1000);
      return (data || []) as { id: string; full_name: string | null; phone: string | null }[];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Add a title");
      let ids: string[] = [];
      if (target === "user") {
        if (!userId) throw new Error("Pick a customer");
        ids = [userId];
      } else if (target === "region") {
        if (!region) throw new Error("Pick a region");
        const { data } = await sb.from("orders").select("user_id").eq("region", region);
        ids = Array.from(new Set(((data || []) as any[]).map((o) => o.user_id)));
      } else {
        ids = (people || []).map((p) => p.id);
      }
      if (ids.length === 0) throw new Error("No recipients found");
      const { data: created, error } = await sb.from("notifications")
        .insert(ids.map((id) => ({ user_id: id, title: title.trim(), body: body.trim() || null })))
        .select("id");
      if (error) throw error;
      if (created?.length) {
        void sendPushForNotifications({ data: { notificationIds: created.map((n: any) => n.id) } })
          .catch((e) => console.warn("Push notification delivery failed", e));
      }
      return ids.length;
    },
    onSuccess: (n) => { toast.success(`Sent to ${n} customer${n === 1 ? "" : "s"}`); setTitle(""); setBody(""); qc.invalidateQueries({ queryKey: ["admin-notify-history"] }); },
    onError: (e: any) => toast.error(e.message || "Could not send"),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Bell className="h-5 w-5 text-primary" /> Send notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">Reach everyone, one region, or a single customer. Messages appear in their profile → Notifications.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "region", "user"] as Target[]).map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${target === t ? "bg-primary text-primary-foreground" : "border border-input"}`}
            >
              {t === "all" ? "Everyone" : t === "region" ? "By region" : "One customer"}
            </button>
          ))}
        </div>

        {target === "region" && (
          <select className={`${inp} mt-3`} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Pick a region…</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}

        {target === "user" && (
          <select className={`${inp} mt-3`} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Pick a customer…</option>
            {(people || []).map((p) => (
              <option key={p.id} value={p.id}>{p.full_name || "Customer"}{p.phone ? ` — ${p.phone}` : ""}</option>
            ))}
          </select>
        )}

        <input className={`${inp} mt-3`} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={`${inp} mt-2`} rows={3} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />

        <button onClick={() => send.mutate()} disabled={send.isPending} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {send.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send notification
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-base font-bold">Notification history</h3>
        <div className="mt-2 divide-y divide-border">
          {(history || []).map((h, i) => (
            <div key={i} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{h.title}</span>
                <span className="text-[11px] text-muted-foreground">{h.count} recipient{h.count === 1 ? "" : "s"} · {h.read} read</span>
              </div>
              {h.body && <p className="text-xs text-muted-foreground">{h.body}</p>}
              <p className="text-[11px] text-muted-foreground">{new Date(h.at).toLocaleString()}</p>
            </div>
          ))}
          {(history || []).length === 0 && <p className="py-2 text-xs text-muted-foreground">No notifications sent yet.</p>}
        </div>
      </div>
    </div>
  );
}
