
-- 1) Lock down admin_locations: drop the anon-readable policy
DROP POLICY IF EXISTS "anyone read admin locations for routing" ON public.admin_locations;

-- Allow any signed-in user to read admin locations (used by UserBadge etc).
-- Anonymous routing during checkout is handled by the SECURITY DEFINER nearest_admin() RPC.
CREATE POLICY "authenticated read admin locations"
ON public.admin_locations
FOR SELECT
TO authenticated
USING (true);

-- 2) Lock down profiles: replace public read with signed-in-only read
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;

CREATE POLICY "authenticated read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3) Server-side price enforcement on order_items
CREATE OR REPLACE FUNCTION public.enforce_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_price integer;
  real_name  text;
BEGIN
  SELECT price_xaf, name INTO real_price, real_name
    FROM public.products WHERE id = NEW.product_id;

  IF real_price IS NULL THEN
    RAISE EXCEPTION 'Unknown product %', NEW.product_id;
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- Overwrite client-supplied values with authoritative ones
  NEW.unit_price_xaf := real_price;
  NEW.line_total_xaf := real_price * NEW.quantity;
  NEW.product_name   := COALESCE(real_name, NEW.product_name);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS enforce_order_item_price ON public.order_items;
CREATE TRIGGER enforce_order_item_price
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_price();

-- 4) Server-side recompute of order totals from real item totals
CREATE OR REPLACE FUNCTION public.recompute_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_subtotal integer;
  zone_fee integer;
BEGIN
  SELECT COALESCE(SUM(line_total_xaf), 0) INTO real_subtotal
    FROM public.order_items WHERE order_id = NEW.id;

  SELECT fee_xaf INTO zone_fee
    FROM public.delivery_zones
    WHERE lower(region) = lower(NEW.region)
    LIMIT 1;

  IF real_subtotal > 0 THEN
    NEW.subtotal_xaf := real_subtotal;
  END IF;
  IF zone_fee IS NOT NULL THEN
    NEW.delivery_fee_xaf := zone_fee;
  END IF;
  NEW.total_xaf := NEW.subtotal_xaf + NEW.delivery_fee_xaf;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS recompute_order_totals_ins ON public.orders;
CREATE TRIGGER recompute_order_totals_ins
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.recompute_order_totals();

-- After order_items insert, sync the parent order totals
CREATE OR REPLACE FUNCTION public.sync_order_totals_after_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_subtotal integer;
  zone_fee integer;
  ord_region text;
BEGIN
  SELECT COALESCE(SUM(line_total_xaf), 0) INTO real_subtotal
    FROM public.order_items WHERE order_id = NEW.order_id;
  SELECT region INTO ord_region FROM public.orders WHERE id = NEW.order_id;
  SELECT fee_xaf INTO zone_fee FROM public.delivery_zones
    WHERE lower(region) = lower(ord_region) LIMIT 1;
  UPDATE public.orders
    SET subtotal_xaf = real_subtotal,
        delivery_fee_xaf = COALESCE(zone_fee, delivery_fee_xaf),
        total_xaf = real_subtotal + COALESCE(zone_fee, delivery_fee_xaf)
    WHERE id = NEW.order_id;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS sync_order_totals_after_items ON public.order_items;
CREATE TRIGGER sync_order_totals_after_items
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_order_totals_after_items();
