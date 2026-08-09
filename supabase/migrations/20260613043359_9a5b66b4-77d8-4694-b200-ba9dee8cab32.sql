
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origin_latitude double precision,
  ADD COLUMN IF NOT EXISTS origin_longitude double precision,
  ADD COLUMN IF NOT EXISTS origin_accuracy_m double precision;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  region text,
  sector_slug text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  avatar_seed text,
  featured boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "admins manage reviews" ON public.reviews FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
