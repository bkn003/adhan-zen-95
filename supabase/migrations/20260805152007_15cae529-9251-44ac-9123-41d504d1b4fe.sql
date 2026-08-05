-- 1. Snapshots of published prayer times per mosque + range
CREATE TABLE public.prayer_time_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  month text NOT NULL,
  date_range text NOT NULL,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, month, date_range)
);
GRANT ALL ON public.prayer_time_snapshots TO service_role;
ALTER TABLE public.prayer_time_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_service_only" ON public.prayer_time_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_prayer_time_snapshots_updated
BEFORE UPDATE ON public.prayer_time_snapshots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Detected changes (history feed)
CREATE TABLE public.prayer_time_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  month text NOT NULL,
  date_range text NOT NULL,
  field text NOT NULL,
  label text NOT NULL,
  old_value text,
  new_value text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prayer_time_changes_loc_time ON public.prayer_time_changes (location_id, detected_at DESC);
GRANT SELECT ON public.prayer_time_changes TO anon, authenticated;
GRANT ALL ON public.prayer_time_changes TO service_role;
ALTER TABLE public.prayer_time_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "changes_public_read" ON public.prayer_time_changes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "changes_service_write" ON public.prayer_time_changes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Profiles for real user accounts
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Devices can track both selected mosque and mohalla
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS mohalla_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

-- 5. Public "verified mosque" flag without exposing credentials
CREATE OR REPLACE FUNCTION public.get_verified_mosque_ids()
RETURNS TABLE(location_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.location_id FROM public.mosque_admins a WHERE a.is_paused = false;
$$;
REVOKE ALL ON FUNCTION public.get_verified_mosque_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_verified_mosque_ids() TO anon, authenticated, service_role;