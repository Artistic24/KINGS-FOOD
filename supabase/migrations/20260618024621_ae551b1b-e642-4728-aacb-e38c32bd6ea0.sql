
-- Restrict admin_locations to admins only
DROP POLICY IF EXISTS "authenticated read admin locations" ON public.admin_locations;

-- UserBadge needs only the is_super_admin flag; expose via a security definer fn
CREATE OR REPLACE FUNCTION public.is_user_super_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_locations WHERE user_id = _uid AND is_super_admin = true);
$$;
GRANT EXECUTE ON FUNCTION public.is_user_super_admin(uuid) TO anon, authenticated;

-- Restrict chat_messages reads to authenticated users
DROP POLICY IF EXISTS "chat read all" ON public.chat_messages;
CREATE POLICY "chat read authenticated"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (true);
