
-- 1) Hide admin_password_hash from public/anon/authenticated (column-level).
--    admin_username stays readable so the super admin UI can display who is set.
REVOKE SELECT (admin_password_hash) ON public.locations FROM anon, authenticated;

-- 2) mosque_reviews: hide device_id column from anon/authenticated (prevents tracking)
REVOKE SELECT (device_id) ON public.mosque_reviews FROM anon, authenticated;

-- 3) analytics_events: remove public SELECT — inserts only, reads restricted to service_role
DROP POLICY IF EXISTS "Anyone can view analytics" ON public.analytics_events;

-- 4) push_tokens: drop the tautological UPDATE policy and prevent public reads/updates.
--    Writes/rotations should go through an edge function using service_role.
DROP POLICY IF EXISTS "Users can update own push tokens" ON public.push_tokens;

-- 5) mosque_announcements: remove public INSERT/DELETE. Announcements must go through
--    the mosque-admin edge function (service_role) after admin verification.
DROP POLICY IF EXISTS "Allow public insert announcements" ON public.mosque_announcements;
DROP POLICY IF EXISTS "Allow public delete announcements" ON public.mosque_announcements;

-- 6) Storage: lock down write access on both buckets to service_role only.
--    Files remain readable via public CDN URLs (public buckets), but drop broad
--    SELECT policies so anonymous listing of bucket contents is blocked.
DROP POLICY IF EXISTS "Public Insert"  ON storage.objects;
DROP POLICY IF EXISTS "Public Update"  ON storage.objects;
DROP POLICY IF EXISTS "Public Delete"  ON storage.objects;
DROP POLICY IF EXISTS "Public Access"  ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload mosque photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete mosque photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view mosque photos storage" ON storage.objects;

-- Restrict writes to service_role for both buckets
CREATE POLICY "mosque_buckets_service_insert"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id IN ('mosque-photos','mosque-images'));

CREATE POLICY "mosque_buckets_service_update"
ON storage.objects FOR UPDATE TO service_role
USING (bucket_id IN ('mosque-photos','mosque-images'))
WITH CHECK (bucket_id IN ('mosque-photos','mosque-images'));

CREATE POLICY "mosque_buckets_service_delete"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id IN ('mosque-photos','mosque-images'));

-- 7) SECURITY DEFINER helpers must only be callable server-side (service_role).
REVOKE EXECUTE ON FUNCTION public.verify_mosque_admin(text, text)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_mosque_admin_credentials(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.verify_mosque_admin(text, text)         TO service_role;
GRANT  EXECUTE ON FUNCTION public.set_mosque_admin_credentials(uuid, text, text) TO service_role;
