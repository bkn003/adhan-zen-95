-- Update prayer_times table to support date ranges for scaling
ALTER TABLE public.prayer_times 
ADD COLUMN IF NOT EXISTS date_from DATE,
ADD COLUMN IF NOT EXISTS date_to DATE;

-- Update existing rows to have proper date ranges based on existing date_range field
UPDATE public.prayer_times 
SET 
  date_from = CASE 
    WHEN date_range = '1-5' THEN (month || '-01')::DATE
    WHEN date_range = '6-11' THEN (month || '-06')::DATE  
    WHEN date_range = '12-17' THEN (month || '-12')::DATE
    WHEN date_range = '18-24' THEN (month || '-18')::DATE
    WHEN date_range = '25-31' THEN (month || '-25')::DATE
    ELSE (month || '-01')::DATE
  END,
  date_to = CASE 
    WHEN date_range = '1-5' THEN (month || '-05')::DATE
    WHEN date_range = '6-11' THEN (month || '-11')::DATE
    WHEN date_range = '12-17' THEN (month || '-17')::DATE  
    WHEN date_range = '18-24' THEN (month || '-24')::DATE
    WHEN date_range = '25-31' THEN CASE 
      WHEN EXTRACT(month FROM (month || '-01')::DATE) IN (1,3,5,7,8,10,12) THEN (month || '-31')::DATE
      WHEN EXTRACT(month FROM (month || '-01')::DATE) IN (4,6,9,11) THEN (month || '-30')::DATE
      ELSE (month || '-29')::DATE -- February (approximate)
    END
    ELSE (month || '-05')::DATE
  END
WHERE date_from IS NULL OR date_to IS NULL;

-- Create index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_prayer_times_date_range 
ON public.prayer_times (location_id, date_from, date_to);

-- Create index for location lookups
CREATE INDEX IF NOT EXISTS idx_prayer_times_location_month 
ON public.prayer_times (location_id, month);