
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "chat update admin pin" ON public.chat_messages;
CREATE POLICY "chat update admin pin" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.support_settings
  ADD COLUMN IF NOT EXISTS apk_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS apk_label text NOT NULL DEFAULT 'Download Android App';
