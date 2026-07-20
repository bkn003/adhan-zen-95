-- Add storage_path column and backfill from existing photo_url values
ALTER TABLE public.mosque_photos
  ADD COLUMN IF NOT EXISTS storage_path text;

-- Backfill: existing photo_url looks like ".../storage/v1/object/public/mosque-photos/<path>"
UPDATE public.mosque_photos
SET storage_path = split_part(photo_url, '/mosque-photos/', 2)
WHERE storage_path IS NULL
  AND photo_url LIKE '%/mosque-photos/%';