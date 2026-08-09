import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatXAF } from "@/lib/format";
import { ProfileEditor } from "@/components/ProfileEditor";
import { AdminRequestDialog } from "@/components/AdminRequestDialog";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Your account — St Kingston" }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminReq, setShowAdminReq] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: o } = await supabase
        .from("orders")
        .select("id, order_number, status, total_xaf, created_at, region, city, rider_id, delivery_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = o ?? [];
      // Hydrate rider profiles so we can show "Delivered by <name>" in history.
      const riderIds = Array.from(new Set(list.map((r: any) => r.rider_id).filter(Boolean)));
      let riderMap = new Map<string, any>();
      if (riderIds.length) {
        const { data: rs } = await (supabase as any).from("riders").select("user_id, full_name, phone").in("user_id", riderIds);
        riderMap = new Map((rs || []).map((r: any) => [r.user_id, r]));
      }
      setOrders(list.map((row: any) => ({ ...row, rider: row.rider_id ? riderMap.get(row.rider_id) : null })));
      setLoading(false);
    })();
  }, [user, authLoading]);


  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (authLoading) return <div className="py-20 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to your account</h1>
        <Link to="/auth" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Account</p>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">Hello{user.email ? `, ${user.email.split("@")[0]}` : ""}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAdminReq(true)} className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
            <ShieldCheck className="h-4 w-4 text-primary" /> Request admin badge
          </button>
          <button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      <section className="mt-8"><ProfileEditor /></section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Your orders</h2>
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            No orders yet. <Link to="/" className="text-primary underline">Start shopping</Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to="/orders/$orderNumber"
                  params={{ orderNumber: o.order_number }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="flex items-center gap-1 font-display font-bold">{o.order_number}<CopyButton value={o.order_number} /></p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()} · {o.city}, {o.region}
                    </p>
                    {o.rider && (
                      <p className="mt-0.5 text-[11px] text-forest">🛵 {o.status === "delivered" ? "Delivered by" : "Rider:"} {o.rider.full_name} · {o.rider.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">{formatXAF(o.total_xaf)}</p>
                    <p className="text-xs capitalize text-muted-foreground">{o.status.replace("_", " ")}</p>
                  </div>

                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAdminReq && <AdminRequestDialog onClose={() => setShowAdminReq(false)} />}
    </div>
  );
}
