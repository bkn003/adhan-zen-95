CREATE OR REPLACE FUNCTION public.get_mosque_attendance_roster(p_location_id uuid, p_date date)
RETURNS TABLE(prayer text, user_id uuid, display_name text, marked_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.prayer,
         a.user_id,
         COALESCE(NULLIF(p.display_name, ''), 'Member') AS display_name,
         a.created_at AS marked_at
  FROM public.mosque_attendance a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.location_id = p_location_id
    AND a.attend_date = p_date
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.mosque_admin_users u
        WHERE u.user_id = auth.uid()
          AND u.location_id = p_location_id
          AND u.is_paused = false
      )
    )
  ORDER BY a.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_mosque_attendance_roster(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_mosque_attendance_roster(uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_mosque_attendance_roster(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mosque_attendance_roster(uuid, date) TO service_role;