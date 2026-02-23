-- ============================================================
-- MIGRATION 15: Custom Filters System
-- ============================================================
-- Run this in your Supabase SQL editor

-- 1. Custom filters table (managed by super admin)
CREATE TABLE IF NOT EXISTS public.custom_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '🏷️',
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Junction table: which locations have which filters
CREATE TABLE IF NOT EXISTS public.location_custom_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  filter_id UUID NOT NULL REFERENCES public.custom_filters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, filter_id)
);

-- 3. RLS policies - public read, service_role write
ALTER TABLE public.custom_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_custom_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read custom_filters" ON public.custom_filters
  FOR SELECT USING (true);

CREATE POLICY "Public read location_custom_filters" ON public.location_custom_filters
  FOR SELECT USING (true);

-- 4. Seed default filters from existing hardcoded columns
INSERT INTO public.custom_filters (name, icon, color, display_order) VALUES
  ('Sahar Food', '🍽️', 'emerald', 1),
  ('Women Hall', '👩', 'purple', 2),
  ('Parking', '🅿️', 'amber', 3),
  ('AC', '❄️', 'cyan', 4),
  ('Wheelchair Access', '♿', 'blue', 5)
ON CONFLICT (name) DO NOTHING;

-- 5. Migrate existing boolean data into junction table
-- This maps existing location boolean columns to the new custom_filters system
INSERT INTO public.location_custom_filters (location_id, filter_id)
SELECT l.id, cf.id FROM public.locations l, public.custom_filters cf
WHERE cf.name = 'Sahar Food' AND l.sahar_food_availability = true
ON CONFLICT DO NOTHING;

INSERT INTO public.location_custom_filters (location_id, filter_id)
SELECT l.id, cf.id FROM public.locations l, public.custom_filters cf
WHERE cf.name = 'Women Hall' AND l.women_prayer_hall = true
ON CONFLICT DO NOTHING;

INSERT INTO public.location_custom_filters (location_id, filter_id)
SELECT l.id, cf.id FROM public.locations l, public.custom_filters cf
WHERE cf.name = 'Parking' AND l.parking_available = true
ON CONFLICT DO NOTHING;

INSERT INTO public.location_custom_filters (location_id, filter_id)
SELECT l.id, cf.id FROM public.locations l, public.custom_filters cf
WHERE cf.name = 'AC' AND l.ac_available = true
ON CONFLICT DO NOTHING;

INSERT INTO public.location_custom_filters (location_id, filter_id)
SELECT l.id, cf.id FROM public.locations l, public.custom_filters cf
WHERE cf.name = 'Wheelchair Access' AND l.wheelchair_accessible = true
ON CONFLICT DO NOTHING;
