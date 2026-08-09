import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Delivered = { id: string; order_number: string; delivered_at: string | null };

const STORE_KEY = "kf_delivered_ack";

function acked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}
function ack(id: string) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...new Set([...acked(), id])].slice(-50)));
  } catch {
    /* ignore */
  }
}

/**
 * Shows a one-time "your order was delivered successfully" confirmation to the
 * buyer the next time they are signed in, until they tap OK.
 */
export function DeliveredPopup() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Delivered[]>([]);

  useEffect(() => {
    if (!user) { setQueue([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, order_number, delivered_at")
        .eq("user_id", user.id)
        .eq("delivery_status", "delivered")
        .order("delivered_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      const seen = acked();
      setQueue(((data ?? []) as Delivered[]).filter((o) => !seen.includes(o.id)));
    };
    load();
    const ch = supabase
      .channel("delivered-popup")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  const current = queue[0];
  if (!current) return null;

  const dismiss = () => {
    ack(current.id);
    setQueue((q) => q.slice(1));
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-forest/15">
          <CheckCircle2 className="h-9 w-9 text-forest" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold">Your order was delivered successfully ✅</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Order <span className="font-semibold text-foreground">{current.order_number}</span>
          {current.delivered_at ? ` · ${new Date(current.delivered_at).toLocaleString()}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Thank you for shopping with KINGS FOOD.</p>
        <button
          onClick={dismiss}
          className="mt-5 w-full rounded-full bg-forest px-6 py-3 font-semibold text-forest-foreground"
        >
          OK
        </button>
      </div>
    </div>
  );
}
