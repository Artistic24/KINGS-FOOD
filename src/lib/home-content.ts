import { supabase } from "@/integrations/supabase/client";

/** Everything on the home page that admins can edit from the control center. */
export type HomeContent = {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  cta1Label: string;
  cta1Slug: string;
  cta2Label: string;
  cta2Slug: string;
  heroImageUrl: string;
  heroAlt: string;
  stat1: string;
  stat2: string;
  stat3: string;
  deliveryNote: string;
  sectorsEyebrow: string;
  sectorsTitle: string;
  featuredEyebrow: string;
  featuredTitle: string;
  regionsEyebrow: string;
  regionsTitle: string;
  regionsSubtitle: string;
};

export const HOME_DEFAULTS: HomeContent = {
  badge: "Live across all 10 regions of Cameroon",
  titleLine1: "Everything Cameroon loves,",
  titleLine2: "delivered hot, fresh & on time.",
  subtitle:
    "Burgers, pizza, fresh poultry, supermarket essentials, fashion and salon bookings — eight sectors under one roof. Pay with Mobile Money or cash on delivery.",
  cta1Label: "Order food",
  cta1Slug: "burgers",
  cta2Label: "Shop supermarket",
  cta2Slug: "supermarket",
  heroImageUrl: "",
  heroAlt: "Vibrant Cameroonian market with Ankara fabrics and fresh produce",
  stat1: "10 regions",
  stat2: "MoMo & cash",
  stat3: "GPS tracking",
  deliveryNote: "Delivery starts at",
  sectorsEyebrow: "Our sectors",
  sectorsTitle: "Eight worlds, one app.",
  featuredEyebrow: "Hot right now",
  featuredTitle: "Featured",
  regionsEyebrow: "Delivery across",
  regionsTitle: "All 10 regions of Cameroon",
  regionsSubtitle: "Drop a pin anywhere — we calculate your delivery fee by region.",
};

export const HOME_FIELDS: { key: keyof HomeContent; label: string; long?: boolean; image?: boolean }[] = [
  { key: "badge", label: "Top badge" },
  { key: "titleLine1", label: "Headline — line 1" },
  { key: "titleLine2", label: "Headline — line 2 (highlighted)" },
  { key: "subtitle", label: "Headline paragraph", long: true },
  { key: "cta1Label", label: "Button 1 label" },
  { key: "cta1Slug", label: "Button 1 sector slug" },
  { key: "cta2Label", label: "Button 2 label" },
  { key: "cta2Slug", label: "Button 2 sector slug" },
  { key: "heroImageUrl", label: "Hero image", image: true },
  { key: "heroAlt", label: "Hero image alt text" },
  { key: "stat1", label: "Highlight 1" },
  { key: "stat2", label: "Highlight 2" },
  { key: "stat3", label: "Highlight 3" },
  { key: "deliveryNote", label: "Delivery card caption" },
  { key: "sectorsEyebrow", label: "Sectors — eyebrow" },
  { key: "sectorsTitle", label: "Sectors — title" },
  { key: "featuredEyebrow", label: "Featured — eyebrow" },
  { key: "featuredTitle", label: "Featured — title" },
  { key: "regionsEyebrow", label: "Regions — eyebrow" },
  { key: "regionsTitle", label: "Regions — title" },
  { key: "regionsSubtitle", label: "Regions — paragraph", long: true },
];

export async function fetchHomeContent(): Promise<HomeContent> {
  const { data } = await (supabase as any).from("home_content").select("data").eq("id", 1).maybeSingle();
  return { ...HOME_DEFAULTS, ...((data?.data as Partial<HomeContent>) ?? {}) };
}

export async function saveHomeContent(content: HomeContent) {
  const { error } = await (supabase as any)
    .from("home_content")
    .upsert({ id: 1, data: content }, { onConflict: "id" });
  if (error) throw error;
}
