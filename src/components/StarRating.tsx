import { Star } from "lucide-react";

export function StarRating({
  value,
  size = 14,
  onChange,
  className = "",
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i - 0.25;
        const star = (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={filled ? "fill-saffron text-saffron" : "text-muted-foreground/40"}
          />
        );
        return onChange ? (
          <button
            key={i}
            type="button"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange(i)}
            className="transition-transform hover:scale-110"
          >
            {star}
          </button>
        ) : (
          star
        );
      })}
    </span>
  );
}
