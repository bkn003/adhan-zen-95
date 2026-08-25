-- analytics_events had no table grants: client-side and server-side inserts were
-- silently failing. Allow insert-only for app roles, full access for service_role
-- (used by edge functions such as mosque-donation failure logging).
GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;