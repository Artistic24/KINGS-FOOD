import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Layers,
  MapPin as MapPinIcon,
  Users as UsersIcon,
  ShieldCheck,
  Search as SearchIcon,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  Wallet,
  Crown,
  LifeBuoy,
  Inbox,
  Check,
  X as XIcon,
  Bike,
  Download,
  Palette,
  Megaphone,
  Upload,
  KeyRound,
  FolderArchive,
  Home as HomeIcon,
} from "lucide-react";
import { BrandTab } from "@/components/admin/BrandTab";
import { AdsTab } from "@/components/admin/AdsTab";
import { ExportsTab } from "@/components/admin/ExportsTab";
import { CodeExportTab } from "@/components/admin/CodeExportTab";
import { RolesTab } from "@/components/admin/RolesTab";
import { HomeTab } from "@/components/admin/HomeTab";
import { RiderLeaderboardTab } from "@/components/admin/RiderLeaderboardTab";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatXAF } from "@/lib/format";
import { RevenuePanel } from "@/components/admin/RevenuePanel";
import { CopyButton } from "@/components/CopyButton";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — St Kingston" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type TabKey = "dashboard" | "home" | "products" | "orders" | "sectors" | "zones" | "users" | "admins" | "payments" | "support" | "requests" | "riders" | "leaderboard" | "brand" | "ads" | "exports" | "code" | "roles";

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [deniedSections, setDeniedSections] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<TabKey>("dashboard");


  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); setChecking(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data }, { data: superFlag }, { data: sections }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
        supabase.rpc("is_user_super_admin", { _uid: user.id }),
        supabase.rpc("my_admin_sections"),
      ]);
      if (cancelled) return;
      setIsAdmin(!!data);
      setIsSuper(!!superFlag);
      setDeniedSections(new Set(((sections as any[]) || []).filter((s) => !s.allowed).map((s) => s.section)));
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  if (authLoading || checking) {
    return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Admin sign-in required</h1>
        <Link to="/auth" search={{ redirect: "/admin" }} className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }
  if (!isAdmin) return <ClaimAdmin onClaim={() => setIsAdmin(true)} />;

  const allTabs: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "home", label: "Home page", icon: HomeIcon },
    { key: "products", label: "Products", icon: Package },
    { key: "orders", label: "Orders", icon: ShoppingCart },
    { key: "sectors", label: "Sectors", icon: Layers },
    { key: "zones", label: "Delivery zones", icon: MapPinIcon },
    { key: "users", label: "Customers", icon: UsersIcon },
    { key: "admins", label: "Admins", icon: ShieldCheck },
    { key: "payments", label: "Payment settings", icon: Wallet },
    { key: "support", label: "Support", icon: LifeBuoy },
    { key: "requests", label: "Admin requests", icon: Inbox },
    { key: "riders", label: "Rider requests", icon: Bike },
    { key: "leaderboard", label: "Rider leaderboard", icon: Bike },
    { key: "brand", label: "Brand", icon: Palette },
    { key: "ads", label: "Ads", icon: Megaphone },
    { key: "exports", label: "Exports", icon: Download },
    { key: "code", label: "Source code", icon: FolderArchive },
    ...(isSuper ? [{ key: "roles" as TabKey, label: "Roles", icon: KeyRound }] : []),
  ];

  const tabs = isSuper ? allTabs : allTabs.filter((t) => !deniedSections.has(t.key));
  const active: TabKey = tabs.some((t) => t.key === tab) ? tab : (tabs[0]?.key ?? "dashboard");


  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Control center</h1>
          <p className="text-xs text-muted-foreground">St Kingston operations dashboard</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active === t.key ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {active === "dashboard" && <DashboardTab onNavigate={setTab} />}
      {active === "home" && <HomeTab />}
      {active === "products" && <ProductsTab />}
      {active === "orders" && <OrdersTab />}
      {active === "sectors" && <SectorsTab />}
      {active === "zones" && <ZonesTab />}
      {active === "users" && <UsersTab />}
      {active === "admins" && <AdminsTab />}
      {active === "payments" && <PaymentsTab />}
      {active === "support" && <SupportSettingsTab />}
      {active === "requests" && <AdminRequestsTab />}
      {active === "riders" && <RiderRequestsTab />}
      {active === "leaderboard" && <RiderLeaderboardTab />}
      {active === "brand" && <BrandTab />}
      {active === "ads" && <AdsTab />}
      {active === "exports" && <ExportsTab />}
      {active === "code" && <CodeExportTab />}
      {active === "roles" && isSuper && <RolesTab />}

    </div>
  );
}

function ClaimAdmin({ onClaim }: { onClaim: () => void }) {
  const [loading, setLoading] = useState(false);
  const claim = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("claim_admin");
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data === true) { toast.success("You are now the admin"); onClaim(); }
    else toast.error("Admin already exists. Ask the current admin to add you.");
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-bold">Claim admin access</h1>
      <p className="mt-2 text-sm text-muted-foreground">If no admin exists yet, click below to claim the role for this account.</p>
      <button onClick={claim} disabled={loading} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}Claim admin
      </button>
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardTab({ onNavigate }: { onNavigate: (t: TabKey) => void }) {
  const [showRevenue, setShowRevenue] = useState(false);
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, orders, users, revenue] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, status, total_xaf, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_xaf"),
      ]);
      const totalRev = (revenue.data ?? []).reduce((s, o: any) => s + (o.total_xaf || 0), 0);
      const byStatus = (orders.data ?? []).reduce<Record<string, number>>((acc, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1; return acc;
      }, {});
      return {
        products: products.count ?? 0,
        users: users.count ?? 0,
        orderCount: orders.data?.length ?? 0,
        revenue: totalRev,
        byStatus,
        recent: orders.data ?? [],
      };
    },
  });

  if (!stats) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  const cards: Array<{ label: string; value: any; tab?: TabKey; onClick?: () => void }> = [
    { label: "Products", value: stats.products, tab: "products" },
    { label: "Customers", value: stats.users, tab: "users" },
    { label: "Orders", value: stats.orderCount, tab: "orders" },
    { label: "Revenue", value: formatXAF(stats.revenue), onClick: () => setShowRevenue((v) => !v) },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => {
          const clickable = !!c.tab || !!c.onClick;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => (c.onClick ? c.onClick() : c.tab && onNavigate(c.tab))}
              disabled={!clickable}
              className={`rounded-2xl border border-border bg-card p-5 text-left transition-colors ${clickable ? "hover:border-primary hover:bg-muted/40 cursor-pointer" : "cursor-default"}`}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
              {clickable && (
                <p className="mt-1 text-[10px] uppercase tracking-wider text-primary">
                  {c.onClick ? (showRevenue ? "Hide breakdown ↑" : "See breakdown →") : "View →"}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {showRevenue && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
          <RevenuePanel />
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-bold">Orders by status</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(stats.byStatus).map(([s, n]) => (
            <span key={s} className="rounded-full bg-muted px-3 py-1 text-sm">{s}: <b>{n}</b></span>
          ))}
          {Object.keys(stats.byStatus).length === 0 && <span className="text-sm text-muted-foreground">No orders yet</span>}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-bold">Recent orders</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">When</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {stats.recent.slice(0, 10).map((o: any) => (
                <tr key={o.id} className="border-t border-border"><td className="py-2">{new Date(o.created_at).toLocaleString()}</td><td>{o.status}</td><td>{formatXAF(o.total_xaf)}</td></tr>
              ))}
              {stats.recent.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ PRODUCTS ============
function ProductsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, sectors(name, slug)").order("name").limit(2000);
      if (error) throw error; return data ?? [];
    },
  });
  const { data: sectors = [] } = useQuery({
    queryKey: ["admin-sectors-list"],
    queryFn: async () => (await supabase.from("sectors").select("id, name").order("sort_order")).data ?? [],
  });

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return t ? products.filter((p: any) => p.name.toLowerCase().includes(t) || p.slug.includes(t)) : products;
  }, [products, q]);

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Product deleted"); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm" />
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground"><Plus className="h-4 w-4" />New product</button>
      </div>
      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Product</th><th>Sector</th><th>Price</th><th>Stock</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg border border-border object-cover" />
                        : <div className="grid h-10 w-10 place-items-center rounded-lg border border-dashed border-border text-[9px] text-muted-foreground">—</div>}
                      <div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.slug}</div></div>
                    </div>
                  </td>
                  <td>{p.sectors?.name ?? "—"}</td>
                  <td>{formatXAF(p.price_xaf)}</td>
                  <td>{p.stock}</td>
                  <td>{p.active ? "✅" : "❌"}</td>
                  <td className="text-right">
                    <button onClick={() => setEditing(p)} className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No products</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{filtered.length} of {products.length}</p>

      {(editing || creating) && (
        <ProductEditor
          product={editing}
          sectors={sectors}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); qc.invalidateQueries({ queryKey: ["admin-products"] }); }}
        />
      )}
    </div>
  );
}

function ProductEditor({ product, sectors, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sector_id: product?.sector_id ?? sectors[0]?.id ?? "",
    description: product?.description ?? "",
    price_xaf: product?.price_xaf ?? 1000,
    image_url: product?.image_url ?? "",
    unit: product?.unit ?? "",
    stock: product?.stock ?? 100,
    featured: product?.featured ?? false,
    active: product?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const uploadImage = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8 MB");
    setUploadingImg(true);
    try {
      const path = `products/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      setForm((f: any) => ({ ...f, image_url: data?.signedUrl || "" }));
      toast.success("Image uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingImg(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
    const op = product
      ? supabase.from("products").update(payload).eq("id", product.id)
      : supabase.from("products").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(product ? "Product updated" : "Product created");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-background p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{product ? "Edit product" : "New product"}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-3">
          <Field label="Name"><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Slug (optional, auto from name)"><input className={inp} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Sector">
            <select className={inp} value={form.sector_id} onChange={(e) => setForm({ ...form, sector_id: e.target.value })}>
              {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Description"><textarea rows={3} className={inp} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (XAF)"><input type="number" className={inp} value={form.price_xaf} onChange={(e) => setForm({ ...form, price_xaf: Number(e.target.value) })} /></Field>
            <Field label="Stock"><input type="number" className={inp} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Product image">
            <div className="flex items-start gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt={form.name || "Product image"} className="h-20 w-20 rounded-xl border border-border object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-border text-[10px] text-muted-foreground">No image</div>
              )}
              <div className="flex-1 space-y-2">
                <input className={inp} placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-muted">
                    {uploadingImg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {form.image_url ? "Replace image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }}
                    />
                  </label>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive">Remove image</button>
                  )}
                </div>
              </div>
            </div>
          </Field>
          <Field label="Unit (e.g. kg, pcs)"><input className={inp} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />Featured</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active</label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-input px-5 py-2.5 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1"><span className="text-xs font-medium text-foreground/80">{label}</span>{children}</label>;
}

// ============ ORDERS ============
function OrdersTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error; return data ?? [];
    },
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Order updated"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const statuses: Array<"pending_payment" | "placed" | "confirmed" | "preparing" | "dispatched" | "delivered" | "cancelled"> = ["pending_payment", "placed", "confirmed", "preparing", "dispatched", "delivered", "cancelled"];

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.filter((o: any) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!t) return true;
      return (
        (o.order_number || "").toLowerCase().includes(t) ||
        (o.customer_name || "").toLowerCase().includes(t) ||
        (o.customer_phone || "").toLowerCase().includes(t) ||
        (o.status || "").toLowerCase().includes(t)
      );
    });
  }, [orders, filter, q]);

  return (
    <div>
      <div className="mb-3 relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by order # (SK-…), name, phone, or status"
          className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm"
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...statuses].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70 hover:bg-muted/70"}`}>{s}</button>
        ))}
      </div>
      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : (
        <div className="space-y-3">
          {filtered.map((o: any) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1 font-display font-bold">{o.order_number}<CopyButton value={o.order_number} /> <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase ${o.status === "delivered" ? "bg-forest/15 text-forest" : "bg-muted text-foreground/70"}`}>{o.status}</span></p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.customer_name} · {o.customer_phone}</p>
                  <p className="text-xs text-muted-foreground">{o.region}, {o.city} · {o.payment_method} · {o.payment_status}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold">{formatXAF(o.total_xaf)}</p>
                  <select value={o.status} onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value })} className="mt-1 rounded-lg border border-input bg-background px-2 py-1 text-xs">
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                {o.order_items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between"><span>{it.quantity}× {it.product_name}</span><span>{formatXAF(it.line_total_xaf || it.unit_price_xaf * it.quantity)}</span></div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {(o.latitude && o.longitude) && (
                  <a href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><MapPinIcon className="h-3 w-3" />Delivery pin</a>
                )}
                {(o.origin_latitude && o.origin_longitude) && (
                  <a href={`https://www.google.com/maps?q=${o.origin_latitude},${o.origin_longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-forest hover:underline"><MapPinIcon className="h-3 w-3" />Customer's live location {o.origin_accuracy_m ? `(±${Math.round(o.origin_accuracy_m)} m)` : ""}</a>
                )}
                {(o.latitude && o.longitude && o.origin_latitude && o.origin_longitude) && (
                  <a href={`https://www.google.com/maps/dir/${o.origin_latitude},${o.origin_longitude}/${o.latitude},${o.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-saffron-foreground hover:underline">🧭 Route</a>
                )}
                {o.payment_proof_url && (
                  <a href={o.payment_proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-forest hover:underline">🧾 Payment screenshot</a>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-muted-foreground">No orders match</p>}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{filtered.length} of {orders.length}</p>
    </div>
  );
}

// ============ SECTORS ============
function SectorsTab() {
  const qc = useQueryClient();
  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ["admin-sectors"],
    queryFn: async () => (await supabase.from("sectors").select("*").order("sort_order")).data ?? [],
  });
  const save = async (id: string, patch: any) => {
    const { error } = await supabase.from("sectors").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-sectors"] });
  };
  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sectors.map((s: any) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: `color-mix(in oklab, ${s.accent_color || "#E85D2C"} 20%, transparent)` }}>{s.icon}</span>
            <div className="flex-1">
              <input defaultValue={s.name} onBlur={(e) => e.target.value !== s.name && save(s.id, { name: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-1 font-display font-bold hover:border-input" />
              <input defaultValue={s.tagline ?? ""} onBlur={(e) => e.target.value !== s.tagline && save(s.id, { tagline: e.target.value })} placeholder="Tagline" className="w-full rounded-lg border border-transparent bg-transparent px-1 text-sm text-muted-foreground hover:border-input" />
            </div>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" defaultChecked={s.active} onChange={(e) => save(s.id, { active: e.target.checked })} />active</label>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ ZONES ============
function ZonesTab() {
  const qc = useQueryClient();
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["admin-zones"],
    queryFn: async () => (await supabase.from("delivery_zones").select("*").order("fee_xaf")).data ?? [],
  });
  const save = async (id: string, patch: any) => {
    const { error } = await supabase.from("delivery_zones").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-zones"] });
  };
  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  return (
    <div className="space-y-3">
    <p className="text-xs text-muted-foreground">Uncheck <b>Available</b> to stop taking orders for a region — it disappears from checkout and shows as “Temporarily unavailable” on the homepage. The fee below is added to every order total in that region.</p>
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Region</th><th>Fee (XAF)</th><th>Est. days</th><th>Available</th></tr></thead>
        <tbody>
          {zones.map((z: any) => (
            <tr key={z.id} className="border-t border-border">
              <td className="p-3 font-medium">{z.region}</td>
              <td><input type="number" defaultValue={z.fee_xaf} onBlur={(e) => Number(e.target.value) !== z.fee_xaf && save(z.id, { fee_xaf: Number(e.target.value) })} className="w-32 rounded-lg border border-input bg-background px-2 py-1" /></td>
              <td><input defaultValue={z.est_days ?? ""} onBlur={(e) => e.target.value !== z.est_days && save(z.id, { est_days: e.target.value })} className="w-32 rounded-lg border border-input bg-background px-2 py-1" /></td>
              <td className="p-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={z.active !== false}
                    onChange={(e) => save(z.id, { active: e.target.checked })}
                    className="h-4 w-4 accent-current"
                  />
                  <span className={z.active !== false ? "font-semibold text-forest" : "text-muted-foreground"}>
                    {z.active !== false ? "Delivering" : "Unavailable"}
                  </span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

// ============ USERS ============
function UsersTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-profiles-full"],
    queryFn: async () => {
      const [p, r, o] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("orders").select("user_id, order_number, customer_name, customer_phone, total_xaf, status, created_at").order("created_at", { ascending: false }).limit(3000),
      ]);
      const roleMap = new Map<string, string[]>();
      (r.data ?? []).forEach((row: any) => {
        const arr = roleMap.get(row.user_id) ?? []; arr.push(row.role); roleMap.set(row.user_id, arr);
      });
      const orderMap = new Map<string, any[]>();
      (o.data ?? []).forEach((row: any) => {
        const arr = orderMap.get(row.user_id) ?? []; arr.push(row); orderMap.set(row.user_id, arr);
      });
      const profiles = (p.data ?? []).map((u: any) => {
        const orders = orderMap.get(u.id) ?? [];
        const latest = orders[0];
        return {
          ...u,
          roles: roleMap.get(u.id) ?? [],
          orders,
          orderCount: orders.length,
          totalSpent: orders.reduce((s, x) => s + (x.total_xaf || 0), 0),
          phone: u.phone || latest?.customer_phone || null,
          displayName: u.full_name || latest?.customer_name || null,
          lastOrderAt: latest?.created_at || null,
        };
      });
      return { profiles, orders: o.data ?? [] };
    },
  });
  const toggleAdmin = async (uid: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) return toast.error(error.message);
    }
    toast.success("Roles updated"); qc.invalidateQueries({ queryKey: ["admin-profiles-full"] });
  };

  const filtered = useMemo(() => {
    const list = data?.profiles ?? [];
    const t = q.trim().toLowerCase();
    if (!t) return list;
    // If query looks like an order number, find user via that order
    const orderMatch = (data?.orders ?? []).find((o: any) => (o.order_number || "").toLowerCase().includes(t));
    return list.filter((u: any) => {
      if (orderMatch && u.id === orderMatch.user_id) return true;
      return (
        (u.displayName || "").toLowerCase().includes(t) ||
        (u.phone || "").toLowerCase().includes(t) ||
        (u.id || "").toLowerCase().includes(t) ||
        (u.orders || []).some((o: any) =>
          (o.order_number || "").toLowerCase().includes(t) ||
          (o.customer_name || "").toLowerCase().includes(t) ||
          (o.customer_phone || "").toLowerCase().includes(t)
        )
      );
    });
  }, [data, q]);

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  return (
    <div>
      <div className="mb-4 relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers by name, phone, or order # (SK-…)"
          className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Name</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Roles</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <div className="font-medium">{u.displayName ?? "—"}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{u.id.slice(0, 8)}…</div>
                    {u.orders.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-primary">View {u.orders.length} order{u.orders.length === 1 ? "" : "s"}</summary>
                        <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          {u.orders.slice(0, 20).map((o: any) => (
                            <li key={o.order_number}>
                              <span className="font-mono">{o.order_number}</span> · {o.status} · {formatXAF(o.total_xaf)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                  <td className="text-xs">{u.phone ?? "—"}</td>
                  <td>{u.orderCount}</td>
                  <td>{formatXAF(u.totalSpent)}</td>
                  <td className="text-xs">{u.roles.join(", ") || "customer"}</td>
                  <td className="text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button onClick={() => toggleAdmin(u.id, isAdmin)} className={`rounded-full px-3 py-1 text-xs font-semibold ${isAdmin ? "bg-destructive/10 text-destructive" : "bg-primary text-primary-foreground"}`}>
                      {isAdmin ? "Remove admin" : "Make admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No customers match</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{filtered.length} of {data?.profiles.length ?? 0} customers</p>
    </div>
  );
}

// ============ ADMINS (super admin manages admins) ============
type AdminRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  region: string;
  town: string;
  latitude: number;
  longitude: number;
  is_super_admin: boolean;
  created_at: string;
};

const REGIONS = [
  "Centre","Littoral","West","North-West","South-West",
  "Adamawa","North","Far North","East","South",
];

function AdminsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: async (): Promise<AdminRow[]> => {
      const { data, error } = await supabase
        .from("admin_locations" as any)
        .select("*")
        .order("is_super_admin", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const me = admins.find((a) => a.user_id === user?.id);
  const iAmSuper = !!me?.is_super_admin;

  const remove = useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase.rpc("remove_admin" as any, { _target: target });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Admin removed"); qc.invalidateQueries({ queryKey: ["admin-locations"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSuper = useMutation({
    mutationFn: async (vars: { uid: string; make: boolean }) => {
      const { error } = await supabase.rpc("set_super_admin" as any, { _target: vars.uid, _make_super: vars.make });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-locations"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Admin team</h2>
          <p className="text-xs text-muted-foreground">
            Orders are routed to the closest admin (within 10 km) whose region &amp; town match the customer.
            Each region can have at most 4 admins, and only one per town.
            {iAmSuper ? " You are a super admin." : " You are a regular admin — only super admins can remove others."}
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add admin
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Admin</th><th>Region</th><th>Town</th><th>Home location</th><th>Tier</th><th></th></tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const isSelf = a.user_id === user?.id;
              // Newer admins can never remove or demote someone who joined before them.
              const older = !!me && new Date((a as any).created_at ?? 0) < new Date((me as any).created_at ?? 0);
              const canRemove = iAmSuper && !isSelf && !older;
              const canEdit = isSelf || iAmSuper;
              return (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{a.full_name || "—"} {isSelf && <span className="ml-1 text-[10px] text-primary">(you)</span>}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{a.user_id.slice(0, 8)}…</div>
                  </td>
                  <td>{a.region}</td>
                  <td>{a.town}</td>
                  <td>
                    <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <MapPinIcon className="h-3 w-3" />{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                    </a>
                  </td>
                  <td>
                    {a.is_super_admin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-semibold text-saffron-foreground"><Crown className="h-3 w-3" />Super</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Admin</span>
                    )}
                  </td>
                  <td className="space-x-1 text-right">
                    {canEdit && (
                      <button onClick={() => setEditing(a)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    )}
                    {iAmSuper && !isSelf && !older && (
                      <button
                        onClick={() => toggleSuper.mutate({ uid: a.user_id, make: !a.is_super_admin })}
                        className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-muted/70"
                      >
                        {a.is_super_admin ? "Demote" : "Promote"}
                      </button>
                    )}
                    {older && !isSelf && (
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">Senior admin</span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => { if (confirm(`Remove ${a.full_name || a.user_id.slice(0,8)} from admin team?`)) remove.mutate(a.user_id); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {admins.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No admins yet</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <AdminEditor
          mode="add"
          iAmSuper={iAmSuper}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["admin-locations"] }); }}
        />
      )}
      {editing && (
        <AdminEditor
          mode="edit"
          row={editing}
          iAmSuper={iAmSuper}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-locations"] }); }}
        />
      )}
    </div>
  );
}

function AdminEditor({
  mode, row, iAmSuper, onClose, onSaved,
}: {
  mode: "add" | "edit";
  row?: AdminRow;
  iAmSuper: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState(row?.full_name ?? "");
  const [region, setRegion] = useState(row?.region ?? "Centre");
  const [town, setTown] = useState(row?.town ?? "");
  const [lat, setLat] = useState<number>(row?.latitude ?? 3.848);
  const [lng, setLng] = useState<number>(row?.longitude ?? 11.502);
  const [makeSuper, setMakeSuper] = useState(row?.is_super_admin ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (mode === "add" && !email.trim()) return toast.error("Enter the new admin's account email");
    if (!town.trim()) return toast.error("Enter the home town");
    setSaving(true);
    try {
      if (mode === "add") {
        const { error } = await supabase.rpc("add_admin_by_email" as any, {
          _email: email.trim(),
          _full_name: fullName.trim() || null,
          _region: region,
          _town: town.trim(),
          _lat: lat,
          _lng: lng,
          _make_super: iAmSuper ? makeSuper : false,
        });
        if (error) throw error;
        toast.success("Admin added");
      } else if (row) {
        const patch: any = { full_name: fullName, region, town, latitude: lat, longitude: lng };
        if (iAmSuper) patch.is_super_admin = makeSuper;
        const { error } = await supabase.from("admin_locations" as any).update(patch).eq("id", row.id);
        if (error) throw error;
        toast.success("Admin updated");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-background p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{mode === "add" ? "Add admin" : "Edit admin"}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-3">
          {mode === "add" && (
            <Field label="Account email (they must have signed up first)">
              <input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
            </Field>
          )}
          <Field label="Full name">
            <input className={inp} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Region">
              <select className={inp} value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Town"><input className={inp} value={town} onChange={(e) => setTown(e.target.value)} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Home latitude"><input type="number" step="0.0001" className={inp} value={lat} onChange={(e) => setLat(Number(e.target.value))} /></Field>
            <Field label="Home longitude"><input type="number" step="0.0001" className={inp} value={lng} onChange={(e) => setLng(Number(e.target.value))} /></Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tip: open <a className="underline" href="https://www.google.com/maps" target="_blank" rel="noreferrer">Google Maps</a>, right-click the admin's home, then copy the coordinates.
          </p>
          {iAmSuper && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={makeSuper} onChange={(e) => setMakeSuper(e.target.checked)} />
              Super admin (can add/remove other admins)
            </label>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-input px-5 py-2.5 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ PAYMENT SETTINGS ============
type PayRow = {
  id: string;
  provider: string;
  display_name: string;
  ussd_template: string | null;
  transfer_number: string;
  account_name: string;
  instructions: string | null;
  active: boolean;
};

function PaymentsTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-payment-settings"],
    queryFn: async (): Promise<PayRow[]> => {
      const { data, error } = await supabase.from("payment_settings" as any).select("*").order("provider");
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const save = async (id: string, patch: Partial<PayRow>) => {
    const { error } = await supabase.from("payment_settings" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-payment-settings"] });
    qc.invalidateQueries({ queryKey: ["payment-settings"] });
  };

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Edit the transfer number, account name and shortcut (USSD) code that customers see on checkout. Use <code>{"{number}"}</code> and <code>{"{amount}"}</code> placeholders in the shortcut — they get replaced with the receiver number and the order total automatically.
      </p>
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-lg">
                {r.provider === "mtn" ? "🟡" : r.provider === "orange" ? "🟠" : "💳"}
              </span>
              <input
                defaultValue={r.display_name}
                onBlur={(e) => e.target.value !== r.display_name && save(r.id, { display_name: e.target.value })}
                className="rounded-lg border border-transparent bg-transparent px-1 font-display text-lg font-bold hover:border-input"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" defaultChecked={r.active} onChange={(e) => save(r.id, { active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Transfer number (receiver)">
              <input className={inp} defaultValue={r.transfer_number} onBlur={(e) => e.target.value !== r.transfer_number && save(r.id, { transfer_number: e.target.value })} />
            </Field>
            <Field label="Account name">
              <input className={inp} defaultValue={r.account_name} onBlur={(e) => e.target.value !== r.account_name && save(r.id, { account_name: e.target.value })} />
            </Field>
            <Field label="USSD shortcut template">
              <input className={inp} defaultValue={r.ussd_template ?? ""} placeholder="*126*1*{number}*{amount}#" onBlur={(e) => e.target.value !== (r.ussd_template ?? "") && save(r.id, { ussd_template: e.target.value })} />
            </Field>
            <Field label="Customer instructions">
              <input className={inp} defaultValue={r.instructions ?? ""} onBlur={(e) => e.target.value !== (r.instructions ?? "") && save(r.id, { instructions: e.target.value })} />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
}

function SupportSettingsTab() {
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from("support_settings").select("*").maybeSingle().then(({ data }) => setS(data));
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("support_settings").update({
      support_email: s.support_email,
      button_label: s.button_label,
      intro_text: s.intro_text,
      subject_prefix: s.subject_prefix,
      apk_url: s.apk_url ?? "",
      apk_label: s.apk_label ?? "Download Android App",
    }).eq("id", true);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Support settings saved");
  };
  if (!s) return <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;
  return (
    <form onSubmit={save} className="max-w-xl space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-primary" /> Support button</h2>
      <Field label="Support email (where complaints go)">
        <input value={s.support_email} onChange={(e) => setS({ ...s, support_email: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </Field>
      <Field label="Button label / dialog title">
        <input value={s.button_label} onChange={(e) => setS({ ...s, button_label: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </Field>
      <Field label="Subject prefix">
        <input value={s.subject_prefix} onChange={(e) => setS({ ...s, subject_prefix: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </Field>
      <Field label="Intro text shown to users">
        <textarea value={s.intro_text} onChange={(e) => setS({ ...s, intro_text: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </Field>
      <div className="mt-4 border-t border-border pt-4">
        <h3 className="mb-2 font-display text-sm font-bold">Android APK download</h3>
        <Field label="APK file URL (leave empty to hide button)">
          <input value={s.apk_url ?? ""} onChange={(e) => setS({ ...s, apk_url: e.target.value })} placeholder="https://…/stkingston.apk" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="Button label">
          <input value={s.apk_label ?? ""} onChange={(e) => setS({ ...s, apk_label: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </Field>
        <p className="text-[11px] text-muted-foreground">Upload your APK to any public host (Google Drive direct link, GitHub release, your own server) and paste the direct download URL here.</p>
      </div>
      <button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </form>
  );
}

function AdminRequestsTab() {
  const { user } = useAuth();
  const [isSuper, setIsSuper] = useState(false);
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("admin_requests").select("*").order("created_at", { ascending: false });
    setReqs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("admin_locations").select("is_super_admin").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsSuper(!!data?.is_super_admin));
    load();
  }, [user]);

  const review = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("approve_admin_request", { _req_id: id, _approve: approve });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved — user is now admin" : "Declined");
    load();
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;
  if (!isSuper) return <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">Only super admins can review admin requests.</p>;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /> Admin badge requests</h2>
      {reqs.length === 0 && <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">No requests.</p>}
      {reqs.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display font-bold">{r.full_name} <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize">{r.status}</span></p>
              <p className="text-xs text-muted-foreground">📞 {r.phone} · 📍 {r.town}, {r.region}</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground">GPS: {r.latitude?.toFixed(5)}, {r.longitude?.toFixed(5)}</p>
              {r.message && <p className="mt-2 text-sm">{r.message}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => review(r.id, true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                  <Check className="h-3 w-3" /> Approve
                </button>
                <button onClick={() => review(r.id, false)} className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90">
                  <XIcon className="h-3 w-3" /> Decline
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RiderRequestsTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rider-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rider_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const download = async (path: string, filename: string) => {
    const { data, error } = await supabase.storage.from("rider-verification").createSignedUrl(path, 60 * 5, { download: filename });
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const preview = async (path: string) => {
    const { data, error } = await supabase.storage.from("rider-verification").createSignedUrl(path, 60 * 5);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const review = async (r: any, approve: boolean) => {
    const { error } = await (supabase as any).from("rider_requests")
      .update({ status: approve ? "approved" : "declined", reviewed_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    if (approve) {
      const { error: e2 } = await (supabase as any).from("riders").upsert({
        user_id: r.user_id, full_name: r.full_name, phone: r.phone,
      });
      if (e2) return toast.error(e2.message);
    }
    toast.success(approve ? "Rider approved" : "Application declined");
    qc.invalidateQueries({ queryKey: ["rider-requests"] });
  };

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No rider applications yet.</p>}
      {rows.map((r: any) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display font-bold">{r.full_name}</p>
              <p className="text-xs text-muted-foreground">{r.phone}{r.email ? ` · ${r.email}` : ""}</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${r.status === "pending" ? "bg-amber-100 text-amber-800" : r.status === "approved" ? "bg-forest/20 text-forest" : "bg-destructive/20 text-destructive"}`}>{r.status}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button onClick={() => preview(r.id_front_path)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 hover:bg-muted"><SearchIcon className="h-3 w-3" />ID front</button>
            <button onClick={() => download(r.id_front_path, `${r.full_name}-id-front.jpg`)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 hover:bg-muted"><Download className="h-3 w-3" />Download</button>
            <button onClick={() => preview(r.id_back_path)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 hover:bg-muted"><SearchIcon className="h-3 w-3" />ID back</button>
            <button onClick={() => download(r.id_back_path, `${r.full_name}-id-back.jpg`)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 hover:bg-muted"><Download className="h-3 w-3" />Download</button>
            <button onClick={() => preview(r.face_video_path)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 hover:bg-muted"><SearchIcon className="h-3 w-3" />Face video</button>
            <button onClick={() => download(r.face_video_path, `${r.full_name}-face.webm`)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 hover:bg-muted"><Download className="h-3 w-3" />Download</button>
          </div>
          {r.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => review(r, true)} className="inline-flex items-center gap-1 rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-forest-foreground hover:opacity-90"><Check className="h-3 w-3" />Approve</button>
              <button onClick={() => review(r, false)} className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"><XIcon className="h-3 w-3" />Decline</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

