-- Extend announcements into events
ALTER TABLE public.mosque_announcements
  ADD COLUMN IF NOT EXISTS event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'announcement',
  ADD COLUMN IF NOT EXISTS allow_rsvp BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_note TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

GRANT SELECT ON public.mosque_announcements TO anon, authenticated;
GRANT ALL ON public.mosque_announcements TO service_role;

-- Donation fields on locations
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS donation_upi_id TEXT,
  ADD COLUMN IF NOT EXISTS donation_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS donation_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS donation_account_number TEXT,
  ADD COLUMN IF NOT EXISTS donation_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS donation_notes TEXT,
  ADD COLUMN IF NOT EXISTS donation_enabled BOOLEAN NOT NULL DEFAULT false;

-- Grant SELECT on the donation columns (safe, publicly displayed)
GRANT SELECT (id, donation_upi_id, donation_account_holder, donation_bank_name,
  donation_account_number, donation_ifsc, donation_notes, donation_enabled)
  ON public.locations TO anon, authenticated;

-- RSVP table (device-scoped, no auth)
CREATE TABLE IF NOT EXISTS public.mosque_event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.mosque_announcements(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('yes','maybe','no')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, device_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mosque_event_rsvps TO anon, authenticated;
GRANT ALL ON public.mosque_event_rsvps TO service_role;

ALTER TABLE public.mosque_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Aggregated counts are readable by anyone; individual device_id is not sensitive PII but
-- allow reads so counts can be computed client-side.
CREATE POLICY "rsvps_select_all" ON public.mosque_event_rsvps
  FOR SELECT USING (true);

CREATE POLICY "rsvps_insert_self" ON public.mosque_event_rsvps
  FOR INSERT WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "rsvps_update_self" ON public.mosque_event_rsvps
  FOR UPDATE USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
  WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "rsvps_delete_self" ON public.mosque_event_rsvps
  FOR DELETE USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE INDEX IF NOT EXISTS idx_mosque_event_rsvps_event ON public.mosque_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_mosque_announcements_event_at ON public.mosque_announcements(event_at) WHERE event_at IS NOT NULL;

-- Reuse existing updated_at trigger function
DROP TRIGGER IF EXISTS trg_mosque_event_rsvps_updated ON public.mosque_event_rsvps;
CREATE TRIGGER trg_mosque_event_rsvps_updated
  BEFORE UPDATE ON public.mosque_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mosque_announcements_updated ON public.mosque_announcements;
CREATE TRIGGER trg_mosque_announcements_updated
  BEFORE UPDATE ON public.mosque_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();