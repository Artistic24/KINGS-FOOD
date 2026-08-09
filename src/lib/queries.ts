import { supabase } from "@/integrations/supabase/client";

export type Sector = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  icon: string | null;
  accent_color: string | null;
  sort_order: number;
};

export type Product = {
  id: string;
  slug: string;
  sector_id: string;
  name: string;
  description: string | null;
  price_xaf: number;
  image_url: string | null;
  unit: string | null;
  stock: number;
  featured: boolean;
};

export type DeliveryZone = {
  id: string;
  region: string;
  fee_xaf: number;
  est_days: string | null;
  active: boolean;
};

const PRODUCT_COLS =
  "id, slug, sector_id, name, description, price_xaf, image_url, unit, stock, featured";

// Products are only sold when BOTH the product and its sector are active.
const PRODUCT_COLS_ACTIVE_SECTOR = `${PRODUCT_COLS}, sectors!inner(active)`;

export async function fetchSectors(): Promise<Sector[]> {
  const { data, error } = await supabase
    .from("sectors")
    .select("id, slug, name, tagline, icon, accent_color, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSectorBySlug(slug: string): Promise<Sector | null> {
  const { data, error } = await supabase
    .from("sectors")
    .select("id, slug, name, tagline, icon, accent_color, sort_order")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProductsBySector(sectorId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLS_ACTIVE_SECTOR)
    .eq("sector_id", sectorId)
    .eq("active", true)
    .eq("sectors.active", true)
    .order("featured", { ascending: false })
    .order("name")
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLS_ACTIVE_SECTOR)
    .eq("active", true)
    .eq("sectors.active", true)
    .order("name")
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function searchProducts(q: string): Promise<Product[]> {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLS_ACTIVE_SECTOR)
    .eq("active", true)
    .eq("sectors.active", true)
    .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    .order("featured", { ascending: false })
    .order("name")
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLS_ACTIVE_SECTOR)
    .eq("active", true)
    .eq("sectors.active", true)
    .eq("featured", true)
    .limit(8);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLS_ACTIVE_SECTOR)
    .eq("slug", slug)
    .eq("active", true)
    .eq("sectors.active", true)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Product | null;
}

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, region, fee_xaf, est_days, active")
    .order("fee_xaf");
  if (error) throw error;
  return data ?? [];
}
