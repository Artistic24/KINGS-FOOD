import { Link } from "@tanstack/react-router";
import type { Sector } from "@/lib/queries";
import { sectorImage } from "@/lib/sector-images";

export function SectorCard({ s }: { s: Sector }) {
  const color = s.accent_color || "#E85D2C";
  const img = sectorImage(s.slug, (s as any).image_url);
  return (
    <Link
      to="/sectors/$slug"
      params={{ slug: s.slug }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-warm)]"
      style={{ minHeight: 220 }}
    >
      {img && (
        <div className="relative h-28 w-full overflow-hidden">
          <img
            src={img}
            alt={s.name}
            loading="lazy"
            width={1024}
            height={1024}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div
          className="mb-2 grid h-11 w-11 place-items-center rounded-2xl text-2xl"
          style={{ background: `color-mix(in oklab, ${color} 18%, transparent)` }}
        >
          {s.icon ?? "🛒"}
        </div>
        <div>
          <h3 className="font-display text-base font-bold leading-tight">{s.name}</h3>
          {s.tagline && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.tagline}</p>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full" style={{ background: color }} aria-hidden />
    </Link>
  );
}
