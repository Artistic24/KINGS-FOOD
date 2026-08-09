import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Brand = {
  brand_name: string;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

export const DEFAULT_BRAND: Brand = {
  brand_name: "KINGS FOOD",
  tagline: "Cameroon's all-in-one marketplace",
  logo_url: null,
  primary_color: null,
};

export function useBrand() {
  const { data } = useQuery({
    queryKey: ["brand-settings"],
    queryFn: async (): Promise<Brand> => {
      const { data } = await supabase
        .from("brand_settings" as any)
        .select("brand_name, tagline, logo_url, primary_color")
        .eq("id", 1)
        .maybeSingle();
      return (data as any) ?? DEFAULT_BRAND;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULT_BRAND;
}

/** Two-letter monogram from the brand name (e.g. "KF"). */
export function brandInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return (parts.map((p) => p[0]).join("") || "KF").toUpperCase();
}
