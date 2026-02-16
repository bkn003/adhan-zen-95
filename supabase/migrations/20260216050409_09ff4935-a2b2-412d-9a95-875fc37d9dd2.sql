
-- Add facility fields to locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS parking_available boolean DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ac_available boolean DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS wheelchair_accessible boolean DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS mosque_capacity text;

-- Add special prayer time fields to prayer_times
ALTER TABLE public.prayer_times ADD COLUMN IF NOT EXISTS ishraq_time time without time zone;
ALTER TABLE public.prayer_times ADD COLUMN IF NOT EXISTS tahajjud_start time without time zone;
ALTER TABLE public.prayer_times ADD COLUMN IF NOT EXISTS tahajjud_end time without time zone;
