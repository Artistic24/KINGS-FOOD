import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Truck, Wallet } from "lucide-react";
import heroImg from "@/assets/hero-market.jpg";
import { fetchSectors, fetchFeaturedProducts, fetchDeliveryZones } from "@/lib/queries";
import { SectorCard } from "@/components/SectorCard";
import { ProductCard } from "@/components/ProductCard";
import { ReviewsWall } from "@/components/ReviewsWall";
import { ReviewSubmit } from "@/components/ReviewSubmit";
import { ApkDownloadButton } from "@/components/ApkDownloadButton";
import { formatXAF } from "@/lib/format";
import { fetchHomeContent, HOME_DEFAULTS } from "@/lib/home-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "St Kingston — Cameroon's all-in-one marketplace" },
      { name: "description", content: "Order burgers, pizza, fresh poultry, supermarket goods, fashion and salon bookings. Delivered to all 10 regions of Cameroon. Pay with MTN Mobile Money, Orange Money or cash on delivery." },
      { property: "og:title", content: "St Kingston — Cameroon's all-in-one marketplace" },
      { property: "og:description", content: "Eight sectors, one storefront. Delivered across Cameroon." },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: sectors = [] } = useQuery({ queryKey: ["sectors"], queryFn: fetchSectors });
  const { data: featured = [] } = useQuery({ queryKey: ["featured"], queryFn: fetchFeaturedProducts });
  const { data: zones = [] } = useQuery({ queryKey: ["zones"], queryFn: fetchDeliveryZones });
  const { data: c = HOME_DEFAULTS } = useQuery({ queryKey: ["home-content"], queryFn: fetchHomeContent });
  const hero = c.heroImageUrl || heroImg;

  return (
    <div className="bg-warm-grain">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2 md:gap-12 md:px-6 md:py-20">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground/70">
              <span className="h-1.5 w-1.5 rounded-full bg-saffron" />
              {c.badge}
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              {c.titleLine1}
              <span className="block text-gradient-warm">{c.titleLine2}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              {c.subtitle}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/sectors/$slug"
                params={{ slug: c.cta1Slug }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[var(--shadow-warm)]"
              >
                {c.cta1Label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sectors/$slug"
                params={{ slug: c.cta2Slug }}
                className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-6 py-3 font-semibold transition-colors hover:bg-muted"
              >
                {c.cta2Label}
              </Link>
              <ApkDownloadButton />
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { icon: Truck, label: c.stat1 },
                { icon: Wallet, label: c.stat2 },
                { icon: MapPin, label: c.stat3 },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest/10 text-forest">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-3xl bg-saffron/40 blur-2xl" />
            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-3xl bg-primary/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-warm)]">
              <img
                src={hero}
                alt={c.heroAlt}
                width={1600}
                height={1024}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 left-6 right-6 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-pop)] md:left-auto md:right-6 md:w-72">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-saffron text-saffron-foreground">
                  🚚
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.deliveryNote}</p>
                  <p className="font-display text-base font-bold">{formatXAF(1000)} — Centre</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTORS */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{c.sectorsEyebrow}</p>
            <h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">{c.sectorsTitle}</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {sectors.map((s) => <SectorCard key={s.id} s={s} />)}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{c.featuredEyebrow}</p>
              <h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">{c.featuredTitle}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* REGIONS BAND */}
      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-forest">{c.regionsEyebrow}</p>
              <h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">{c.regionsTitle}</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">{c.regionsSubtitle}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5">
            {zones.map((z) => (
              <div
                key={z.id}
                className={`rounded-xl border border-border bg-background p-3 ${z.active ? "" : "opacity-50"}`}
              >
                <p className="font-display font-bold">{z.region}</p>
                <p className="text-xs text-muted-foreground">
                  {z.active ? `${formatXAF(z.fee_xaf)} · ${z.est_days}` : "Temporarily unavailable"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS */}
      <ReviewsWall />

      {/* Submit your own review */}
      <section className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <ReviewSubmit />
      </section>
    </div>
  );
}
