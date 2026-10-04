CREATE OR REPLACE FUNCTION public.admin_list_media(_limit int DEFAULT 1000)
RETURNS TABLE(id uuid, bucket_id text, name text, size bigint, mimetype text, owner uuid, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY SELECT o.id, o.bucket_id, o.name, COALESCE((o.metadata->>'size')::bigint,0), o.metadata->>'mimetype', o.owner, o.created_at
  FROM storage.objects o WHERE o.name NOT LIKE '%.emptyFolderPlaceholder'
  ORDER BY o.created_at DESC LIMIT LEAST(_limit, 5000);
END $$;
REVOKE ALL ON FUNCTION public.admin_list_media(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_media(int) TO authenticated;

DROP POLICY IF EXISTS "Admins read all media" ON storage.objects;
CREATE POLICY "Admins read all media" ON storage.objects FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));