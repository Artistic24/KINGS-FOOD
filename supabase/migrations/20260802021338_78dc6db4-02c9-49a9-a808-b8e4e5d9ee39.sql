CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section)
);

GRANT SELECT ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read own permissions"
  ON public.admin_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_admin_permission(_target uuid, _section text, _allowed boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF public.is_super_admin(_target) THEN RAISE EXCEPTION 'super admins always have full access'; END IF;
  INSERT INTO public.admin_permissions(user_id, section, allowed)
  VALUES (_target, _section, _allowed)
  ON CONFLICT (user_id, section) DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = now();
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.list_admin_permissions()
RETURNS TABLE(user_id uuid, section text, allowed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.section, p.allowed
  FROM public.admin_permissions p
  WHERE public.is_super_admin(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.my_admin_sections()
RETURNS TABLE(section text, allowed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.section, p.allowed FROM public.admin_permissions p WHERE p.user_id = auth.uid()
$$;