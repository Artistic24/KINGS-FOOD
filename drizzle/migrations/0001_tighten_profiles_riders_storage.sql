-- Profiles: own + admins; public name/avatar via function
DROP POLICY IF EXISTS "authenticated read profiles" ON public.profiles;
CREATE POLICY "read own profile or admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id = ANY(_ids)
$$;
REVOKE ALL ON FUNCTION public.public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_profiles(uuid[]) TO authenticated;

-- Riders: self, admins, buyers of an order they carry
CREATE OR REPLACE FUNCTION public.is_my_orders_rider(_rider uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.orders WHERE rider_id = _rider AND user_id = auth.uid())
$$;
DROP POLICY IF EXISTS "authenticated view riders" ON public.riders;
DROP POLICY IF EXISTS "buyer reads rider of own order" ON public.riders;
CREATE POLICY "riders visible to self admin or buyer" ON public.riders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_my_orders_rider(user_id));

-- Storage
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chatfiles_public_read" ON storage.objects;
CREATE POLICY "chatfiles_signed_in_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "brand_assets read" ON storage.objects;
CREATE POLICY "brand_assets admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));