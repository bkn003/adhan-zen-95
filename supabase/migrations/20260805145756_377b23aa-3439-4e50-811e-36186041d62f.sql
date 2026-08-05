-- Owner-scoped read access for a user's own review reports
GRANT SELECT ON public.mosque_review_reports TO authenticated;
GRANT ALL ON public.mosque_review_reports TO service_role;

DROP POLICY IF EXISTS "reports_select_own" ON public.mosque_review_reports;
CREATE POLICY "reports_select_own"
  ON public.mosque_review_reports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep writes server-side only (report_mosque_review SECURITY DEFINER RPC);
-- no INSERT/UPDATE/DELETE policies for clients.
REVOKE INSERT, UPDATE, DELETE ON public.mosque_review_reports FROM authenticated, anon;
REVOKE SELECT ON public.mosque_review_reports FROM anon;