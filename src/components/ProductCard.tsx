import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatXAF } from "@/lib/format";
import type { Product } from "@/lib/queries";
import { productImage } from "@/lib/product-images";
import { fetchRatingIndex } from "@/lib/shop";
import { StarRating } from "@/components/StarRating";
import { useState } from "react";

function fallbackFor(name: string) {
  const q = encodeURIComponent(name);
  return `https://source.unsplash.com/600x600/?${q}`;
}

export function ProductCard({ p }: { p: Product }) {
  const [src, setSrc] = useState(productImage(p.slug, p.image_url) || fallbackFor(p.name));
  const [errored, setErrored] = useState(false);
  const { data: ratings = {} } = useQuery({
    queryKey: ["rating-index"],
    queryFn: fetchRatingIndex,
    staleTime: 5 * 60 * 1000,
  });
  const rating = ratings[p.id];

  return (
    <Link
      to="/products/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={src}
          alt={p.name}
          loading="lazy"
          onError={() => {
            if (!errored) { setErrored(true); setSrc(fallbackFor(p.name)); }
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {p.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-saffron-foreground">
            Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-base font-semibold leading-tight">{p.name}</h3>
        {rating ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <StarRating value={rating.avg} size={12} />
            {rating.avg.toFixed(1)} ({rating.count})
          </span>
        ) : (
          p.unit && <p className="text-xs text-muted-foreground">per {p.unit}</p>
        )}
        <p className="mt-auto pt-2 font-display text-lg font-bold text-primary">
          {formatXAF(p.price_xaf)}
        </p>
      </div>
    </Link>
  );
}
