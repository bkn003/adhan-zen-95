-- 1. Remove table-wide SELECT on locations and re-grant only non-sensitive columns
REVOKE SELECT ON public.locations FROM anon, authenticated;

GRANT SELECT (
  id, mosque_name, district, latitude, longitude, created_at, updated_at,
  sahar_food_availability, sahar_food_contact_number, sahar_food_time,
  women_prayer_hall, parking_available, ac_available, wheelchair_accessible,
  mosque_capacity, is_visible, is_paused, show_month_schedule, donation_enabled
) ON public.locations TO anon, authenticated;

GRANT ALL ON public.locations TO service_role;

-- 2. Profiles: only the owner can read their profile
DROP POLICY IF EXISTS profiles_read_authenticated ON public.profiles;

CREATE POLICY profiles_read_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());