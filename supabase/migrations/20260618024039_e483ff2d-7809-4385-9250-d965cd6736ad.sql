
-- Town/region normalization (accent + case insensitive)
CREATE OR REPLACE FUNCTION public.normalize_town(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(translate(coalesce(_t,''),
    'àáâãäåÀÁÂÃÄÅèéêëÈÉÊËìíîïÌÍÎÏòóôõöÒÓÔÕÖùúûüÙÚÛÜñÑçÇ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUnNcC')));
$$;

-- One admin per (region, town)
CREATE UNIQUE INDEX IF NOT EXISTS admin_locations_one_per_town
ON public.admin_locations (public.normalize_town(region), public.normalize_town(town));

-- Updated approval enforces town uniqueness
CREATE OR REPLACE FUNCTION public.approve_admin_request(_req_id uuid, _approve boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE r public.admin_requests%ROWTYPE; taken boolean;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.admin_requests WHERE id = _req_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;

  IF _approve THEN
    SELECT EXISTS(
      SELECT 1 FROM public.admin_locations
      WHERE public.normalize_town(region) = public.normalize_town(r.region)
        AND public.normalize_town(town) = public.normalize_town(r.town)
        AND user_id <> r.user_id
    ) INTO taken;
    IF taken THEN
      RAISE EXCEPTION 'Another admin already covers %, %', r.town, r.region;
    END IF;
  END IF;

  UPDATE public.admin_requests SET status = CASE WHEN _approve THEN 'approved' ELSE 'declined' END,
    reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _req_id;

  IF _approve THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (r.user_id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_locations(user_id, full_name, region, town, latitude, longitude, is_super_admin)
      VALUES (r.user_id, r.full_name, r.region, r.town, r.latitude, r.longitude, false)
      ON CONFLICT (user_id) DO UPDATE SET full_name=EXCLUDED.full_name, region=EXCLUDED.region,
        town=EXCLUDED.town, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude;
  END IF;
  RETURN true;
END $function$;

-- Same protection on add_admin_by_email
CREATE OR REPLACE FUNCTION public.add_admin_by_email(_email text, _full_name text, _region text, _town text, _lat double precision, _lng double precision, _make_super boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid(); target uuid; taken boolean;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _make_super AND NOT public.is_super_admin(caller) THEN RAISE EXCEPTION 'only super admins can grant super admin'; END IF;
  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF target IS NULL THEN RAISE EXCEPTION 'user with that email not found — they must sign up first'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.admin_locations
    WHERE public.normalize_town(region) = public.normalize_town(_region)
      AND public.normalize_town(town) = public.normalize_town(_town)
      AND user_id <> target
  ) INTO taken;
  IF taken THEN RAISE EXCEPTION 'Another admin already covers %, %', _town, _region; END IF;

  INSERT INTO public.user_roles(user_id, role) VALUES (target, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.admin_locations(user_id, full_name, region, town, latitude, longitude, is_super_admin)
    VALUES (target, _full_name, _region, _town, _lat, _lng, _make_super)
    ON CONFLICT (user_id) DO UPDATE
      SET full_name=EXCLUDED.full_name, region=EXCLUDED.region, town=EXCLUDED.town,
          latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
          is_super_admin = CASE WHEN public.is_super_admin(caller) THEN EXCLUDED.is_super_admin ELSE public.admin_locations.is_super_admin END;
  RETURN target;
END $function$;

-- Nearest admin: accent-insensitive match
CREATE OR REPLACE FUNCTION public.nearest_admin(_lat double precision, _lng double precision, _region text, _town text, _radius_km double precision DEFAULT 10)
RETURNS TABLE(admin_user_id uuid, full_name text, region text, town text, latitude double precision, longitude double precision, distance_km double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT a.user_id, a.full_name, a.region, a.town, a.latitude, a.longitude,
         public.haversine_km(_lat,_lng,a.latitude,a.longitude) AS distance_km
  FROM public.admin_locations a
  WHERE public.normalize_town(a.region) = public.normalize_town(_region)
    AND public.normalize_town(a.town)   = public.normalize_town(_town)
    AND public.haversine_km(_lat,_lng,a.latitude,a.longitude) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT 1
$function$;

-- Public helper: list taken towns in a region (anon-safe, returns only public location info already readable)
CREATE OR REPLACE FUNCTION public.taken_admin_towns(_region text)
RETURNS TABLE(town text, normalized text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.town, public.normalize_town(a.town)
  FROM public.admin_locations a
  WHERE public.normalize_town(a.region) = public.normalize_town(_region)
$$;

GRANT EXECUTE ON FUNCTION public.normalize_town(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.taken_admin_towns(text) TO anon, authenticated;
