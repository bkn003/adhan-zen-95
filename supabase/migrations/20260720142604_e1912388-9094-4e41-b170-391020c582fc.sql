
-- mosque_reviews: revoke table-level SELECT, grant only non-sensitive columns
REVOKE SELECT ON public.mosque_reviews FROM anon, authenticated;
GRANT SELECT (id, location_id, rating, comment, created_at) ON public.mosque_reviews TO anon, authenticated;

-- push_tokens: revoke all read access from anon/authenticated (writes via INSERT policy still allowed)
REVOKE SELECT ON public.push_tokens FROM anon, authenticated;
