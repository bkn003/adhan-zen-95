REVOKE SELECT ON public.mosque_reviews FROM anon, authenticated;
GRANT SELECT (id, location_id, rating, comment, created_at, user_id, is_hidden, report_count) ON public.mosque_reviews TO anon, authenticated;
GRANT ALL ON public.mosque_reviews TO service_role;