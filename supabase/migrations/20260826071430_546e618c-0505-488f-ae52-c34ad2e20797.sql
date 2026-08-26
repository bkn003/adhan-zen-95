-- Defense in depth: the banking table must rely on RLS alone AND have no
-- direct privileges for client roles. Only service_role (edge functions) may touch it.
REVOKE ALL ON public.location_donation_details FROM anon;
REVOKE ALL ON public.location_donation_details FROM authenticated;
GRANT ALL ON public.location_donation_details TO service_role;

-- analytics_events: clients (and edge functions) may only append events.
-- Without an INSERT policy the grant alone still fails under RLS.
DROP POLICY IF EXISTS "anyone can log analytics events" ON public.analytics_events;
CREATE POLICY "anyone can log analytics events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);