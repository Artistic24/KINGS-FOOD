import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const REGIONS = [
  "Centre", "Littoral", "West", "North-West", "South-West",
  "Adamawa", "North", "Far North", "East", "South",
];

export function ReviewSubmit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [region, setRegion] = useState("Centre");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">
          Want to share your experience?{" "}
          <Link to="/auth" search={{ redirect: "/" }} className="font-semibold text-primary hover:underline">
            Sign in to leave a review
          </Link>
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    const author = (name.trim() || (user.user_metadata?.full_name as string) || user.email || "Customer").slice(0, 80);
    if (trimmed.length < 10) {
      toast.error("Tell us a bit more (at least 10 characters)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      author_name: author,
      region,
      rating,
      body: trimmed.slice(0, 600),
      avatar_seed: user.id.slice(0, 8),
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks for your review! 🎉");
    setBody("");
    qc.invalidateQueries({ queryKey: ["reviews"] });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-bold">Drop your own rating</h3>
      <p className="mt-1 text-xs text-muted-foreground">Help other customers — your review appears right away.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground/80">Display name (optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="How should we sign your review?"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground/80">Your region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
            className="p-1"
          >
            <Star className={`h-6 w-6 transition-colors ${n <= rating ? "fill-saffron text-saffron" : "text-muted-foreground"}`} />
          </button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{rating}/5</span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={600}
        rows={3}
        placeholder="What did you love? What could be better?"
        className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{body.length}/600</span>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post review
        </button>
      </div>
    </form>
  );
}
