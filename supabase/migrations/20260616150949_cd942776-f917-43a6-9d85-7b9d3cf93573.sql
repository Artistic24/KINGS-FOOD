
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "avatars_user_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "chatfiles_public_read" ON storage.objects FOR SELECT USING (bucket_id='chat-files');
CREATE POLICY "chatfiles_user_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "chatfiles_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);
