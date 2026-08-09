
CREATE POLICY "rider upload own verification" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rider-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "rider read own verification" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rider-verification' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
