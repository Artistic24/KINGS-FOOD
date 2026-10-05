-- Native Android push notification registration and delivery-email state.
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;

CREATE POLICY "users manage own push tokens" ON public.device_push_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS device_push_tokens_user_idx ON public.device_push_tokens(user_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_email_sent_at timestamptz;

CREATE TRIGGER trg_device_push_tokens_updated
BEFORE UPDATE ON public.device_push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.claim_delivery_email(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE claimed boolean;
BEGIN
  UPDATE public.orders
  SET delivery_email_sent_at = now()
  WHERE id = _order_id AND delivery_status = 'delivered' AND delivery_email_sent_at IS NULL;
  GET DIAGNOSTICS claimed = ROW_COUNT;
  RETURN claimed;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_delivery_email(uuid) TO service_role;
