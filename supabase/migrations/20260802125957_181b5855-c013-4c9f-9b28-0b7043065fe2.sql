REVOKE ALL ON public.mosque_admins FROM anon;
REVOKE ALL ON public.mosque_admins FROM authenticated;
GRANT ALL ON public.mosque_admins TO service_role;