import type { Product } from "@/lib/queries";
import { productImage } from "@/lib/product-images";

/**
 * KINGS FOOD discovery engine.
 *
 * 1. `searchProducts`  — fuzzy, image-aware product search.
 * 2. `recommendProducts` — ranks the catalogue against a shopper's
 *    favorites, stated preferences, order history and community ratings.
 *
 * Both are pure functions so they can run on any list of products without
 * extra round-trips to the backend.
 */

/* ------------------------- text utilities ------------------------- */

const STOP = new Set(["the", "a", "an", "of", "and", "for", "with", "in", "on", "to", "de", "la", "le"]);

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function trigrams(s: string): Set<string> {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3));
  return out;
}

/** Dice coefficient on trigrams — tolerant of typos ("chiken" ≈ "chicken"). */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = trigrams(a);
  const B = trigrams(b);
  let hits = 0;
  A.forEach((g) => { if (B.has(g)) hits++; });
  return (2 * hits) / (A.size + B.size);
}

/* ------------------------- search ------------------------- */

export type ScoredProduct = { product: Product; score: number; reason: string };

/**
 * Weighted fuzzy search. Products with a real photo rank above photo-less
 * ones so the results grid never looks broken ("product image search").
 */
export function searchProducts(products: Product[], query: string, limit = 60): Product[] {
  const q = query.trim();
  if (!q) return products;
  const terms = tokenize(q);
  if (!terms.length) return products;

  const scored = products
    .map((p) => {
      const name = p.name.toLowerCase();
      const slug = p.slug.replace(/-/g, " ");
      const desc = (p.description ?? "").toLowerCase();
      let score = 0;

      for (const t of terms) {
        if (name.includes(t)) score += 6;
        else if (slug.includes(t)) score += 4;
        else if (desc.includes(t)) score += 2;
        else {
          const fuzz = Math.max(similarity(t, name), similarity(t, slug));
          if (fuzz > 0.35) score += fuzz * 4;
        }
      }
      if (name.startsWith(terms[0])) score += 3;
      if (p.featured) score += 1;
      if (hasImage(p)) score += 1.5;
      return { p, score };
    })
    .filter((r) => r.score > 0.8)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((r) => r.p);
}

export function hasImage(p: Product): boolean {
  return Boolean(productImage(p.slug, p.image_url));
}

/* ------------------------- recommendations ------------------------- */

export type RecoInput = {
  products: Product[];
  favoriteIds: string[];
  preferredSectors: string[];
  preferredKeywords: string[];
  purchasedProductIds?: string[];
  ratings?: Record<string, { avg: number; count: number }>;
  excludeIds?: string[];
  limit?: number;
};

/**
 * Content-based ranking:
 *   sector affinity (favorites + stated preferences + past orders)  ×3.0
 *   keyword affinity (learned from favorites, plus stated keywords) ×2.0
 *   community rating (Bayesian-smoothed toward 3.5 stars)           ×1.6
 *   price closeness to the shopper's usual spend                    ×1.0
 *   small boosts for featured + in-stock + has photo
 */
export function recommendProducts({
  products,
  favoriteIds,
  preferredSectors,
  preferredKeywords,
  purchasedProductIds = [],
  ratings = {},
  excludeIds = [],
  limit = 8,
}: RecoInput): ScoredProduct[] {
  const favSet = new Set(favoriteIds);
  const seen = new Set([...excludeIds, ...favoriteIds]);
  const liked = products.filter((p) => favSet.has(p.id) || purchasedProductIds.includes(p.id));

  // Sector affinity
  const sectorWeight = new Map<string, number>();
  for (const s of preferredSectors) sectorWeight.set(s, (sectorWeight.get(s) ?? 0) + 1);
  for (const p of liked) sectorWeight.set(p.sector_id, (sectorWeight.get(p.sector_id) ?? 0) + 1);

  // Keyword affinity
  const kwWeight = new Map<string, number>();
  const bump = (tokens: string[], w: number) => tokens.forEach((t) => kwWeight.set(t, (kwWeight.get(t) ?? 0) + w));
  preferredKeywords.forEach((k) => bump(tokenize(k), 1.5));
  liked.forEach((p) => bump(tokenize(`${p.name} ${p.description ?? ""}`), 1));

  const maxSector = Math.max(1, ...sectorWeight.values());
  const maxKw = Math.max(1, ...kwWeight.values());
  const avgSpend = liked.length
    ? liked.reduce((n, p) => n + p.price_xaf, 0) / liked.length
    : products.reduce((n, p) => n + p.price_xaf, 0) / Math.max(1, products.length);

  const scored: ScoredProduct[] = products
    .filter((p) => !seen.has(p.id) && p.stock > 0)
    .map((p) => {
      const reasons: string[] = [];

      const sectorScore = (sectorWeight.get(p.sector_id) ?? 0) / maxSector;
      if (sectorScore > 0) reasons.push("matches what you like");

      const tokens = tokenize(`${p.name} ${p.description ?? ""}`);
      const kwScore = tokens.length
        ? tokens.reduce((n, t) => n + (kwWeight.get(t) ?? 0), 0) / (tokens.length * maxKw)
        : 0;
      if (kwScore > 0.15) reasons.push("similar to your favorites");

      const r = ratings[p.id];
      const bayes = r ? (r.count * r.avg + 5 * 3.5) / (r.count + 5) : 3.5;
      const ratingScore = (bayes - 1) / 4;
      if (r && r.avg >= 4.2 && r.count >= 2) reasons.push("highly rated");

      const priceScore = 1 / (1 + Math.abs(p.price_xaf - avgSpend) / Math.max(500, avgSpend));

      let score =
        sectorScore * 3 + kwScore * 2 + ratingScore * 1.6 + priceScore * 1 + (p.featured ? 0.4 : 0) + (hasImage(p) ? 0.3 : 0);

      // Gentle deterministic jitter so the row is not frozen forever.
      score += (hashCode(p.id) % 100) / 5000;

      return { product: p, score, reason: reasons[0] ?? "popular right now" };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
