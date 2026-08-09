import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function toCSV(rows: any[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set()),
  );
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return lines.join("\n");
}

function download(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportsTab() {
  const [busy, setBusy] = useState<string | null>(null);

  const exportTable = async (table: string, columns: string, filename: string) => {
    setBusy(table);
    try {
      const { data, error } = await supabase.from(table as any).select(columns).limit(10000);
      if (error) throw error;
      const rows = (data as any) ?? [];
      if (rows.length === 0) { toast.info("No rows to export"); return; }
      download(toCSV(rows), filename);
      toast.success(`Exported ${rows.length} rows`);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const items: { key: string; label: string; desc: string; run: () => void }[] = [
    {
      key: "orders",
      label: "Orders",
      desc: "All orders with customer, totals, delivery info",
      run: () => exportTable("orders", "*", `orders-${new Date().toISOString().slice(0, 10)}.csv`),
    },
    {
      key: "order_items",
      label: "Order items",
      desc: "Line items across every order",
      run: () => exportTable("order_items", "*", `order-items-${new Date().toISOString().slice(0, 10)}.csv`),
    },
    {
      key: "products",
      label: "Products",
      desc: "Catalog with prices and stock",
      run: () => exportTable("products", "*", `products-${new Date().toISOString().slice(0, 10)}.csv`),
    },
    {
      key: "profiles",
      label: "Customers",
      desc: "User profiles",
      run: () => exportTable("profiles", "id, full_name, avatar_url, created_at, updated_at", `customers-${new Date().toISOString().slice(0, 10)}.csv`),
    },
    {
      key: "reviews",
      label: "Reviews",
      desc: "Product reviews and ratings",
      run: () => exportTable("reviews", "*", `reviews-${new Date().toISOString().slice(0, 10)}.csv`),
    },
    {
      key: "chat_messages",
      label: "Chat activity",
      desc: "Community chat log",
      run: () => exportTable("chat_messages", "id, user_id, content, file_name, file_type, created_at, pinned", `chat-${new Date().toISOString().slice(0, 10)}.csv`),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Exports</h2>
        <p className="text-sm text-muted-foreground">Download CSV snapshots of your data (up to 10,000 rows per table).</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <p className="font-semibold">{it.label}</p>
              <p className="truncate text-xs text-muted-foreground">{it.desc}</p>
            </div>
            <button
              onClick={it.run}
              disabled={busy === it.key}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy === it.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
