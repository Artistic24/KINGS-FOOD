import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — St Kingston" }] }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-muted">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Time to fill it with something delicious.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Your cart</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.productId} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
              <div className="h-20 w-20 overflow-hidden rounded-xl bg-muted">
                {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-1 flex-col">
                <Link to="/products/$slug" params={{ slug: i.slug }} className="font-display font-semibold hover:text-primary">
                  {i.name}
                </Link>
                <p className="text-sm text-muted-foreground">{formatXAF(i.price)} each</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-input">
                    <button onClick={() => setQty(i.productId, i.quantity - 1)} className="grid h-8 w-8 place-items-center" aria-label="Decrease">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{i.quantity}</span>
                    <button onClick={() => setQty(i.productId, i.quantity + 1)} className="grid h-8 w-8 place-items-center" aria-label="Increase">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(i.productId)}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="font-display font-bold">{formatXAF(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatXAF(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="text-muted-foreground">Calculated at checkout</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-display font-bold">Total</span>
            <span className="font-display text-xl font-bold text-primary">{formatXAF(subtotal)}</span>
          </div>
          <Link
            to="/checkout"
            className="mt-5 flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
