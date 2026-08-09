import { Link } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, Menu, Search, ShieldCheck, Bike } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrand, brandInitials } from "@/lib/brand";

export function Header() {
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const brand = useBrand();

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const nav = [
    { to: "/", label: "Home" },
    { to: "/sectors/burgers", label: "Burgers" },
    { to: "/sectors/pizza-fries", label: "Pizza" },
    { to: "/sectors/supermarket", label: "Supermarket" },
    { to: "/sectors/fashion", label: "Fashion" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="ankara-stripe h-1.5 w-full" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.brand_name} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg font-bold">
              {brandInitials(brand.brand_name)}
            </span>
          )}
          <span className="font-display text-lg font-bold leading-tight md:text-xl">
            {brand.brand_name}
            <span className="block text-[10px] font-sans font-normal uppercase tracking-widest text-muted-foreground">
              Cameroon
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-muted text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            to="/search"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            to="/rider"
            className="grid h-10 w-10 place-items-center rounded-full text-forest transition-colors hover:bg-muted"
            aria-label="Rider"
            title="Rider dashboard"
          >
            <Bike className="h-5 w-5" />
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="grid h-10 w-10 place-items-center rounded-full text-primary transition-colors hover:bg-muted"
              aria-label="Admin"
            >
              <ShieldCheck className="h-5 w-5" />
            </Link>
          )}
          <Link
            to={user ? "/account" : "/auth"}
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted"
            aria-label="Account"
          >
            <UserIcon className="h-5 w-5" />
          </Link>
          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
