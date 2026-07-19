-- Column-level GRANTs only take effect when there is NO table-wide SELECT grant.
-- 1) Revoke the wide table-level SELECT so column-level rules are enforced.
REVOKE SELECT ON public.locations FROM anon;
REVOKE SELECT ON public.locations FROM authenticated;

-- 2) Grant SELECT on every column EXCEPT admin_username and admin_password_hash.
GRANT SELECT (
  id, mosque_name, district, latitude, longitude, created_at, updated_at,
  sahar_food_availability, sahar_food_contact_number, sahar_food_time,
  women_prayer_hall, parking_available, ac_available, wheelchair_accessible,
  mosque_capacity, is_visible, admin_paused, is_paused, show_month_schedule
) ON public.locations TO anon, authenticated;

-- service_role keeps full access for edge functions.
GRANT ALL ON public.locations TO service_role;