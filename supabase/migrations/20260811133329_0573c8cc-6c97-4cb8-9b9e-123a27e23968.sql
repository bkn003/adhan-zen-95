-- 1) mosque_timing_audit: scope reads to that mosque's admins / super admins
DROP POLICY IF EXISTS audit_read_authenticated ON public.mosque_timing_audit;
CREATE POLICY audit_read_admins ON public.mosque_timing_audit
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.mosque_admin_users a
    WHERE a.location_id = mosque_timing_audit.location_id
      AND a.user_id = auth.uid()
      AND a.is_paused = false
  )
);

-- 2) profiles: no anonymous reads
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_read_authenticated ON public.profiles
FOR SELECT TO authenticated
USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 3) SECURITY DEFINER functions must not be callable without a session
REVOKE EXECUTE ON FUNCTION public.get_attendance_counts(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_mosque_freshness(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_verified_mosque_ids() FROM anon;

-- trigger-only functions should not be callable by API roles at all
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_super_admin_for_known_email() FROM PUBLIC, anon, authenticated;
