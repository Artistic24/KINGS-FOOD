import nuggets from "@/assets/products/nuggets.jpg";
import tenders from "@/assets/products/tenders.jpg";
import hotWings from "@/assets/products/hot-wings.jpg";
import bbqWings from "@/assets/products/bbq-wings.jpg";
import grilledHalf from "@/assets/products/grilled-half.jpg";
import caesarWrap from "@/assets/products/caesar-wrap.jpg";
import macCheese from "@/assets/products/mac-cheese.jpg";
import creamCheese from "@/assets/products/cream-cheese.jpg";
import feta from "@/assets/products/feta.jpg";
import halloumi from "@/assets/products/halloumi.jpg";
import mozzarella from "@/assets/products/mozzarella.jpg";
import parmesan from "@/assets/products/parmesan.jpg";

/** Locally bundled images that override unreliable remote URLs, keyed by product slug. */
export const productImages: Record<string, string> = {
  "chicken-cheese-chicken-nuggets-10pc": nuggets,
  "chicken-cheese-chicken-tenders-6pc": tenders,
  "chicken-cheese-hot-wings-10pc": hotWings,
  "chicken-cheese-honey-bbq-wings-10pc": bbqWings,
  "chicken-cheese-grilled-chicken-half": grilledHalf,
  "chicken-cheese-chicken-caesar-wrap": caesarWrap,
  "chicken-cheese-mac-and-cheese-bowl": macCheese,
  "chicken-cheese-cream-cheese-200g": creamCheese,
  "chicken-cheese-feta-cheese-200g": feta,
  "chicken-cheese-halloumi-250g": halloumi,
  "chicken-cheese-mozzarella-ball-250g": mozzarella,
  "chicken-cheese-parmesan-wedge-200g": parmesan,
};

export function productImage(slug: string, fallback?: string | null) {
  return productImages[slug] ?? fallback ?? null;
}
