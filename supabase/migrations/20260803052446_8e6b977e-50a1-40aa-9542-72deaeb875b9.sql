-- 1) mosque_reviews: ensure identifiers (device_id, user_id) are not readable by clients
REVOKE SELECT ON public.mosque_reviews FROM anon, authenticated;
GRANT SELECT (id, location_id, rating, comment, created_at) ON public.mosque_reviews TO anon, authenticated;
GRANT ALL ON public.mosque_reviews TO service_role;

-- Replace the broad public SELECT policy with an explicit anon/authenticated read policy
DROP POLICY IF EXISTS "Public can read reviews" ON public.mosque_reviews;
CREATE POLICY "Public can read review content"
  ON public.mosque_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2) analytics_events: keep insert-only for clients, reads restricted to service_role
REVOKE SELECT ON public.analytics_events FROM anon, authenticated;
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;