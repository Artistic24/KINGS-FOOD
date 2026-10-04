import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Ticket, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatXAF } from "@/lib/format";

const sb = supabase as any;
const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

type Voucher = {
  id: string;
  user_id: string | null;
  code: string;
  label: string | null;
  amount_xaf: number;
  percent_off: number | null;
  used: boolean;
  expires_at: string | null;
  created_at: string;
};

function randomCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "KF" + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

function isPast(v: Voucher) {
  return v.used || (v.expires_at ? new Date(v.expires_at) < new Date() : false);
}

export function VouchersTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: randomCode(), label: "", amount_xaf: 1000, percent_off: "", expires_at: "", email: "" });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const { data, error } = await sb.from("vouchers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Voucher[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      let userId: string | null = null;
      if (form.email.trim()) {
        const { data: p } = await sb.from("profiles").select("id").ilike("full_name", form.email.trim()).maybeSingle();
        userId = p?.id ?? null;
      }
      const { error } = await sb.from("vouchers").insert({
        code: form.code.trim().toUpperCase(),
        label: form.label || null,
        amount_xaf: Number(form.amount_xaf) || 0,
        percent_off: form.percent_off ? Number(form.percent_off) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voucher created");
      setForm({ code: randomCode(), label: "", amount_xaf: 1000, percent_off: "", expires_at: "", email: "" });
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (e: any) => toast.error(e.message || "Could not create voucher"),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<Voucher> }) => {
      const { error } = await sb.from("vouchers").update(v.patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-vouchers"] }),
    onError: (e: any) => toast.error(e.message || "Could not update voucher"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("vouchers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-vouchers"] }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Ticket className="h-5 w-5 text-primary" /> Vouchers</h2>
        <p className="mt-1 text-xs text-muted-foreground">Create vouchers for everyone or a single customer, set expiry dates, and revive expired ones.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input className={inp} placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className={inp} placeholder="Label (e.g. Welcome bonus)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input className={inp} type="number" placeholder="Amount (XAF)" value={form.amount_xaf} onChange={(e) => setForm({ ...form, amount_xaf: Number(e.target.value) })} />
          <input className={inp} type="number" placeholder="Percent off (optional)" value={form.percent_off} onChange={(e) => setForm({ ...form, percent_off: e.target.value })} />
          <input className={inp} type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <input className={inp} placeholder="Customer name (blank = everyone)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button onClick={() => create.mutate()} disabled={create.isPending} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {create.isPending ? "Saving…" : "Create voucher"}
        </button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {[...(rows || [])].sort((a, b) => Number(isPast(a)) - Number(isPast(b))).map((v, i, arr) => {
            const expired = v.expires_at ? new Date(v.expires_at) < new Date() : false;
            const showHeader = isPast(v) && (i === 0 || !isPast(arr[i - 1]));
            return (
              <div key={v.id}>
              {showHeader && <h3 className="mt-4 mb-2 font-display text-base font-bold">Voucher history (used or expired)</h3>}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div>
                  <p className="font-mono text-sm font-bold">{v.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.label ? `${v.label} — ` : ""}
                    {v.percent_off ? `${v.percent_off}% off` : formatXAF(v.amount_xaf)}
                    {v.user_id ? " — single customer" : " — everyone"}
                    {v.expires_at ? ` — expires ${new Date(v.expires_at).toLocaleDateString()}` : " — no expiry"}
                  </p>
                  {(v.used || expired) && <p className="text-xs text-destructive">{v.used ? "Used" : "Expired"}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="rounded-xl border border-input bg-background px-2 py-1 text-xs"
                    type="date"
                    value={v.expires_at ? new Date(v.expires_at).toISOString().slice(0, 10) : ""}
                    onChange={(e) => update.mutate({ id: v.id, patch: { expires_at: e.target.value ? new Date(e.target.value).toISOString() : null } })}
                  />
                  {(v.used || expired) && (
                    <button
                      onClick={() => update.mutate({ id: v.id, patch: { used: false, expires_at: new Date(Date.now() + 30 * 864e5).toISOString() } })}
                      className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-forest-foreground"
                    >Revive 30 days</button>
                  )}
                  <button onClick={() => remove.mutate(v.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              </div>
            );
          })}
          {(rows || []).length === 0 && <p className="text-sm text-muted-foreground">No vouchers yet.</p>}
        </div>
      )}
    </div>
  );
}
