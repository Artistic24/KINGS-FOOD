CREATE OR REPLACE FUNCTION public.gen_kf_order_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; full_code text; exists_already boolean; i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..4 LOOP code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1); END LOOP;
    full_code := 'KF-' || code;
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_number = full_code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN full_code;
END $function$;

UPDATE public.orders SET order_number = 'KF-' || order_number
WHERE order_number !~ '^(KF-|SK-)';