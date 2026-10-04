import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHomeSlides } from "@/lib/shop";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Home page advert banner — up to 5 images auto-sliding left every 3 seconds. */
export function HomeSlider() {
  const { data: slides = [] } = useQuery({ queryKey: ["home-slides"], queryFn: fetchHomeSlides });
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || held) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 3000);
    return () => clearInterval(t);
  }, [slides.length, held, i]);

  const go = (d: number) => setI((n) => (n + d + slides.length) % slides.length);

  if (!slides.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 md:px-6">
      <div
        className="relative select-none overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-pop)]"
        onPointerDown={() => setHeld(true)}
        onPointerUp={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${i * 100}%)` }}
        >
          {slides.map((s) => {
            const inner = (
              <>
                <img src={s.image_url} alt={s.caption ?? "Advert"} className="h-44 w-full object-cover md:h-72" />
                {s.caption && (
                  <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 font-display text-lg font-bold text-white">
                    {s.caption}
                  </p>
                )}
              </>
            );
            return (
              <div key={s.id} className="relative w-full shrink-0">
                {s.link_url ? (
                  <a href={s.link_url} target="_blank" rel="noreferrer" className="block">{inner}</a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
        {slides.length > 1 && (
          <>
            <button aria-label="Previous advert" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(-1)}
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button aria-label="Next advert" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(1)}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, n) => (
              <button
                key={s.id}
                aria-label={`Go to advert ${n + 1}`}
                onClick={() => setI(n)}
                className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-primary" : "w-1.5 bg-background/70"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
