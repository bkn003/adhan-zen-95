ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS timings_source text,
  ADD COLUMN IF NOT EXISTS ramadan_start_date date,
  ADD COLUMN IF NOT EXISTS ramadan_end_date date,
  ADD COLUMN IF NOT EXISTS donation_link text;