REVOKE SELECT (device_id) ON public.mosque_reviews FROM authenticated;
GRANT INSERT (location_id, device_id, user_id, rating, comment) ON public.mosque_reviews TO authenticated;