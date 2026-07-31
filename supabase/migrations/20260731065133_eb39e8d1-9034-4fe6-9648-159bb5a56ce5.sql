-- 1) Lock down donation banking columns on locations
REVOKE SELECT (donation_upi_id, donation_account_holder, donation_bank_name, donation_account_number, donation_ifsc)
  ON public.locations FROM anon, authenticated;

-- Serve donation details one mosque at a time, only when donations are enabled
CREATE OR REPLACE FUNCTION public.get_mosque_donation_details(p_location_id uuid)
RETURNS TABLE (
  donation_enabled boolean,
  donation_upi_id text,
  donation_account_holder text,
  donation_bank_name text,
  donation_account_number text,
  donation_ifsc text,
  donation_notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.donation_enabled,
         l.donation_upi_id,
         l.donation_account_holder,
         l.donation_bank_name,
         l.donation_account_number,
         l.donation_ifsc,
         l.donation_notes
  FROM public.locations l
  WHERE l.id = p_location_id
    AND l.donation_enabled = true
    AND COALESCE(l.is_visible, true) = true;
$$;

REVOKE ALL ON FUNCTION public.get_mosque_donation_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mosque_donation_details(uuid) TO anon, authenticated, service_role;

-- 2) RSVPs: no more public listing of participant rows
DROP POLICY IF EXISTS rsvps_select_all ON public.mosque_event_rsvps;

CREATE POLICY rsvps_select_own ON public.mosque_event_rsvps
FOR SELECT
USING (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- Anonymous aggregate counts instead of raw rows
CREATE OR REPLACE FUNCTION public.get_event_rsvp_counts(p_event_ids uuid[])
RETURNS TABLE (event_id uuid, status text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.event_id, r.status, count(*)::bigint
  FROM public.mosque_event_rsvps r
  WHERE r.event_id = ANY(p_event_ids)
  GROUP BY r.event_id, r.status;
$$;

REVOKE ALL ON FUNCTION public.get_event_rsvp_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_counts(uuid[]) TO anon, authenticated, service_role;

-- 3) Push tokens: never readable by app clients
DROP POLICY IF EXISTS "Device can read own push token" ON public.push_tokens;
REVOKE SELECT ON public.push_tokens FROM anon, authenticated;
