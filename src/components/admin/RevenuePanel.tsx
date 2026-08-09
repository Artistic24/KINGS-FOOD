import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatXAF } from "@/lib/format";

type OrderRow = {
  id: string;
  status: string;
  delivery_status: string | null;
  subtotal_xaf: number | null;
  delivery_fee_xaf: number | null;
  total_xaf: number | null;
  created_at: string;
};

type Grain = "daily" | "weekly" | "monthly" | "yearly";

const GRAINS: Array<{ key: Grain; label: string; buckets: number }> = [
  { key: "daily", label: "Daily", buckets: 30 },
  { key: "weekly", label: "Weekly", buckets: 12 },
  { key: "monthly", label: "Monthly", buckets: 12 },
  { key: "yearly", label: "Yearly", buckets: 5 },
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Bucket key + human label for a date at the given granularity. */
function bucketOf(d: Date, grain: Grain) {
  const x = startOfDay(d);
  if (grain === "daily") return { key: x.toISOString().slice(0, 10), label: x.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) };
  if (grain === "weekly") {
    const monday = new Date(x);
    monday.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return { key: `w${monday.toISOString().slice(0, 10)}`, label: `wk ${monday.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}` };
  }
  if (grain === "monthly") {
    return { key: `${x.getFullYear()}-${x.getMonth()}`, label: x.toLocaleDateString(undefined, { month: "short", year: "2-digit" }) };
  }
  return { key: String(x.getFullYear()), label: String(x.getFullYear()) };
}

function bucketStarts(grain: Grain, count: number) {
  const out: Date[] = [];
  const now = startOfDay(new Date());
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (grain === "daily") d.setDate(now.getDate() - i);
    else if (grain === "weekly") d.setDate(now.getDate() - i * 7);
    else if (grain === "monthly") d.setMonth(now.getMonth() - i);
    else d.setFullYear(now.getFullYear() - i);
    out.push(d);
  }
  return out;
}

const CANCELLED = new Set(["cancelled"]);

export function RevenuePanel() {
  const [grain, setGrain] = useState<Grain>("daily");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-revenue-orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, delivery_status, subtotal_xaf, delivery_fee_xaf, total_xaf, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const cfg = GRAINS.find((g) => g.key === grain)!;

  const series = useMemo(() => {
    const map = new Map<string, { label: string; goods: number; delivery: number; gross: number; lost: number; orders: number }>();
    for (const start of bucketStarts(grain, cfg.buckets)) {
      const b = bucketOf(start, grain);
      map.set(b.key, { label: b.label, goods: 0, delivery: 0, gross: 0, lost: 0, orders: 0 });
    }
    for (const o of orders) {
      const b = bucketOf(new Date(o.created_at), grain);
      const row = map.get(b.key);
      if (!row) continue;
      const goods = o.subtotal_xaf ?? 0;
      const fee = o.delivery_fee_xaf ?? 0;
      const total = o.total_xaf ?? goods + fee;
      if (CANCELLED.has(o.status)) {
        row.lost += total;
      } else {
        row.goods += goods;
        row.delivery += fee;
        row.gross += total;
        row.orders += 1;
      }
    }
    return Array.from(map.values());
  }, [orders, grain, cfg.buckets]);

  const totals = useMemo(() => {
    const t = series.reduce(
      (a, r) => ({
        goods: a.goods + r.goods,
        delivery: a.delivery + r.delivery,
        gross: a.gross + r.gross,
        lost: a.lost + r.lost,
        orders: a.orders + r.orders,
      }),
      { goods: 0, delivery: 0, gross: 0, lost: 0, orders: 0 },
    );
    const half = Math.floor(series.length / 2) || 1;
    const prev = series.slice(0, half).reduce((a, r) => a + r.gross, 0);
    const curr = series.slice(half).reduce((a, r) => a + r.gross, 0);
    const trend = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
    return { ...t, trend, avg: t.orders ? Math.round(t.gross / t.orders) : 0 };
  }, [series]);

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  const money = (v: any) => formatXAF(Number(v) || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-bold">Revenue breakdown</h3>
        <div className="flex flex-wrap gap-2">
          {GRAINS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGrain(g.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${grain === g.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70 hover:bg-muted/70"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Gross revenue", value: money(totals.gross) },
          { label: "Goods (products)", value: money(totals.goods) },
          { label: "Delivery income", value: money(totals.delivery) },
          { label: "Lost / cancelled", value: money(totals.lost) },
          { label: "Avg. order value", value: money(totals.avg) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="mt-1.5 font-display text-lg font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm">
        {totals.trend >= 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-forest/15 px-3 py-1 font-semibold text-forest">
            <TrendingUp className="h-4 w-4" /> +{totals.trend}%
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-3 py-1 font-semibold text-destructive">
            <TrendingDown className="h-4 w-4" /> {totals.trend}%
          </span>
        )}
        <span className="text-muted-foreground">vs. the previous half of this {cfg.label.toLowerCase()} window · {totals.orders} paid orders</span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 font-display font-bold">Gross revenue trend</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} className="text-primary" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} className="text-primary" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={money} />
              <Area type="monotone" dataKey="gross" name="Gross" stroke="currentColor" className="text-primary" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 font-display font-bold">Goods vs. delivery income</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={money} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="goods" name="Goods" stackId="a" fill="#e11d48" radius={[0, 0, 0, 0]} />
                <Bar dataKey="delivery" name="Delivery" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 font-display font-bold">Deficit — cancelled order value</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={money} />
                <Line type="monotone" dataKey="lost" name="Lost revenue" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Period</th>
              <th>Orders</th>
              <th>Goods</th>
              <th>Delivery</th>
              <th>Gross</th>
              <th>Lost</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="p-3 font-medium">{r.label}</td>
                <td>{r.orders}</td>
                <td>{money(r.goods)}</td>
                <td>{money(r.delivery)}</td>
                <td className="font-semibold">{money(r.gross)}</td>
                <td className={r.lost ? "text-destructive" : "text-muted-foreground"}>{money(r.lost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
