
-- 1) SUPPORT SETTINGS (singleton row)
CREATE TABLE IF NOT EXISTS public.support_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  support_email text NOT NULL DEFAULT 'coremagazinee@gmail.com',
  button_label text NOT NULL DEFAULT 'Support',
  intro_text text NOT NULL DEFAULT 'Send us your complaint or question. We reply by email.',
  subject_prefix text NOT NULL DEFAULT '[St Kingston Support]',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_settings TO anon, authenticated;
GRANT ALL ON public.support_settings TO service_role, authenticated;
ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support read" ON public.support_settings FOR SELECT USING (true);
CREATE POLICY "support admin write" ON public.support_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.support_settings(id) VALUES (true) ON CONFLICT DO NOTHING;

-- 2) CHAT MESSAGES (global public room)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT ON public.chat_messages TO anon;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat read all" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "chat insert own" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat delete own or admin" ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 3) ADMIN REQUESTS
CREATE TABLE IF NOT EXISTS public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  region text NOT NULL,
  town text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_requests_user_idx ON public.admin_requests(user_id);
CREATE INDEX IF NOT EXISTS admin_requests_status_idx ON public.admin_requests(status);
GRANT SELECT, INSERT ON public.admin_requests TO authenticated;
GRANT ALL ON public.admin_requests TO service_role;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar insert own" ON public.admin_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ar view own or super" ON public.admin_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "ar update super" ON public.admin_requests FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 4) PROFILE: open SELECT to everyone (for chat/badges); keep update/insert as own
DROP POLICY IF EXISTS "view own profile" ON public.profiles;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
GRANT SELECT ON public.profiles TO anon, authenticated;

-- 5) APPROVE RPC
CREATE OR REPLACE FUNCTION public.approve_admin_request(_req_id uuid, _approve boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.admin_requests%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.admin_requests WHERE id = _req_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
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
END $$;

-- 6) AUTO-PROMOTE coremagazinee@gmail.com on signup (and now if already exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'coremagazinee@gmail.com' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_locations(user_id, full_name, region, town, latitude, longitude, is_super_admin)
      VALUES (NEW.id, 'Super Admin', 'Centre', 'Yaoundé', 3.848, 11.502, true)
      ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email)='coremagazinee@gmail.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_locations(user_id, full_name, region, town, latitude, longitude, is_super_admin)
      VALUES (uid, 'Super Admin', 'Centre', 'Yaoundé', 3.848, 11.502, true)
      ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true;
  END IF;
END $$;
