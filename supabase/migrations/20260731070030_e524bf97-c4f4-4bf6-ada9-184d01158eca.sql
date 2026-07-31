REVOKE ALL ON FUNCTION public.get_mosque_donation_details(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_event_rsvp_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_counts(uuid[]) TO authenticated, service_role;