-- ============================================================================
-- ADHAN ZEN 95 — ALL SUPABASE MIGRATIONS (Consolidated)
-- Generated: 2026-02-18
-- 
-- Instructions: Run these in order via Supabase SQL Editor.
-- If your DB already has some of these applied, skip those sections.
-- Each section is labeled with its original migration filename.
-- ============================================================================


-- ============================================================================
-- MIGRATION 1: 20250810052628 — Initial schema (locations + prayer_times)
-- ============================================================================

-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mosque_name TEXT NOT NULL,
  district TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prayer times table
CREATE TABLE IF NOT EXISTS public.prayer_times (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  date_range TEXT NOT NULL,
  fajr_adhan TIME NOT NULL,
  fajr_adhan_offset TIME,
  fajr_iqamah TIME NOT NULL,
  fajr_ramadan_iqamah TIME,
  dhuhr_adhan TIME NOT NULL,
  dhuhr_iqamah TIME NOT NULL,
  asr_adhan TIME NOT NULL,
  asr_adhan_offset TIME,
  asr_iqamah TIME NOT NULL,
  maghrib_adhan TIME NOT NULL,
  maghrib_iqamah TIME NOT NULL,
  iftar_time TIME,
  maghrib_ramadan_adhan TIME,
  maghrib_iqamah_adhan TIME,
  isha_adhan TIME NOT NULL,
  isha_adhan_offset TIME,
  isha_iqamah TIME NOT NULL,
  isha_ramadan_iqamah TIME,
  taraweeh TIME,
  sahar_end TIME,
  sun_rise TIME,
  mid_noon TIME,
  sun_set TIME,
  jummah_adhan TIME,
  jummah_iqamah TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Allow public read access on prayer_times" ON public.prayer_times FOR SELECT USING (true);


-- ============================================================================
-- MIGRATION 2: 20250811052401 — Add date column to prayer_times
-- ============================================================================

ALTER TABLE public.prayer_times 
ADD COLUMN IF NOT EXISTS date DATE;

CREATE INDEX IF NOT EXISTS idx_prayer_times_date ON public.prayer_times(date);
CREATE INDEX IF NOT EXISTS idx_prayer_times_location_date ON public.prayer_times(location_id, date);


-- ============================================================================
-- MIGRATION 3: 20250815101154 — Sample prayer data (SKIP if you have data)
-- ============================================================================
-- This migration inserts sample data for specific location UUIDs.
-- SKIP this if your database already has prayer time data.
-- (Contains hardcoded UUIDs for KADHERPET, AL-NOOR, JAMA MASJID, FAIZUL TRUST)


-- ============================================================================
-- MIGRATION 4: 20250815101341 — More sample prayer data (SKIP if you have data)
-- ============================================================================
-- Same as above — sample data insert. SKIP if data already exists.


-- ============================================================================
-- MIGRATION 5: 20250912051742 — Re-enable RLS (safe to re-run)
-- ============================================================================

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- These may fail if policies already exist — that's OK
-- CREATE POLICY "Allow public read access to locations" ON public.locations FOR SELECT USING (true);
-- CREATE POLICY "Allow public read access to prayer_times" ON public.prayer_times FOR SELECT USING (true);


-- ============================================================================
-- MIGRATION 6: 20250918121248 — Add date_from/date_to columns for date ranges
-- ============================================================================

ALTER TABLE public.prayer_times 
ADD COLUMN IF NOT EXISTS date_from DATE,
ADD COLUMN IF NOT EXISTS date_to DATE;

CREATE INDEX IF NOT EXISTS idx_prayer_times_date_range 
ON public.prayer_times (location_id, date_from, date_to);

CREATE INDEX IF NOT EXISTS idx_prayer_times_location_month 
ON public.prayer_times (location_id, month);


-- ============================================================================
-- MIGRATION 7: 20250918121333 — Backfill date_from/date_to from date_range
-- ============================================================================

UPDATE public.prayer_times 
SET 
  date_from = CASE 
    WHEN date_range = '1-5' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-01')::DATE
        ELSE TO_DATE(month || '-01', 'Month YYYY-DD')
      END
    WHEN date_range = '6-11' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-06')::DATE
        ELSE TO_DATE(month || '-06', 'Month YYYY-DD')
      END
    WHEN date_range = '12-17' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-12')::DATE
        ELSE TO_DATE(month || '-12', 'Month YYYY-DD')
      END
    WHEN date_range = '18-24' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-18')::DATE
        ELSE TO_DATE(month || '-18', 'Month YYYY-DD')
      END
    WHEN date_range = '25-31' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-25')::DATE
        ELSE TO_DATE(month || '-25', 'Month YYYY-DD')
      END
    ELSE 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-01')::DATE
        ELSE TO_DATE(month || '-01', 'Month YYYY-DD')
      END
  END,
  date_to = CASE 
    WHEN date_range = '1-5' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-05')::DATE
        ELSE TO_DATE(month || '-05', 'Month YYYY-DD')
      END
    WHEN date_range = '6-11' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-11')::DATE
        ELSE TO_DATE(month || '-11', 'Month YYYY-DD')
      END
    WHEN date_range = '12-17' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-17')::DATE
        ELSE TO_DATE(month || '-17', 'Month YYYY-DD')
      END
    WHEN date_range = '18-24' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-24')::DATE
        ELSE TO_DATE(month || '-24', 'Month YYYY-DD')
      END
    WHEN date_range = '25-31' THEN 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN 
          CASE 
            WHEN EXTRACT(month FROM (month || '-01')::DATE) IN (1,3,5,7,8,10,12) THEN (month || '-31')::DATE
            WHEN EXTRACT(month FROM (month || '-01')::DATE) IN (4,6,9,11) THEN (month || '-30')::DATE
            ELSE (month || '-29')::DATE
          END
        ELSE TO_DATE(month || '-31', 'Month YYYY-DD')
      END
    ELSE 
      CASE 
        WHEN month ~ '^\d{4}-\d{2}$' THEN (month || '-05')::DATE
        ELSE TO_DATE(month || '-05', 'Month YYYY-DD')
      END
  END
WHERE date_from IS NULL OR date_to IS NULL;


-- ============================================================================
-- MIGRATION 8: 20251010062212 — Add facility columns (sahar food, women hall)
-- ============================================================================

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS sahar_food_availability BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sahar_food_contact_number TEXT,
ADD COLUMN IF NOT EXISTS sahar_food_time TEXT,
ADD COLUMN IF NOT EXISTS women_prayer_hall BOOLEAN DEFAULT FALSE;


-- ============================================================================
-- MIGRATION 9: 20260216050409 — Add more facility columns + special prayer times
-- ============================================================================

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS parking_available boolean DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ac_available boolean DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS wheelchair_accessible boolean DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS mosque_capacity text;

ALTER TABLE public.prayer_times ADD COLUMN IF NOT EXISTS ishraq_time time without time zone;
ALTER TABLE public.prayer_times ADD COLUMN IF NOT EXISTS tahajjud_start time without time zone;
ALTER TABLE public.prayer_times ADD COLUMN IF NOT EXISTS tahajjud_end time without time zone;


-- ============================================================================
-- MIGRATION 10: 20260217053352 — Admin credentials + pgcrypto
-- ============================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add login credentials to locations table for mosque admins
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS admin_username text,
ADD COLUMN IF NOT EXISTS admin_password_hash text;

-- Create a function to verify mosque admin login
CREATE OR REPLACE FUNCTION public.verify_mosque_admin(
  p_username text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE admin_username = p_username
    AND admin_password_hash = crypt(p_password, admin_password_hash);
  
  RETURN v_location_id;
END;
$$;

-- Create a function to set/update mosque admin credentials
CREATE OR REPLACE FUNCTION public.set_mosque_admin_credentials(
  p_location_id uuid,
  p_username text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.locations
  SET admin_username = p_username,
      admin_password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = p_location_id;
  
  RETURN FOUND;
END;
$$;


-- ============================================================================
-- MIGRATION 11: 20260217053927 — Fix set_updated_at function search path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
begin
  new.updated_at := now();
  return new;
end $function$;


-- ============================================================================
-- MIGRATION 12: 20260217060019 — Fix pgcrypto with extensions schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate functions to use extensions schema explicitly
CREATE OR REPLACE FUNCTION public.set_mosque_admin_credentials(p_location_id uuid, p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.locations
  SET admin_username = p_username,
      admin_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  WHERE id = p_location_id;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_mosque_admin(p_username text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE admin_username = p_username
    AND admin_password_hash = extensions.crypt(p_password, admin_password_hash);
  
  RETURN v_location_id;
END;
$$;


-- ============================================================================
-- MIGRATION 13: 20260218044641 — Mosque photos table + storage bucket
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mosque_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.mosque_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mosque photos"
ON public.mosque_photos FOR SELECT
USING (true);

-- Create storage bucket for mosque photos (may fail if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mosque-photos', 'mosque-photos', true, 524288)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view mosque photos storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'mosque-photos');

CREATE POLICY "Service role can upload mosque photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mosque-photos');

CREATE POLICY "Service role can delete mosque photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'mosque-photos');


-- ============================================================================
-- MIGRATION 14 (NEW): Super Admin controls — visibility + admin pause
-- ============================================================================

-- Add is_visible column to control mosque visibility in the app
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Add admin_paused column to pause/resume mosque admins
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS admin_paused boolean DEFAULT false;

-- Update verify function to check admin_paused
CREATE OR REPLACE FUNCTION public.verify_mosque_admin(p_username text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE admin_username = p_username
    AND admin_password_hash = extensions.crypt(p_password, admin_password_hash)
    AND (admin_paused IS NULL OR admin_paused = false);
  
  RETURN v_location_id;
END;
$$;

-- ============================================================================
-- END OF ALL MIGRATIONS
-- ============================================================================
