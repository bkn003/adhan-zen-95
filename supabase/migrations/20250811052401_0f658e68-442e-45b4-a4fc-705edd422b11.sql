
-- Add the missing date column to prayer_times table
ALTER TABLE public.prayer_times 
ADD COLUMN date DATE;

-- Create an index on the date column for better query performance
CREATE INDEX idx_prayer_times_date ON public.prayer_times(date);

-- Create a composite index for location_id and date for optimal querying
CREATE INDEX idx_prayer_times_location_date ON public.prayer_times(location_id, date);
