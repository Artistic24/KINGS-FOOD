
-- ============ admin_locations ============
CREATE TABLE public.admin_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  region text NOT NULL,
  town text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_locations TO authenticated;
GRANT ALL ON public.admin_locations TO service_role;
ALTER TABLE public.admin_locations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_locations WHERE user_id=_uid AND is_super_admin=true);
$$;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon, service_role;

CREATE POLICY "admins view all admin locations" ON public.admin_locations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "anyone read admin locations for routing" ON public.admin_locations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert admin locations" ON public.admin_locations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin edits own row, super edits any" ON public.admin_locations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (
    (user_id = auth.uid() AND is_super_admin = (SELECT is_super_admin FROM public.admin_locations a WHERE a.user_id=auth.uid()))
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "super admin deletes" ON public.admin_locations
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()) AND user_id <> auth.uid());

CREATE TRIGGER trg_admin_locations_updated BEFORE UPDATE ON public.admin_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ payment_settings ============
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  ussd_template text,
  transfer_number text NOT NULL,
  account_name text NOT NULL,
  instructions text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment settings public read" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "admins manage payment settings" ON public.payment_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payment_settings_updated BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_settings (provider, display_name, ussd_template, transfer_number, account_name, instructions) VALUES
  ('mtn','MTN Mobile Money','*126*1*{number}*{amount}#','670000000','St Kingston Connect','Dial the code, confirm name, then enter your PIN.'),
  ('orange','Orange Money','#150*1*1*{number}*{amount}#','690000000','St Kingston Connect','Dial the code, confirm name, then enter your secret code.');

-- ============ orders.assigned_admin_id ============
ALTER TABLE public.orders ADD COLUMN assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX orders_assigned_admin_idx ON public.orders(assigned_admin_id);

DROP POLICY IF EXISTS "view own orders" ON public.orders;
CREATE POLICY "view own or assigned orders" ON public.orders
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR assigned_admin_id = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "admins update orders" ON public.orders;
CREATE POLICY "assigned admin or super updates" ON public.orders
  FOR UPDATE TO authenticated USING (
    assigned_admin_id = auth.uid() OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "admins delete orders" ON public.orders;
CREATE POLICY "super admin deletes orders" ON public.orders
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============ delivery_zones region-scoped edits ============
DROP POLICY IF EXISTS "admins manage zones" ON public.delivery_zones;
CREATE POLICY "super admin manages all zones" ON public.delivery_zones
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "admins update own region zone" ON public.delivery_zones
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    AND EXISTS (SELECT 1 FROM public.admin_locations a WHERE a.user_id=auth.uid() AND lower(a.region)=lower(delivery_zones.region))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    AND EXISTS (SELECT 1 FROM public.admin_locations a WHERE a.user_id=auth.uid() AND lower(a.region)=lower(delivery_zones.region))
  );

-- ============ reviews: user-submitted ============
ALTER TABLE public.reviews ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE POLICY "users insert own reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ Helper functions ============
-- Haversine distance in km
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 2 * 6371 * asin(sqrt(
    sin(radians((lat2-lat1)/2))^2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians((lon2-lon1)/2))^2
  ))
$$;
GRANT EXECUTE ON FUNCTION public.haversine_km(double precision,double precision,double precision,double precision) TO anon, authenticated, service_role;

-- Find nearest admin matching region+town within radius_km
CREATE OR REPLACE FUNCTION public.nearest_admin(
  _lat double precision, _lng double precision, _region text, _town text, _radius_km double precision DEFAULT 10
) RETURNS TABLE(admin_user_id uuid, full_name text, region text, town text, latitude double precision, longitude double precision, distance_km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.user_id, a.full_name, a.region, a.town, a.latitude, a.longitude,
         public.haversine_km(_lat,_lng,a.latitude,a.longitude) AS distance_km
  FROM public.admin_locations a
  WHERE lower(a.region)=lower(_region) AND lower(a.town)=lower(_town)
    AND public.haversine_km(_lat,_lng,a.latitude,a.longitude) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.nearest_admin(double precision,double precision,text,text,double precision) TO anon, authenticated, service_role;

-- Add a new admin (by email) — caller must be admin; only super admins can create super admins
CREATE OR REPLACE FUNCTION public.add_admin_by_email(
  _email text, _full_name text, _region text, _town text, _lat double precision, _lng double precision, _make_super boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  caller uuid := auth.uid();
  target uuid;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _make_super AND NOT public.is_super_admin(caller) THEN
    RAISE EXCEPTION 'only super admins can grant super admin';
  END IF;
  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF target IS NULL THEN RAISE EXCEPTION 'user with that email not found — they must sign up first'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (target, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.admin_locations(user_id, full_name, region, town, latitude, longitude, is_super_admin)
    VALUES (target, _full_name, _region, _town, _lat, _lng, _make_super)
    ON CONFLICT (user_id) DO UPDATE
      SET full_name=EXCLUDED.full_name, region=EXCLUDED.region, town=EXCLUDED.town,
          latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
          is_super_admin = CASE WHEN public.is_super_admin(caller) THEN EXCLUDED.is_super_admin ELSE public.admin_locations.is_super_admin END;
  RETURN target;
END $$;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text,text,text,text,double precision,double precision,boolean) TO authenticated, service_role;

-- Remove admin — only super admins can remove others (and not themselves)
CREATE OR REPLACE FUNCTION public.remove_admin(_target uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.is_super_admin(caller) THEN RAISE EXCEPTION 'only super admins can remove admins'; END IF;
  IF _target = caller THEN RAISE EXCEPTION 'cannot remove yourself'; END IF;
  DELETE FROM public.admin_locations WHERE user_id = _target;
  DELETE FROM public.user_roles WHERE user_id = _target AND role IN ('admin');
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.remove_admin(uuid) TO authenticated, service_role;

-- Promote / demote super admin (super only)
CREATE OR REPLACE FUNCTION public.set_super_admin(_target uuid, _make_super boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.admin_locations SET is_super_admin=_make_super WHERE user_id=_target;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.set_super_admin(uuid,boolean) TO authenticated, service_role;

-- Update claim_admin to also create a super admin location seed
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  has_any_admin boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') INTO has_any_admin;
  IF has_any_admin THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid,'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.admin_locations(user_id, full_name, region, town, latitude, longitude, is_super_admin)
    VALUES (uid, 'Super Admin', 'Centre', 'Yaoundé', 3.848, 11.502, true)
    ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true;
  RETURN true;
END $$;
