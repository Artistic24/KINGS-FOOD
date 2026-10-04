import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { StarRating } from "@/components/StarRating";
import { useAuth } from "@/hooks/use-auth";
import { fetchProductReviews, upsertProductReview } from "@/lib/shop";

export function ProductReviews({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: () => fetchProductReviews(productId),
  });

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await upsertProductReview({
        product_id: productId,
        user_id: user.id,
        author_name: (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "Customer",
        rating,
        body: body.trim(),
      });
      setBody("");
      toast.success("Thanks for your review!");
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
      qc.invalidateQueries({ queryKey: ["rating-index"] });
    } catch (err: any) {
      toast.error(err.message ?? "Could not save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <MessageSquare className="h-5 w-5 text-primary" /> Ratings & reviews
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <StarRating value={avg} size={16} />
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {user ? (
        <form onSubmit={submit} className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Your rating</p>
          <StarRating value={rating} size={26} onChange={setRating} className="mt-2" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Share what you thought about this product…"
            className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={saving}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Post review
          </button>
        </form>
      ) : (
        <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary underline">Sign in</Link> to rate this product.
        </p>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-primary" />
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No reviews yet — be the first.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display font-semibold">{r.author_name || "Customer"}</p>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <StarRating value={r.rating} className="mt-1" />
              {r.body && <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
