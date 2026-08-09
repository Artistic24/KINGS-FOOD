import { Link } from "@tanstack/react-router";
import { useBrand, brandInitials } from "@/lib/brand";

const regions = [
  "Adamawa", "Centre", "East", "Far North", "Littoral",
  "North", "Northwest", "South", "Southwest", "West",
];

export function Footer() {
  const brand = useBrand();
  return (
    <footer className="mt-20 border-t border-border/60 bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.brand_name} className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg font-bold">
                {brandInitials(brand.brand_name)}
              </span>
            )}
            <span className="font-display text-xl font-bold">{brand.brand_name}</span>
          </div>
          <p className="mt-3 text-sm text-background/70">
            {brand.tagline || "Cameroon's all-in-one marketplace"} — food, fashion, hair, supermarket and more, delivered to all 10 regions.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm font-bold uppercase tracking-wider">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li><Link to="/sectors/$slug" params={{ slug: "burgers" }} className="hover:text-saffron">Burgers</Link></li>
            <li><Link to="/sectors/$slug" params={{ slug: "pizza-fries" }} className="hover:text-saffron">Pizza & Fries</Link></li>
            <li><Link to="/sectors/$slug" params={{ slug: "poultry" }} className="hover:text-saffron">Poultry Farm</Link></li>
            <li><Link to="/sectors/$slug" params={{ slug: "fashion" }} className="hover:text-saffron">Fashion</Link></li>
            <li><Link to="/sectors/$slug" params={{ slug: "supermarket" }} className="hover:text-saffron">Supermarket</Link></li>

          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-bold uppercase tracking-wider">We deliver to</h4>
          <ul className="mt-3 grid grid-cols-2 gap-1 text-sm text-background/70">
            {regions.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-bold uppercase tracking-wider">Payment</h4>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li>MTN Mobile Money</li>
            <li>Orange Money</li>
            <li>Cash on Delivery</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-background/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-background/60 md:px-6">
          © {new Date().getFullYear()} {brand.brand_name} Cameroon. Everything you need, one storefront.
        </p>
      </div>
    </footer>
  );
}
