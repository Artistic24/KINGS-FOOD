REVOKE EXECUTE ON FUNCTION public.set_admin_permission(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_admin_permissions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_admin_sections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_permission(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_admin_sections() TO authenticated;