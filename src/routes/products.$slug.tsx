import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import { fetchProductBySlug } from "@/lib/queries";
import { formatXAF } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { productImage } from "@/lib/product-images";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductReviews } from "@/components/ProductReviews";
import { useAuth } from "@/hooks/use-auth";
import { fetchFavoriteIds, toggleFavorite } from "@/lib/shop";



export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const product = await fetchProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — KINGS FOOD` },
          { name: "description", content: loaderData.product.description ?? loaderData.product.name },
          { property: "og:title", content: loaderData.product.name },
          { property: "og:description", content: loaderData.product.description ?? "" },
          ...(loaderData.product.image_url
            ? [{ property: "og:image", content: loaderData.product.image_url }, { name: "twitter:image", content: loaderData.product.image_url }]
            : []),
        ]
      : [],
  }),
  component: ProductPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Couldn't load this product</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Product not found</h1>
      <Link to="/" className="mt-4 inline-block text-primary underline">Go home</Link>
    </div>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const img = productImage(product.slug, product.image_url);
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!user) { setFav(false); return; }
    fetchFavoriteIds(user.id).then((ids) => setFav(ids.includes(product.id))).catch(() => {});
  }, [user, product.id]);

  const onToggleFav = async () => {
    if (!user) return toast.error("Sign in to save favorites");
    const next = !fav;
    setFav(next);
    try {
      await toggleFavorite(user.id, product.id, next);
      toast.success(next ? "Added to favorites" : "Removed from favorites");
    } catch (e: any) {
      setFav(!next);
      toast.error(e.message ?? "Could not update favorites");
    }
  };

  const onAdd = (goToCart = false) => {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price_xaf,
        image: img,
      },
      qty,
    );
    toast.success(`${product.name} added to cart`);
    if (goToCart) navigate({ to: "/cart" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:px-6 md:py-12 md:pb-12">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery productId={product.id} primary={img} alt={product.name} />

        <div className="flex flex-col">
          <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl">{product.name}</h1>
          {product.unit && (

            <p className="mt-2 text-sm text-muted-foreground">per {product.unit}</p>
          )}
          <p className="mt-4 font-display text-3xl font-bold text-primary">
            {formatXAF(product.price_xaf)}
          </p>
          {product.description && (
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-input">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-11 w-11 place-items-center text-foreground/70 hover:text-foreground"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-display font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="grid h-11 w-11 place-items-center text-foreground/70 hover:text-foreground"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => onAdd(false)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-input bg-card px-5 py-3 font-semibold hover:bg-muted"
            >
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </button>
          </div>
          <div className="mt-3 hidden gap-3 md:flex">
            <button
              onClick={() => onAdd(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Buy now — {formatXAF(product.price_xaf * qty)}
            </button>
            <button
              onClick={onToggleFav}
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-input hover:bg-muted"
            >
              <Star className={`h-5 w-5 ${fav ? "fill-saffron text-saffron" : "text-muted-foreground"}`} />
            </button>
          </div>


          <div className="mt-8 rounded-2xl border border-border bg-card p-4 text-sm">
            <p>🚚 Delivered across Cameroon's 10 regions.</p>
            <p className="mt-1">💳 Pay with MTN MoMo, Orange Money, or cash on delivery.</p>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {/* Mobile sticky action bar — favorite + order */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={onToggleFav}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border"
        >
          <Star className={`h-6 w-6 ${fav ? "fill-saffron text-saffron" : "text-muted-foreground"}`} />
        </button>
        <button
          onClick={() => onAdd(true)}
          className="flex-1 rounded-2xl bg-primary py-3 font-display font-bold text-primary-foreground"
        >
          Order — {formatXAF(product.price_xaf * qty)}
        </button>
      </div>
    </div>
  );
}

