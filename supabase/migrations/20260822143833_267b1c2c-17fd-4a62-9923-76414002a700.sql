REVOKE EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) TO service_role;