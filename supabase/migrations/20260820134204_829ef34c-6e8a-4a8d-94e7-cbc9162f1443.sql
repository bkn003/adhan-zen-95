-- Restrict direct read access to sensitive donation/banking columns on public.locations.
-- The table-level public SELECT policy remains for non-sensitive mosque data,
-- but banking details are now only accessible via the get_mosque_donation_details
-- SECURITY DEFINER RPC (which runs as the function owner and is unaffected).

REVOKE SELECT (donation_upi_id, donation_account_holder, donation_bank_name, donation_account_number, donation_ifsc, donation_notes)
ON public.locations FROM anon;

REVOKE SELECT (donation_upi_id, donation_account_holder, donation_bank_name, donation_account_number, donation_ifsc, donation_notes)
ON public.locations FROM authenticated;

-- service_role retains full access for edge functions.
GRANT SELECT (donation_upi_id, donation_account_holder, donation_bank_name, donation_account_number, donation_ifsc, donation_notes)
ON public.locations TO service_role;