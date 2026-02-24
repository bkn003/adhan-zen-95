-- Migration: Make core prayer time fields nullable
-- This allows mosque admins to save partial prayer times without errors.
-- Previously these were NOT NULL, causing constraint violations when adding
-- new date ranges with some prayers left blank.

ALTER TABLE public.prayer_times ALTER COLUMN fajr_adhan DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN fajr_iqamah DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN dhuhr_adhan DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN dhuhr_iqamah DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN asr_adhan DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN asr_iqamah DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN maghrib_adhan DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN maghrib_iqamah DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN isha_adhan DROP NOT NULL;
ALTER TABLE public.prayer_times ALTER COLUMN isha_iqamah DROP NOT NULL;
