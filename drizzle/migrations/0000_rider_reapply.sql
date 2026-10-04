ALTER TABLE public.rider_requests DROP CONSTRAINT IF EXISTS rider_requests_status_check;

CREATE OR REPLACE FUNCTION public.admin_require_rider_reapply(_rider_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _rider_id AND role = 'rider';
  UPDATE public.riders SET is_online = false WHERE user_id = _rider_id;
  UPDATE public.rider_requests SET status = 'reapply_required', reviewer_id = auth.uid(), reviewed_at = now()
    WHERE user_id = _rider_id AND status = 'approved';
  INSERT INTO public.notifications(user_id, title, body, link)
    VALUES (_rider_id, 'Rider access removed', 'An admin removed your rider access. Please submit a new rider application.', '/rider/apply');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.rider_request_detail_change()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = auth.uid() AND role = 'rider';
  UPDATE public.riders SET is_online = false WHERE user_id = auth.uid();
  UPDATE public.rider_requests SET status = 'reapply_required', updated_at = now()
    WHERE user_id = auth.uid() AND status = 'approved';
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.admin_require_rider_reapply(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.rider_request_detail_change() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_require_rider_reapply(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_request_detail_change() TO authenticated;