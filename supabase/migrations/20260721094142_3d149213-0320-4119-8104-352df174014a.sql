
-- Restore Data API grants on public.locations without exposing admin credentials.
-- Table-wide SELECT stays revoked from anon/authenticated so admin_password_hash cannot leak.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
GRANT SELECT ON public.locations TO anon;

-- Immediately revoke SELECT on the sensitive credential columns for public roles
REVOKE SELECT (admin_password_hash) ON public.locations FROM anon, authenticated;
REVOKE SELECT (admin_username) ON public.locations FROM anon;
-- authenticated needs admin_username to run the admin login lookup, keep it there

-- Also revoke UPDATE/INSERT on password hash from authenticated (writes go through the edge function under service_role)
REVOKE INSERT (admin_password_hash), UPDATE (admin_password_hash) ON public.locations FROM authenticated;
