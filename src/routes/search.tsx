import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { searchProducts, fetchAllProducts } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — St Kingston" },
      { name: "description", content: "Search the full St Kingston catalog: food, supermarket, fashion, salon services and more." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const term = q.trim();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", term],
    queryFn: () => (term ? searchProducts(term) : fetchAllProducts()),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Search the catalog</h1>
      <p className="mt-2 text-muted-foreground">Browse every item across all 8 sectors.</p>

      <div className="relative mt-6">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try 'chicken', 'pizza', 'braids', 'rice'..."
          className="w-full rounded-full border border-input bg-card pl-12 pr-4 py-3.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {isLoading ? "Searching..." : `${results.length} ${term ? "matches" : "items"}`}
      </p>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          No results. <Link to="/" className="text-primary underline">Back home</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
