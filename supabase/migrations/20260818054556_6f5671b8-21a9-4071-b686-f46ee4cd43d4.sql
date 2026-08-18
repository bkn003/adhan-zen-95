ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_mosque_attendance_roster(uuid, date);

CREATE OR REPLACE FUNCTION public.get_mosque_attendance_roster(p_location_id uuid, p_date date)
RETURNS TABLE(prayer text, user_id uuid, display_name text, phone text, marked_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.prayer,
         a.user_id,
         COALESCE(NULLIF(p.display_name, ''), 'Member') AS display_name,
         NULLIF(p.phone, '') AS phone,
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
$function$;

REVOKE ALL ON FUNCTION public.get_mosque_attendance_roster(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mosque_attendance_roster(uuid, date) TO authenticated, service_role;