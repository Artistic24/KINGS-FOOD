
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- Riders may see open pickups and the orders assigned to them.
DROP POLICY IF EXISTS "riders view open and own orders" ON public.orders;
CREATE POLICY "riders view open and own orders"
ON public.orders FOR SELECT TO authenticated
USING (
  rider_id = auth.uid()
  OR (rider_id IS NULL AND public.has_role(auth.uid(), 'rider'))
);

-- Riders may read incident reports for open pickups before re-accepting them.
DROP POLICY IF EXISTS "riders read reports on open orders" ON public.delivery_reports;
CREATE POLICY "riders read reports on open orders"
ON public.delivery_reports FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'rider')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = delivery_reports.order_id
      AND (o.rider_id IS NULL OR o.rider_id = auth.uid())
  )
);

-- Riders may read cancellation reasons for open pickups too.
DROP POLICY IF EXISTS "riders read cancellations on open orders" ON public.rider_cancellations;
CREATE POLICY "riders read cancellations on open orders"
ON public.rider_cancellations FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR rider_id = auth.uid()
  OR (
    public.has_role(auth.uid(), 'rider')
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = rider_cancellations.order_id AND o.rider_id IS NULL
    )
  )
);
