ALTER TABLE public.mosque_announcements
  ADD COLUMN IF NOT EXISTS visible_from timestamptz,
  ADD COLUMN IF NOT EXISTS visible_until timestamptz;