-- Hide admin credential columns from anon/authenticated (column-level revoke).
-- Public reads of the locations table should never include the bcrypt hash or username.
REVOKE SELECT (admin_password_hash, admin_username) ON public.locations FROM anon;
REVOKE SELECT (admin_password_hash, admin_username) ON public.locations FROM authenticated;
-- service_role (used by edge functions) retains full access via GRANT ALL.
GRANT ALL ON public.locations TO service_role;