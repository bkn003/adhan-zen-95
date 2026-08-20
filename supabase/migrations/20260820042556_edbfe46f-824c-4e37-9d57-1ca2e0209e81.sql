ALTER TABLE public.mosque_admin_users
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL
  DEFAULT ARRAY['mosque','filters','prayer','photos','events','khutbah','reviews','donations','attendance','audit']::text[];

CREATE OR REPLACE FUNCTION public.get_attendance_trend(p_location_id uuid, p_from date, p_to date)
RETURNS TABLE(attend_date date, prayer text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.attend_date, a.prayer, count(*)::bigint
  FROM public.mosque_attendance a
  WHERE a.location_id = p_location_id
    AND a.attend_date BETWEEN p_from AND p_to
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.mosque_admin_users u
        WHERE u.user_id = auth.uid()
          AND u.location_id = p_location_id
          AND u.is_paused = false
      )
    )
  GROUP BY a.attend_date, a.prayer
  ORDER BY a.attend_date ASC;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_trend(uuid, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_attendance_trend(uuid, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_attendance_trend(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_trend(uuid, date, date) TO service_role;