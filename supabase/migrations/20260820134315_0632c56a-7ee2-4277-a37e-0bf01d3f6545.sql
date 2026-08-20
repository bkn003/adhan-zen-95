-- Restore EXECUTE on the donation-details RPC now that it is the sole access path
-- for mosque banking details (direct column reads were revoked in the previous migration).
GRANT EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) TO service_role;