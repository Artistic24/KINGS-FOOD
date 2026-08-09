
CREATE TABLE IF NOT EXISTS public.brand_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  brand_name text NOT NULL DEFAULT 'KINGS FOOD',
  tagline text DEFAULT 'Cameroon''s all-in-one marketplace',
  logo_url text,
  primary_color text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.brand_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.brand_settings TO authenticated;
GRANT ALL ON public.brand_settings TO service_role;
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_settings public read" ON public.brand_settings FOR SELECT USING (true);
CREATE POLICY "brand_settings admin insert" ON public.brand_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "brand_settings admin update" ON public.brand_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.brand_settings (id, brand_name, tagline) VALUES (1, 'KINGS FOOD', 'Cameroon''s all-in-one marketplace') ON CONFLICT (id) DO NOTHING;
CREATE TRIGGER brand_settings_touch BEFORE UPDATE ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  cta_text text DEFAULT 'Shop now',
  cta_url text,
  region text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ads TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads public read active" ON public.ads FOR SELECT USING (active = true);
CREATE POLICY "ads admin all" ON public.ads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ads_touch BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.gen_kf_order_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; exists_already boolean; i int;
BEGIN
  LOOP
    code := 'KF-';
    FOR i IN 1..6 LOOP code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1); END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_number = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END $$;
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT public.gen_kf_order_code();
