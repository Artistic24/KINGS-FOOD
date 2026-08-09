-- 1) Home page editable content -------------------------------------------
CREATE TABLE IF NOT EXISTS public.home_content (
  id smallint PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_content_single_row CHECK (id = 1)
);

GRANT SELECT ON public.home_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.home_content TO authenticated;
GRANT ALL ON public.home_content TO service_role;

ALTER TABLE public.home_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Home content is public" ON public.home_content
  FOR SELECT USING (true);
CREATE POLICY "Admins insert home content" ON public.home_content
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update home content" ON public.home_content
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER home_content_touch BEFORE UPDATE ON public.home_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.home_content (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- 2) Max 4 admins per region -------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_admin_by_email(_email text, _full_name text, _region text, _town text, _lat double precision, _lng double precision, _make_super boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); target uuid; taken boolean; region_count int;
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

  SELECT COUNT(*) INTO region_count FROM public.admin_locations
    WHERE public.normalize_town(region) = public.normalize_town(_region)
      AND user_id <> target;
  IF region_count >= 4 THEN
    RAISE EXCEPTION 'The % region already has the maximum of 4 admins', _region;
  END IF;

  INSERT INTO public.user_roles(user_id, role) VALUES (target, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.admin_locations(user_id, full_name, region, town, latitude, longitude, is_super_admin)
    VALUES (target, _full_name, _region, _town, _lat, _lng, _make_super)
    ON CONFLICT (user_id) DO UPDATE
      SET full_name=EXCLUDED.full_name, region=EXCLUDED.region, town=EXCLUDED.town,
          latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
          is_super_admin = CASE WHEN public.is_super_admin(caller) THEN EXCLUDED.is_super_admin ELSE public.admin_locations.is_super_admin END;
  RETURN target;
END $function$;

CREATE OR REPLACE FUNCTION public.approve_admin_request(_req_id uuid, _approve boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.admin_requests%ROWTYPE; taken boolean; region_count int;
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

    SELECT COUNT(*) INTO region_count FROM public.admin_locations
      WHERE public.normalize_town(region) = public.normalize_town(r.region)
        AND user_id <> r.user_id;
    IF region_count >= 4 THEN
      RAISE EXCEPTION 'The % region already has the maximum of 4 admins', r.region;
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

-- 3) Seniority: only super admins act, and never on someone older ------------
CREATE OR REPLACE FUNCTION public.remove_admin(_target uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); caller_since timestamptz; target_since timestamptz;
BEGIN
  IF caller IS NULL OR NOT public.is_super_admin(caller) THEN RAISE EXCEPTION 'only super admins can remove admins'; END IF;
  IF _target = caller THEN RAISE EXCEPTION 'cannot remove yourself'; END IF;
  SELECT created_at INTO caller_since FROM public.admin_locations WHERE user_id = caller;
  SELECT created_at INTO target_since FROM public.admin_locations WHERE user_id = _target;
  IF target_since IS NOT NULL AND caller_since IS NOT NULL AND target_since < caller_since THEN
    RAISE EXCEPTION 'you cannot remove an admin who joined before you';
  END IF;
  DELETE FROM public.admin_locations WHERE user_id = _target;
  DELETE FROM public.user_roles WHERE user_id = _target AND role IN ('admin');
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.set_super_admin(_target uuid, _make_super boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); caller_since timestamptz; target_since timestamptz;
BEGIN
  IF NOT public.is_super_admin(caller) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _target = caller THEN RAISE EXCEPTION 'cannot change your own tier'; END IF;
  SELECT created_at INTO caller_since FROM public.admin_locations WHERE user_id = caller;
  SELECT created_at INTO target_since FROM public.admin_locations WHERE user_id = _target;
  IF NOT _make_super AND target_since IS NOT NULL AND caller_since IS NOT NULL AND target_since < caller_since THEN
    RAISE EXCEPTION 'you cannot demote an admin who joined before you';
  END IF;
  UPDATE public.admin_locations SET is_super_admin=_make_super WHERE user_id=_target;
  RETURN true;
END $function$;