REVOKE EXECUTE ON FUNCTION public.limit_product_images() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.limit_home_slides() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_account_verified(uuid) FROM anon;