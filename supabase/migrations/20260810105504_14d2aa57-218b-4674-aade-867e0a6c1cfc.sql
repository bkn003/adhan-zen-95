CREATE TABLE IF NOT EXISTS public.mosque_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  prayer text NOT NULL,
  attend_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, user_id, prayer, attend_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mosque_attendance TO authenticated;
GRANT ALL ON public.mosque_attendance TO service_role;

ALTER TABLE public.mosque_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attendance"
ON public.mosque_attendance FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_mosque_attendance_updated
BEFORE UPDATE ON public.mosque_attendance
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_attendance_counts(p_location_id uuid, p_date date)
RETURNS TABLE(prayer text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.prayer, count(*)::bigint
  FROM public.mosque_attendance a
  WHERE a.location_id = p_location_id AND a.attend_date = p_date
  GROUP BY a.prayer;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_counts(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_attendance_counts(uuid, date) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_mosque_freshness(p_location_ids uuid[])
RETURNS TABLE(location_id uuid, last_updated timestamptz, verified boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id,
         GREATEST(
           COALESCE((SELECT max(t.created_at) FROM public.mosque_timing_audit t WHERE t.location_id = l.id), 'epoch'::timestamptz),
           COALESCE((SELECT max(s.updated_at) FROM public.prayer_time_snapshots s WHERE s.location_id = l.id), 'epoch'::timestamptz),
           COALESCE(l.updated_at, 'epoch'::timestamptz)
         ) AS last_updated,
         EXISTS (SELECT 1 FROM public.mosque_admins a WHERE a.location_id = l.id AND a.is_paused = false)
           OR EXISTS (SELECT 1 FROM public.mosque_admin_users u WHERE u.location_id = l.id AND u.is_paused = false) AS verified
  FROM public.locations l
  WHERE l.id = ANY(p_location_ids);
$$;

REVOKE ALL ON FUNCTION public.get_mosque_freshness(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mosque_freshness(uuid[]) TO anon, authenticated, service_role;