import burgers from "@/assets/sector-burgers.jpg";
import pizza from "@/assets/sector-pizza-fries.jpg";
import cc from "@/assets/sector-chicken-cheese.jpg";
import poultry from "@/assets/sector-poultry.jpg";
import supermarket from "@/assets/sector-supermarket.jpg";
import fashion from "@/assets/sector-fashion.jpg";
import hairMen from "@/assets/sector-hair-men.jpg";
import hairWomen from "@/assets/sector-hair-women.jpg";
import shawarma from "@/assets/sector-shawarma.jpg";

export const sectorImages: Record<string, string> = {
  burgers,
  "pizza-fries": pizza,
  "chicken-cheese": cc,
  poultry,
  supermarket,
  fashion,
  "hair-men": hairMen,
  "hair-women": hairWomen,
  shawarma,
};

export function sectorImage(slug: string, fallback?: string | null) {
  return sectorImages[slug] ?? fallback ?? null;
}
