import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductImages } from "@/lib/shop";

export function ProductGallery({
  productId,
  primary,
  alt,
}: {
  productId: string;
  primary: string | null;
  alt: string;
}) {
  const { data: extra = [] } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: () => fetchProductImages(productId),
  });

  const images = [primary, ...extra.map((i) => i.url)].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const current = images[Math.min(idx, Math.max(0, images.length - 1))];

  if (!current) return <div className="grid aspect-square place-items-center rounded-3xl border border-border bg-muted text-7xl">🛍️</div>;

  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-border bg-muted">
        <img src={current} alt={alt} className="aspect-square h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setIdx(i)}
              aria-label={`View image ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${i === idx ? "border-primary" : "border-border"}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
