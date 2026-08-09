
-- Rider system schema

-- Extend orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Rider applications
CREATE TABLE IF NOT EXISTS public.rider_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  id_front_path text NOT NULL,
  id_back_path text NOT NULL,
  face_video_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rider_requests TO authenticated;
GRANT ALL ON public.rider_requests TO service_role;
ALTER TABLE public.rider_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "riders view own request" ON public.rider_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "riders insert own request" ON public.rider_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins update requests" ON public.rider_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER rider_requests_updated BEFORE UPDATE ON public.rider_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approved riders
CREATE TABLE IF NOT EXISTS public.riders (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  region text,
  town text,
  is_online boolean NOT NULL DEFAULT false,
  current_lat double precision,
  current_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.riders TO authenticated;
GRANT ALL ON public.riders TO service_role;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
-- Any signed-in user can view rider profile (buyer needs to see assigned rider)
CREATE POLICY "authenticated view riders" ON public.riders FOR SELECT TO authenticated USING (true);
CREATE POLICY "rider update own" ON public.riders FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin manage riders" ON public.riders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER riders_updated BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Live rider location per active order
CREATE TABLE IF NOT EXISTS public.rider_locations (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rider_locations TO authenticated;
GRANT ALL ON public.rider_locations TO service_role;
ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;
-- Buyer of the order can read; rider can read/write their own; admins can read
CREATE POLICY "order participants read location" ON public.rider_locations FOR SELECT TO authenticated
  USING (
    rider_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "rider write own location" ON public.rider_locations FOR INSERT TO authenticated WITH CHECK (rider_id = auth.uid());
CREATE POLICY "rider update own location" ON public.rider_locations FOR UPDATE TO authenticated USING (rider_id = auth.uid()) WITH CHECK (rider_id = auth.uid());

-- Delivery incident reports
CREATE TABLE IF NOT EXISTS public.delivery_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'accident',
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.delivery_reports TO authenticated;
GRANT ALL ON public.delivery_reports TO service_role;
ALTER TABLE public.delivery_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rider insert own report" ON public.delivery_reports FOR INSERT TO authenticated WITH CHECK (rider_id = auth.uid());
CREATE POLICY "participants read report" ON public.delivery_reports FOR SELECT TO authenticated
  USING (
    rider_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
