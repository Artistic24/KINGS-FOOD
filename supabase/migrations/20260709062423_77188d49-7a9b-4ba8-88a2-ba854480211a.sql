
CREATE POLICY "brand_assets read" ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets');
CREATE POLICY "brand_assets admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "brand_assets admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "brand_assets admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));
