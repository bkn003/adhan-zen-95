ALTER TABLE public.mosque_timing_audit
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'prayer_times';

CREATE INDEX IF NOT EXISTS idx_mosque_timing_audit_section
  ON public.mosque_timing_audit (location_id, section, created_at DESC);