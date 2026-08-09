CREATE OR REPLACE FUNCTION public.gen_kf_order_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; exists_already boolean; i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..4 LOOP code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1); END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_number = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END $function$;