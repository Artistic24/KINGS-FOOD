
-- 1. Extend orders with route history and cancellation tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS route_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cancelled_by_rider_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- 2. Ban flag on riders
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- 3. Cancellation log
CREATE TABLE IF NOT EXISTS public.rider_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.rider_cancellations TO authenticated;
GRANT ALL ON public.rider_cancellations TO service_role;
ALTER TABLE public.rider_cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rider or admin read cancellations" ON public.rider_cancellations
  FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rider inserts own cancellation" ON public.rider_cancellations
  FOR INSERT TO authenticated
  WITH CHECK (rider_id = auth.uid());

-- 4. Allow rider to update their own assigned orders (status, route, cancel)
DROP POLICY IF EXISTS "rider updates own order" ON public.orders;
CREATE POLICY "rider updates own order" ON public.orders
  FOR UPDATE TO authenticated
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid() OR rider_id IS NULL);

-- 4b. Allow buyer to read the rider profile for any of their orders
DROP POLICY IF EXISTS "buyer reads rider of own order" ON public.riders;
CREATE POLICY "buyer reads rider of own order" ON public.riders
  FOR SELECT TO authenticated
  USING (true);  -- already public per existing "authenticated view riders" — keep permissive

-- 5. Append a GPS point to an order's route history
CREATE OR REPLACE FUNCTION public.append_route_point(_order_id uuid, _lat double precision, _lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND rider_id = auth.uid()) THEN
    RAISE EXCEPTION 'not your order';
  END IF;
  UPDATE public.orders
    SET route_history = route_history || jsonb_build_array(
      jsonb_build_object('lat', _lat, 'lng', _lng, 't', extract(epoch FROM now())::bigint)
    )
    WHERE id = _order_id;
END $$;

-- 6. Rider cancels an accepted order → returns to pool
CREATE OR REPLACE FUNCTION public.cancel_rider_order(_order_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND rider_id = uid) THEN
    RAISE EXCEPTION 'not your order';
  END IF;
  INSERT INTO public.rider_cancellations(order_id, rider_id, reason) VALUES (_order_id, uid, _reason);
  UPDATE public.orders
    SET rider_id = NULL,
        delivery_status = 'unassigned',
        cancelled_by_rider_count = cancelled_by_rider_count + 1,
        cancelled_at = now(),
        accepted_at = NULL
    WHERE id = _order_id;
  DELETE FROM public.rider_locations WHERE order_id = _order_id;
  RETURN true;
END $$;

-- 7. Admin bans a rider
CREATE OR REPLACE FUNCTION public.admin_remove_rider(_rider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.riders SET banned = true WHERE user_id = _rider_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.admin_restore_rider(_rider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.riders SET banned = false WHERE user_id = _rider_id;
  RETURN true;
END $$;

-- 8. Leaderboard: percentage ratings + counts per rider
CREATE OR REPLACE FUNCTION public.rider_leaderboard()
RETURNS TABLE(
  rider_id uuid,
  full_name text,
  phone text,
  region text,
  town text,
  banned boolean,
  delivered_count integer,
  cancelled_count integer,
  active_count integer,
  total_orders integer,
  cancel_rate_pct integer,
  delivery_rate_pct integer,
  avg_delivery_minutes integer,
  speed_score_pct integer,
  overall_rating_pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT r.user_id AS rider_id, r.full_name, r.phone, r.region, r.town, r.banned,
      COALESCE(SUM(CASE WHEN o.delivery_status = 'delivered' THEN 1 ELSE 0 END), 0)::int AS delivered_count,
      COALESCE((SELECT COUNT(*) FROM public.rider_cancellations c WHERE c.rider_id = r.user_id), 0)::int AS cancelled_count,
      COALESCE(SUM(CASE WHEN o.delivery_status IN ('accepted','picked_up','en_route','arrived') THEN 1 ELSE 0 END), 0)::int AS active_count,
      COALESCE(AVG(
        CASE WHEN o.delivery_status = 'delivered' AND o.accepted_at IS NOT NULL AND o.delivered_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (o.delivered_at - o.accepted_at)) / 60.0
        END
      ), 0)::numeric AS avg_min
    FROM public.riders r
    LEFT JOIN public.orders o ON o.rider_id = r.user_id
    GROUP BY r.user_id, r.full_name, r.phone, r.region, r.town, r.banned
  )
  SELECT
    d.rider_id, d.full_name, d.phone, d.region, d.town, d.banned,
    d.delivered_count, d.cancelled_count, d.active_count,
    (d.delivered_count + d.cancelled_count) AS total_orders,
    CASE WHEN (d.delivered_count + d.cancelled_count) = 0 THEN 0
         ELSE ROUND(100.0 * d.cancelled_count / (d.delivered_count + d.cancelled_count))::int END AS cancel_rate_pct,
    CASE WHEN (d.delivered_count + d.cancelled_count) = 0 THEN 0
         ELSE ROUND(100.0 * d.delivered_count / (d.delivered_count + d.cancelled_count))::int END AS delivery_rate_pct,
    ROUND(d.avg_min)::int AS avg_delivery_minutes,
    -- Speed: 100% if <=15 min, 0% if >=60 min, linear in between
    CASE WHEN d.avg_min <= 0 THEN 0
         WHEN d.avg_min <= 15 THEN 100
         WHEN d.avg_min >= 60 THEN 0
         ELSE ROUND(100.0 * (60 - d.avg_min) / 45.0)::int END AS speed_score_pct,
    -- Overall: 60% delivery rate + 40% speed
    CASE WHEN (d.delivered_count + d.cancelled_count) = 0 THEN 0
         ELSE ROUND(
           0.6 * (100.0 * d.delivered_count / GREATEST(1, d.delivered_count + d.cancelled_count))
           + 0.4 * (
             CASE WHEN d.avg_min <= 0 THEN 50
                  WHEN d.avg_min <= 15 THEN 100
                  WHEN d.avg_min >= 60 THEN 0
                  ELSE 100.0 * (60 - d.avg_min) / 45.0 END
           )
         )::int END AS overall_rating_pct
  FROM d
  ORDER BY overall_rating_pct DESC, delivered_count DESC
$$;

-- 9. Stamp accepted_at when a rider accepts (delivery_status goes from unassigned → accepted)
CREATE OR REPLACE FUNCTION public.stamp_order_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_status = 'accepted' AND (OLD.delivery_status IS DISTINCT FROM 'accepted') AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_accept_stamp ON public.orders;
CREATE TRIGGER trg_orders_accept_stamp BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_accepted();
