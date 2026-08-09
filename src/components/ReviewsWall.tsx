import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Review = {
  id: string;
  author_name: string;
  region: string | null;
  rating: number;
  body: string;
  avatar_seed: string | null;
  created_at: string;
};

async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, author_name, region, rating, body, avatar_seed, created_at")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw error;
  return data ?? [];
}

const palette = ["bg-primary/15 text-primary", "bg-saffron/25 text-saffron-foreground", "bg-forest/15 text-forest"];

export function ReviewsWall() {
  const { data = [] } = useQuery({ queryKey: ["reviews"], queryFn: fetchReviews });
  const [page, setPage] = useState(0);
  const PER_PAGE = 12;
  if (data.length === 0) return null;
  // Newest ratings first.
  const sorted = [...data].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const display = sorted.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Loved across Cameroon</p>
          <h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">What customers are saying</h2>
        </div>
        <span className="hidden text-sm text-muted-foreground md:block">
          {data.length}+ verified reviews
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {display.map((r, i) => {
          const initials = r.author_name.split(" ").map((n) => n[0]).slice(0, 2).join("");
          return (
            <article
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-pop)]"
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full font-display font-bold ${palette[i % palette.length]}`}>
                  {initials}
                </span>
                <div className="flex-1">
                  <p className="font-display font-bold leading-tight">{r.author_name}</p>
                  {r.region && <p className="text-xs text-muted-foreground">{r.region}</p>}
                </div>
                <div className="flex">
                  {Array.from({ length: r.rating }).map((_, k) => (
                    <Star key={k} className="h-3.5 w-3.5 fill-saffron text-saffron" />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/85">{r.body}</p>
              <time dateTime={r.created_at} className="mt-3 block text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </time>
            </article>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => { setPage(current - 1); window.scrollBy({ top: -200, behavior: "smooth" }); }}
            disabled={current === 0}
            className="inline-flex items-center gap-1 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {current + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => { setPage(current + 1); window.scrollBy({ top: -200, behavior: "smooth" }); }}
            disabled={current >= pageCount - 1}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Next page <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
