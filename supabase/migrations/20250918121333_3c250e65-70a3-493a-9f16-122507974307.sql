-- Update prayer_times table to support date ranges for scaling
ALTER TABLE public.prayer_times 
ADD COLUMN IF NOT EXISTS date_from DATE,
ADD COLUMN IF NOT EXISTS date_to DATE;

-- Update existing rows to have proper date ranges based on existing date_range field
-- Convert month format from text to proper dates
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