import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fetchSectorBySlug, fetchProductsBySector } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/sectors/$slug")({
  loader: async ({ params }) => {
    const sector = await fetchSectorBySlug(params.slug);
    if (!sector) throw notFound();
    return { sector };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.sector.name} — St Kingston Cameroon` },
          { name: "description", content: `${loaderData.sector.tagline ?? loaderData.sector.name} — shop ${loaderData.sector.name.toLowerCase()} from St Kingston, delivered across Cameroon.` },
          { property: "og:title", content: `${loaderData.sector.name} — St Kingston` },
          { property: "og:description", content: loaderData.sector.tagline ?? "" },
        ]
      : [],
  }),
  component: SectorPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Couldn't load this sector</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Sector not found</h1>
      <Link to="/" className="mt-4 inline-block text-primary underline">Back home</Link>
    </div>
  ),
});

function SectorPage() {
  const { sector } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", sector.id],
    queryFn: () => fetchProductsBySector(sector.id),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = products;
    if (term) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(term) || (p.description ?? "").toLowerCase().includes(term),
      );
    }
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price_xaf - b.price_xaf);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price_xaf - a.price_xaf);
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [products, q, sort]);

  const color = sector.accent_color || "#E85D2C";

  return (
    <div>
      <section
        className="relative overflow-hidden border-b border-border"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${color} 22%, transparent), transparent 60%)`,
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
          <div className="flex items-center gap-4">
            <div
              className="grid h-16 w-16 place-items-center rounded-3xl text-4xl"
              style={{ background: `color-mix(in oklab, ${color} 25%, transparent)` }}
            >
              {sector.icon ?? "🛒"}
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em]" style={{ color }}>
                St Kingston
              </p>
              <h1 className="font-display text-3xl font-bold md:text-5xl">{sector.name}</h1>
            </div>
          </div>
          {sector.tagline && (
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{sector.tagline}</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${sector.name.toLowerCase()}...`}
              className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="featured">Featured first</option>
            <option value="name">Name A-Z</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <span className="text-sm text-muted-foreground">{filtered.length} items</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {q ? `No items matching "${q}"` : "No products yet in this sector."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
