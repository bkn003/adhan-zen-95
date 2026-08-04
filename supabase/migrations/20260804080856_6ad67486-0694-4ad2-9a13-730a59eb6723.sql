-- 1) SECURITY DEFINER functions must not be callable by unauthenticated (anon) role
REVOKE ALL ON FUNCTION public.report_mosque_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_mosque_review(uuid, text) TO authenticated, service_role;

-- 2) mosque_reviews: public exposure limited to non-identifying columns only
REVOKE SELECT ON TABLE public.mosque_reviews FROM anon, authenticated;
GRANT SELECT (id, location_id, rating, comment, created_at) ON public.mosque_reviews TO anon, authenticated;
GRANT ALL ON public.mosque_reviews TO service_role;

DROP POLICY IF EXISTS "Public can read visible review content" ON public.mosque_reviews;
DROP POLICY IF EXISTS "Public can read visible reviews" ON public.mosque_reviews;
DROP POLICY IF EXISTS "Owner can read own review" ON public.mosque_reviews;

-- Anonymous visitors: visible reviews only, and only the columns granted above
CREATE POLICY "Public can read visible reviews"
  ON public.mosque_reviews FOR SELECT TO anon
  USING (is_hidden = false);

-- Signed-in users: visible reviews (granted columns) or their own review
CREATE POLICY "Authenticated can read visible reviews"
  ON public.mosque_reviews FOR SELECT TO authenticated
  USING (is_hidden = false OR user_id = auth.uid());

-- Authors may read every column of their own review
GRANT SELECT (device_id, user_id, is_hidden, report_count) ON public.mosque_reviews TO authenticated;