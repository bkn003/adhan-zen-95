CREATE TABLE public.mosque_timing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  prayer_time_id uuid,
  month text,
  date_range text,
  editor_label text NOT NULL DEFAULT 'Mosque admin',
  actor_role text NOT NULL DEFAULT 'mosque_admin',
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'applied',
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mosque_timing_audit_location ON public.mosque_timing_audit (location_id, created_at DESC);

GRANT SELECT ON public.mosque_timing_audit TO authenticated;
GRANT ALL ON public.mosque_timing_audit TO service_role;

ALTER TABLE public.mosque_timing_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_read_authenticated"
  ON public.mosque_timing_audit
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER trg_mosque_timing_audit_updated
  BEFORE UPDATE ON public.mosque_timing_audit
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();